const express = require('express');
const moment = require('moment-timezone');
const fs = require("fs");
const { Form } = require('multiparty');
const images = require("images");
const { formatTime } = require('../utils/time');
const { ObjectId } = require('mongodb');
const router = express.Router();

// 缓存
const listCache = {};
const contentCache = {};

// 获取博客列表
router.get('/bloglist', async function (req, res) {
  const page = parseInt(req.query.page);
  if (!isNaN(page)) {
    const id = req.query.user_id || req.user_id || 2;
    const userInfo = await req.mongo`user`.findOne({ id }, { _id: 0, id: 1, username: 1 });
    if (!listCache[id]) listCache[id] = {};
    if (!listCache[id][page]) {
      const result = await req.mongo`blog`.aggregate([
        {
          $match: {
            user_id: id
          },
        },
        {
          $lookup: {
            from: "blogtypes",
            localField: "blogtype_id",
            foreignField: "id",
            as: "blogtype"
          }
        },
        {
          $unwind: {
            path: "$blogtype",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            content: 1,
            date: 1,
            intro: 1,
            subtitle: 1,
            title: 1,
            titleImage: 1,
            blogtype: {
              id: 1,
              typeName: 1
            },
          }
        }
      ]).limit(10).skip(page * 10 - 10);
      listCache[id][page] = result;
    }
    res.json({
      status: true,
      data: {
        userInfo,
        data: listCache[id][page]
      }
    });
  } else {
    res.json({
      status: false,
      which: "缺少参数page"
    });
  }
});
// 博客内容
router.get('/blogcontent', async function (req, res) {
  const id = req.query.id;
  if (id) {
    if (!contentCache[id]) {
      const result = await req.mongo`blog`.aggregate([
        {
          $match: {
            _id: ObjectId(id)
          },
        },
        {
          $lookup: {
            from: "blogtypes",
            localField: "blogtype_id",
            foreignField: "id",
            as: "blogtype"
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "id",
            as: "user"
          }
        },
        {
          $unwind: {
            path: "$blogtype",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            content: 1,
            date: 1,
            intro: 1,
            subtitle: 1,
            title: 1,
            titleImage: 1,
            updatetime: 1,
            blogtype: {
              typeName: 1,
              id: 1
            },
            user: {
              username: 1,
              id: 1
            },
          }
        }
      ]);
      if (result.length) {
        contentCache[id] = result[0];
        res.json({
          status: true,
          data: result[0]
        });
      } else {
        res.json({
          status: true,
          which: "未查询到结果"
        });
      }
    } else {
      res.json({
        status: true,
        data: contentCache[id]
      });
    }
  } else {
    res.json({
      status: false,
      which: "参数id不能为空"
    });
  }
});
// 发布博客
router.get('/postblog', function (req, res) { });
// 创建博客类型
router.get('/addnotetype', async function (req, res) {
  const Blogtype = req.mongo`blogtype`;
  const count = await Blogtype().find().count();
  const rrr = await new Blogtype({
    typeName: req.body.typeName,
    user_id: req.user.id,
    id: count + 1
  }).save();
  if (rrr) {
    res.json({
      status: true,
      which: "添加成功"
    });
  } else {
    res.json({
      status: false,
      which: "添加失败"
    });
  }
});
// 获取博客类型列表
router.get('/blogtypelist', async function (req, res) {
  const result = await req.mongo`blogtype`.find({
    user_id: req.user.id
  });
  res.json({
    status: true,
    data: result.map(e => ({
      id: e.id,
      typeName: e.typeName
    }))
  });
});
// 修改博客类型
router.get('/modifynotetype', async function (req, res) {
  const { typeName, id } = req.body;
  if (id !== undefined && typeName) {
    // listCache[req.user.id]
    const rrr = await req.mongo`blogtype`.findOneAndUpdate(
      { user_id: req.user.id, id },
      { typeName, updatetime: formatTime() }
    );
    if (rrr) {
      res.json({
        status: true,
        which: "修改博客类型成功"
      });
    } else {
      res.json({
        status: false,
        which: "修改博客类型失败"
      });
    }
  } else {
    res.json({
      status: false,
      which: "参数不足"
    });
  }
});
// 上传图片
const regexp = /.+\.(jpg|png|jpeg|gif|bmp)$/;
router.post('/uploadimage', function (req, res) {
  const form = new Form();
  form.parse(req, (err, fields, files) => {
    const img = files.imgs && files.imgs[0];
    if (!img) {
      res.json({
        status: false,
        which: "key为imgs"
      });
    } else if (img.size === 0 || !regexp.test(img.originalFilename)) {
      res.json({
        status: false,
        which: "必须上传图片"
      });
    } else {
      // const ins = images(img.path).size(1920)
      // if (img.size > 700000) ins.size(1920)
      const path = `static/imgs/${moment().format("YYYYMM")}`;
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
      }
      images(img.path)
        .size(1920)
        .save(`${path}/${moment().format('YYYYMMDDHHmmss')}${img.originalFilename}`, {
          quality: 100
        });
      res.json({
        status: false,
        which: "上传成功"
      });
    }
  });
});

module.exports = router;

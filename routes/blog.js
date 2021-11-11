const express = require('express');
const moment = require('moment');
const fs= require("fs")
const {Form} = require('multiparty');
const images = require("images");
const { formatTime } = require('../utils/time');
const router = express.Router();

// 缓存
const listCache = {}
const contentCache = {}

// 获取博客列表
router.get('/bloglist', async function (req, res) {
  const page = parseInt(req.query.page) - 1
  if (!isNaN(page)) {
    const id = req.query.user_id || req.user_id
    if (!listCache[id]) listCache[id] = {}
    if (!listCache[id][page]) {
      const result = await req.mysql.query(`
        SELECT note_user.username,note_blogtype.typeName,
        note_blog.uuid,note_blog.title,note_blog.intro,note_blog.subtitle,note_blog.titleImage,note_blog.date
        FROM note_blog
        LEFT JOIN note_user ON note_blog.user_id=note_user.id
        LEFT JOIN note_blogtype ON note_blog.blogtype_id=note_blogtype.id
        WHERE ?
        ORDER BY date desc
        LIMIT ${page * 25},${ (page + 1) * 25 }
      `, {
        "note_blog.user_id": id
      })
      listCache[id][page] = result
    }
    res.json({
      status: true,
      data: listCache[id][page]
    })
  } else {
    res.json({
      status: false,
      which: "缺少参数page"
    })
  }
})
// 博客内容
router.get('/blogcontent', async function (req, res) {
  const id = req.query.uuid
  if (id) {
    if (!contentCache[id]) {
      const result = await req.mysql.query(`
        SELECT note_user.username,note_blogtype.typeName,
        note_blog.uuid,note_blog.title,note_blog.intro,note_blog.subtitle,note_blog.titleImage,note_blog.date,note_blog.content
        FROM note_blog
        LEFT JOIN note_user ON note_blog.user_id=note_user.id
        LEFT JOIN note_blogtype ON note_blog.blogtype_id=note_blogtype.id
        WHERE ?`, {
        uuid: id
      })
      if (result.length) {
        contentCache[id] = result[0]
        res.json({
          status: true,
          data: result[0]
        })
      } else {
        res.json({
          status: true,
          which: "未查询到结果"
        })
      }
    } else {
      res.json({
        status: true,
        data: contentCache[id]
      })
    }
  } else {
    res.json({
      status: false,
      which: "参数id不能为空"
    })
  }
})
// 发布博客
router.get('/postblog', function (req, res) {})
// 创建博客类型
router.get('/addnotetype', async function (req, res) {
  await req.mysql.query("INSERT INTO note_blogtype SET ?", {
    typeName: req.body.typeName,
    createtime: formatTime(),
    updatetime: formatTime(),
    user_id: req.user.id
  })
})
// 获取博客类型列表
router.get('/blogtypelist', async function (req, res) {
  const result = await req.mysql.query("SELECT * FROM note_blogtype WHERE ?", {
    user_id: req.user.id
  })
  res.json({
    status: true,
    data: result.map(e => ({
      id: e.id,
      typeName: e.typeName
    }))
  })
})
// 修改博客类型
router.get('/modifynotetype', async function (req, res) {
  const {typeName, id} = req.body
  if (id !== undefined && typeName) {
    // listCache[req.user.id]
    await req.mysql.query('UPDATE note_blogtype SET ? WHERE ? AND ?', [
      {typeName, updatetime: formatTime()},
      {user_id: req.user.id},
      {id: id}
    ])
    res.json({
      status: true,
      which: "修改博客类型成功"
    })
  } else {
    res.json({
      status: false,
      which: "参数不足"
    })
  }
})
// 上传图片
const regexp = /.+\.(jpg|png|jpeg|gif|bmp)$/
router.post('/uploadimage', function (req, res) {
  const form = new Form()
  form.parse(req, (err, fields, files) => {
    const img = files.imgs && files.imgs[0]
    if (!img) {
      res.json({
        status: false,
        which: "key为imgs"
      })
    } else if (img.size === 0 || !regexp.test(img.originalFilename)) {
      res.json({
        status: false,
        which: "必须上传图片"
      })
    } else {
      // const ins = images(img.path).size(1920)
      // if (img.size > 700000) ins.size(1920)
      const path = `static/imgs/${moment().format("YYYYMM")}`
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path);            
      }
      images(img.path)
        .size(1920)
        .save(`${path}/${moment().format('YYYYMMDDHHmmss')}${img.originalFilename}`, {
        quality: 100
      })
      res.json({
        status: false,
        which: "上传成功"
      })
    }
    
  })
})

module.exports = router;

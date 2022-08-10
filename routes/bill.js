const moment = require('moment-timezone');
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

router.post('/addbilltype', async function (req, res) {
  if (req.body.typename) {
    const Billtype = req.mongo`billtype`;
    const count = await Billtype.find().count();
    const rrr = await new Billtype({
      typename: req.body.typename,
      intro: req.body.intro || "",
      user_id: req.user.id,
      id: count + 4
    }).save();
    if (rrr) {
      res.json({
        status: true,
        which: "添加成功"
      });
    } else {
      res.json({
        status: true,
        which: "添加失败"
      });
    }
  } else {
    res.json({
      status: false,
      which: "参数不足"
    });
  }
});

router.post('/editbilltype', async (req, res) => {
  const { typename, intro, id } = req.body;
  if (id !== undefined && (typename || intro)) {
    const updateData = {
      updatetime: new Date()
    };
    const Billtype = req.mongo`billtype`;
    if (typename) updateData.typename = typename;
    if (intro) updateData.intro = intro;
    const ret = await Billtype.findOneAndUpdate({ user_id: req.user.id, id }, updateData);
    if (ret) {
      res.json({
        status: true,
        which: "修改账类型成功"
      });
    } else {
      res.json({
        status: false,
        which: "修改类型失败"
      });
    }
  } else {
    res.json({
      status: false,
      which: "参数不足"
    });
  }
});

router.get('/getbilltypelist', async function (req, res) {
  const result = await req.mongo`billtype`.find({
    user_id: req.user.id
  });
  res.json({
    status: true,
    data: result.map(e => ({
      id: e.id,
      typename: e.typename,
      intro: e.intro
    }))
  });
});

router.get('/getbilllist', async function (req, res) {
  const page = parseInt(req.query.page); // 从第0页开始
  const pageSize = parseInt(req.query.pageSize) || 20;
  if (!isNaN(page)) {
    const result = await req.mongo`bill`.find({
      user_id: req.user.id
    }).sort({ consumetime: -1 }).limit(pageSize).skip(pageSize * page);
    console.log(result)
    res.json({
      status: true,
      data: result.map(e => ({
        id: e.uuid,
        price: e.price,
        consumetime: e.consumetime,
        billtype: e.billtype_id,
        intro: e.intro
      }))
    });
  } else {
    res.json({
      status: false,
      which: "缺少参数page"
    });
  }
});

router.post('/addbillcontent', async function (req, res) {
  const { billtypeid, consumetime, price, intro } = req.body;
  if (billtypeid && consumetime && price && intro) {
    const rrr = await req.mongo`bill`({
      consumetime: moment(consumetime),
      price,
      billtype_id: billtypeid,
      user_id: req.user.id,
      intro
    }).save();
    console.log(rrr);
    if (rrr) {
      res.json({
        status: true,
        which: "添加成功"
      });
    } else {
      res.json({
        status: true,
        which: "添加失败"
      });
    }
  } else {
    res.json({
      status: false,
      which: "缺少参数"
    });
  }
});

router.post('/editbillcontent', async function (req, res) {
  const { id, billtypeid, consumetime, price, intro } = req.body;
  if (id) {
    const updateObj = {};
    if (billtypeid) updateObj.billtype_id = billtypeid;
    if (consumetime) updateObj.consumetime = new Date();
    if (price) updateObj.price = price;
    if (intro) updateObj.intro = intro;
    updateObj.updatetime = new Date();
    if (Object.keys(updateObj).length) {
      const Bill = req.mongo`bill`;
      console.log(req.user.id);
      const result = await Bill.findOneAndUpdate(
        { user_id: req.user.id, _id: ObjectId(id) },
        updateObj
      );
      if (result) {
        res.json({
          status: true,
          which: "修改账类型成功"
        });
      } else {
        res.json({
          status: false,
          which: "无该id记录"
        });
      }
    } else {
      res.json({
        status: false,
        which: "参数不足"
      });
    }
  }
});

module.exports = router;

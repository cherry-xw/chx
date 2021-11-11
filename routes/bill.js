const express = require('express');
const { formatTime } = require('../utils/time');
const router = express.Router();

router.post('/addbilltype', async function (req, res) {
  if (req.body.typename) {
    await req.mysql.query('INSERT INTO note_billtype SET ?', {
      createtime: formatTime(),
      updatetime: formatTime(),
      typename: req.body.typename,
      intro: req.body.intro || "",
      user_id: req.user.id
    });
    res.json({
      status: true,
      which: "添加成功"
    });
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
      updatetime: formatTime()
    };
    if (typename) updateData.typename = typename;
    if (intro) updateData.intro = intro;
    await req.mysql.query('UPDATE note_billtype SET ? WHERE ? AND ?', [
      updateData,
      { user_id: req.user.id },
      { id }
    ]);
    res.json({
      status: true,
      which: "修改账类型成功"
    });
  } else {
    res.json({
      status: false,
      which: "参数不足"
    });
  }
});

router.get('/getbilltypelist', async function (req, res) {
  const result = await req.mysql.query('SELECT * FROM note_billtype WHERE ?', {
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
  const page = parseInt(req.query.page);
  if (!isNaN(page)) {
    const result = await req.mysql.query(`
      SELECT *
      FROM note_bill
      WHERE ?
      ORDER BY consumetime desc
      LIMIT ${page * 25},${(page + 1) * 25}
    `, {
      user_id: req.user.id
    });
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
    await req.mysql.query("INSERT INTO note_bill SET `uuid` = REPLACE ( UUID( ), '-', '' ), ?", {
      updatetime: formatTime(),
      date: formatTime(),
      consumetime: formatTime(consumetime),
      price,
      billtype_id: billtypeid,
      user_id: req.user.id,
      intro
    });
    res.json({
      status: true,
      which: "添加成功"
    });
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
    if (consumetime) updateObj.consumetime = formatTime(consumetime);
    if (price) updateObj.price = price;
    if (intro) updateObj.intro = intro;
    updateObj.updatetime = formatTime();
    if (Object.keys(updateObj).length) {
      const result = await req.mysql.query('SELECT * FROM note_billtype WHERE ? AND ?', [
        { user_id: req.user.id },
        { id: billtypeid }
      ], "请求账单类型出错");
      if (result.length) {
        await req.mysql.query('UPDATE note_bill SET ? WHERE ? AND ?', [
          updateObj,
          { user_id: req.user.id },
          { uuid: id }
        ]);
        res.json({
          status: true,
          which: "修改账类型成功"
        });
      } else {
        res.json({
          status: false,
          which: "无该billtypeid记录"
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

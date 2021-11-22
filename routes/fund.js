const express = require('express');
const router = express.Router();
const moment = require('moment');
const request = require('request');

router.get('/fundGroup', function (req, res) {
  console.log("get");
  const name = req.query.name;
  if (name) {
    req.mongo`FundStore`.findOne({name}, (err, ret)=> {
      if (err) {
        console.log(err.message);
        res.json({
          status: false,
          which: `查询失败：${err.message}`
        });
      } else if (ret) {
        res.json({
          status: true,
          data: ret.message
        });
      } else {
        res.json({
          status: false,
          which: "查询用户失败"
        });
      }
    });
  } else {
    res.json({
      status: false,
      which: "name字段缺失"
    });
  }
});
router.post('/fundGroup', function (req, res) {
  const name = req.body.name;
  const message = req.body.message;
  if (name && message) {
    req.mongo`FundStore`.findOne({name}, (err, ret)=> {
      if (err) {
        console.log(err.message);
        res.json({
          status: false,
          which: `查询失败：${err.message}`
        });
      } else if (ret) {
        // 查到了就更新
        req.mongo`FundStore`.update({name}, {$set: {message, editTime: Date.now()}}, err => {
          if (err) {
            console.log(err.message);
            res.json({
              status: false,
              which: `添加失败：${err.message}`
            });
          } else {
            res.json({
              status: true,
              which: "更新成功"
            });
          }
        });
      } else {
        // 查不到就存储
        const store = new req.mongo`FundStore`({
          name,
          message
        });
        store.save(err => {
          console.log('save status:', err ? 'failed' : 'success');
          if (err) {
            console.log(err.message);
            res.json({
              status: false,
              which: `添加失败：${err.message}`
            });
          }
          else {
            res.json({
              status: true,
              which: "添加成功"
            });
          }
        });
      }
    });
  } else {
    res.json({
      status: false,
      which: "name或message不能为空"
    });
  }
});
router.patch('/fundGroup', function (req, res) {
  const name = req.body.name;
  const message = req.body.message;
  if (name && message) {
    req.mongo`FundStore`.update({name}, {$set: {message, editTime: Date.now()}}, err => {
      if (err) {
        console.log(err.message);
        res.json({
          status: false,
          which: `添加失败：${err.message}`
        });
      } else {
        res.json({
          status: true,
          which: "更新成功"
        });
      }
    });
  } else {
    res.json({
      status: false,
      which: "name或message不能为空"
    });
  }
});

const cache = {};

router.get('/fundNetWorth', function (req, res) {
  const code = req.query.code;
  const date = req.query.date || moment().format("YYYY-MM-DD");
  if ((code + "").length === 6) {
    const codeDateStr = `${code}_${date}`;
    if (cache[codeDateStr]) {
      res.json({
        status: true,
        data: cache[codeDateStr]
      });
    } else {
      request({
        url: `http://eid.csrc.gov.cn/fund/disclose/getPublicFundJZInfoMore.do?_=${Date.now()}&aoData=${encodeURIComponent(JSON.stringify([
          { "name": "sEcho", "value": 1 },
          { "name": "iColumns", "value": 5 },
          { "name": "sColumns", "value": ",,,," },
          { "name": "iDisplayStart", "value": 0 },
          { "name": "iDisplayLength", "value": 20 },
          { "name": "mDataProp_0", "value": "fund" },
          { "name": "mDataProp_1", "value": "fund" },
          { "name": "mDataProp_2", "value": "fund" },
          { "name": "mDataProp_3", "value": "fund" },
          { "name": "mDataProp_4", "value": "valuationDate" },
          { "name": "fundType", "value": "all" },
          { "name": "fundCompanyShortName", "value": "" },
          { "name": "fundCode", "value": code.toString() },
          { "name": "fundName", "value": "" },
          { "name": "startDate", "value": date },
          { "name": "endDate", "value": date }
        ]))}`,
        json: true,
        method: 'get'
      }, (err, rrr, body) => {
        try {
          if (err) {
            console.log(err);
            res.json({
              status: false,
              data: null
            });
          } else {
            const val = rrr.body.aaData.filter(e => e.totalNetValue);
            if (val.length && val[0].valuationDate === date) {
              cache[codeDateStr] = val;
            }
            res.json({
              status: true,
              data: val
            });
          }
        } catch (error) {
          console.error(error);
          res.json({
            status: false,
            data: null
          });
        }
      });
    }
  } else {
    res.json({
      status: false,
      data: null
    });
  }

});

module.exports = router;

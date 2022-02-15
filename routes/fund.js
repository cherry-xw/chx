const express = require('express');
const moment = require('moment-timezone');
const request = require('request');
const cheerio = require('cheerio');
const router = express.Router();


router.get('/fundGroup', function (req, res) {
  const name = req.query.name;
  if (name) {
    req.mongo`FundStore`.findOne({ name }, (err, ret) => {
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
    req.mongo`FundStore`.findOne({ name }, (err, ret) => {
      if (err) {
        console.log(err.message);
        res.json({
          status: false,
          which: `查询失败：${err.message}`
        });
      } else if (ret) {
        // 查到了就更新
        req.mongo`FundStore`.update({ name }, { $set: { message, editTime: Date.now() } }, err => {
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
    req.mongo`FundStore`.update({ name }, { $set: { message, editTime: Date.now() } }, err => {
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

// 使用证券网站数据
function getFromZq(code, date) {
  return new Promise((resolve, reject) => {
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
    }, (err, rrr) => {
      if (err) {
        reject(err);
      } else {
        resolve(rrr);
      }
    });
  });
}

// 使用天天基金数据
async function getFromTtjj(code) {
  return new Promise((resolve, reject) => {
    request({ url: `http://fund.eastmoney.com/${code}.html` }, (err, res, body) => {
      if (err) {
        reject(err);
      } else {
        try {
          const $ = cheerio.load(body);
          const netValue = $("dl.dataItem02>dd.dataNums>span.ui-font-large.ui-num").text();
          const valuationDate = $("dl.dataItem02>dt>p").text().replace(/^.*(\d{4}-\d{2}-\d{2}).*$/, "$1");
          resolve({ netValue, valuationDate });
        } catch (error) {
          reject(error);
        }
      }
    });

  });
}

router.get('/fundNetWorthHistory', async function (req, res) {
  const code = req.query.code;
  const Fundnav = req.mongo`fundnav`;
  Fundnav.findOne({ code }, (err, ret) => {
    if (err) {
      console.log(err.message);
      res.json({
        status: false,
        which: `查询失败：${err.message}`
      });
    } else {
      res.json({
        status: true,
        data: ret
      });
    }
  });
});

// 只能请求当天的数据
router.get('/fundNetWorth', async function (req, res) {
  const code = req.query.code + "";
  const date = moment().format("YYYY-MM-DD");
  const Fundnav = req.mongo`fundnav`;
  if (code.length === 6) {
    Fundnav.findOne({ code, valuationDate: date }, async (err, ret) => {
      if (err) {
        console.log(err.message);
        res.json({
          status: false,
          which: `查询失败：${err.message}`
        });
      } else if (ret) {
        res.json({
          status: true,
          data: ret
        });
      } else {
        try {
          const zqRes = await getFromZq(code, date);
          const val = zqRes.body.aaData.filter(e => e.totalNetValue);
          const resData = {};
          if (val.length && val[0].valuationDate === date) {
            resData.netValue = val[0].shareNetValue;
            resData.valuationDate = date;
          } else {
            // 没请求到当天的数据,尝试去天天基金获取
            const ttjjRes = await getFromTtjj(code);
            if (moment().isSame(ttjjRes.valuationDate, "day") && ttjjRes.netValue) {
              resData.netValue = ttjjRes.netValue;
              resData.valuationDate = ttjjRes.valuationDate;
            }
          }
          if (resData.valuationDate) {
            await new Fundnav({
              code,
              ...resData
            }).save();
            res.json({
              status: true,
              data: resData
            });
          } else {
            res.json({
              status: false,
              data: null
            });
          }
        } catch (error) {
          console.log(error);
          res.json({
            status: false,
            data: null
          });
        }
      }
    });
  } else {
    res.json({
      status: false,
      data: null
    });
  }
});

module.exports = router;

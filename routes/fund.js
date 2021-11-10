const express = require('express');
const router = express.Router();
const request = require('request');

router.get('/fundGroup', function (req, res) {
  const id = req.query.id
  if (id === "VevWh3vxVVtJLb") {
    res.json({
      status: true,
      data: require("../static/hkl")
    })
  } else {
    res.json({
      status: false,
      data: []
    })
  }
})

router.get('/fundNetWorth', function(req, res) {
  const code  = req.query.code
  const beginDate = req.query.beginDate || moment().format("YYYY-MM-DD")
  const endDate = req.query.endDate || moment().format("YYYY-MM-DD")
  if ((code + "").length === 6) {
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
        { "name": "startDate", "value": beginDate },
        { "name": "endDate", "value": endDate }
      ]))}`,
      json: true,
      method: 'get'
    }, (err, rrr, body) => {
      if (err) {
        res.json({
          status: false,
          data: null
        })
      } else {
        res.json({
          status: true,
          data: rrr.body
        })
      }
    })
  } else {
    res.json({
      status: false,
      data: null
    })
  }
  
})

module.exports = router;

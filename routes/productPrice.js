const express = require('express');
const cheerio = require('cheerio');
const syncRequest = require("../utils/syncRequest");
const { differenceBy } = require('lodash');
const moment = require('moment');
const router = express.Router();

const names = [
  {name: "三元材料", specs: "111/动力"},
  {name: "磷酸铁锂", specs: "动力型"},
  {name: "三元前驱体", specs: "111"},
  {name: "电解钴", specs: "≥99.8%"},
  {name: "氢氧化锂", specs: "电池级"},
  {name: "碳酸锂", specs: "工业级"},
  {name: "隔膜", specs: "7+2μm陶瓷涂覆隔膜"},
  {name: "电解液", specs: "三元/圆柱/2600mAh"},
  {name: "电解液", specs: "磷酸铁锂"},
  {name: "六氟磷酸锂", specs: "六氟磷酸锂 国产"},
  {name: "EMC", specs: "电池级"},
  {name: "DMC", specs: "电池级"},
  {name: "铜箔", specs: "6um电池"},
];

function evalScope(script, returnVariable) {
  // eslint-disable-next-line no-unused-vars
  const echarts = {init(){return {setOption(){}};}};
  // eslint-disable-next-line no-unused-vars
  const document = {getElementById(){}};
  eval(script);
  return eval(returnVariable);
}
// 匹配需要抓取页面的正则
const regexp = new RegExp(names.map(e => `((?=.?${e.name}).+(?=.?${e.specs}).+)`).join("|"));

// 网页前置接口，进入网页时自动发起该请求，，网页判断数据更新日期，如果日期不对，则发起更新
router.get('/prdPrice/getSpotGoodsHistoryPrice', async function(req, res) {
  try {
    const [_, body] = await syncRequest({ url: `http://www.icbattery.com/quote/todaymainprice.php` });
    const $ = cheerio.load(body);
    const links = [];
    $(`#content`).find("a").each(function () {
      links.push($(this).attr("href"));
    });
    const usefulLinks = links.filter(e => regexp.test(decodeURIComponent(e)));
    const fullLinks = usefulLinks.map(e => `http://www.icbattery.com${encodeURI(e)}`);
    for (let index = 0; index < fullLinks.length; index++) {
      const fullurl = fullLinks[index];
      const url = usefulLinks[index];
      try {
        const Model = req.mongo`productPrice`;
        const durl = decodeURIComponent(url);
        // 过滤字段
        const name = durl.replace(/^.+&kname=(.*)&specs.+$/, "$1");
        const type = durl.replace(/^.+&specs=(.*)&origi.+$/, "$1");
        // 根据类型和更新时间查询是否需要更新改条数据
        const modRes = await Model.findOne({ name, type, editTime: { $lt: new Date(`${moment().format("YYYY-MM-DD")}T00:00:00`).getTime() } });
        if (modRes) {
          // 请求详细数据列表
          const [_, mainBody] = await syncRequest({ url: fullurl });
          const scripts = cheerio.load(mainBody)('script');
          // 过滤出包含echarts的脚本
          const chartScript = scripts.get().filter(e => e.children.length).map(e => e.children[0].data).filter(e => /echarts\.init\(/.test(e));
          if (chartScript.length) {
            const option = evalScope(chartScript[0], "option");
            // console.log(modRes);
            // 取出网页上的日期列表
            let dates = option.xAxis[0].data;
            const year = new Date().getFullYear();
            // 是否发生了跨年，在月-日 前面拼上 年-
            if (dates.indexOf("12-31") !== -1) {
              let flag = false;
              dates = dates.map(e => {
                if (flag) {
                  return `${year}-${e}`;
                } else {
                  flag = e === "12-31";
                  return `${year-1}-${e}`;
                }
              });
            } else {
              dates = dates.map(e => `${year}-${e}`);
            }
            // 取出所有数据
            const val = option.series.data;
            // 将年月日和数据映射为一个对象
            const data = dates.map((date, index) => ({date, value: val[index]}));
            // 根据是否存在该条数据创建或更新数据条
            // if (!modRes) {
            //   const model = new Model({
            //     name,
            //     type,
            //     data
            //   });
            //   await model.save();
            // } else {
            const diffDateData = differenceBy(data, modRes.data, "date");
            console.log(diffDateData);
            if (diffDateData.length) {
              await modRes.updateOne({
                $push: {
                  data: {
                    $each: diffDateData,
                    $sort: {date: -1}
                  }
                },
                editTime: Date.now()
              });
            }
            // }
          }
        }
      } catch (error) {
        console.log(error);
        res.json({
          status: false,
          which: "迭代爬取数据失败"
        });
      }
    }
    res.json({
      status: true,
      data: "更新成功",
      which: "更新成功"
    });
    return;
  } catch (error) {
    res.json({
      status: false,
      which: "爬取数据失败"
    });
  }
});

// 搜索某类列表数据
router.get('/prdPrice/list', async function(req, res) {
  const name = req.query.name;
  const type = req.query.type;
  console.log("请求数据的筛选条件", name, type);
  if (name && type) {
    const Model = req.mongo`productPrice`;
    try {
      const data = await Model.findOne({ name, type });
      res.json({
        status: true,
        data: {
          name: data.name,
          type: data.type,
          data: data.data.map(e => ({date: e.date, value: e.value}))
        }
      });
    } catch (error) {
      console.log(error);
      res.json({
        status: false,
        which: "获取列表出错"
      });
    }
  } else {
    res.json({
      status: false,
      which: "name或type字段缺失"
    });
  }
});

module.exports = router;

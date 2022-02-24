const express = require('express');
const cheerio = require('cheerio');
const syncRequest = require("../utils/syncRequest");
const { differenceBy } = require('lodash');
const moment = require('moment-timezone');
const router = express.Router();

// 产品列表
const prods = [
  { name: "三元材料", specs: "111/动力", origin: "国产", unit: "万元/吨" },
  { name: "磷酸铁锂", specs: "动力型", origin: "国产", unit: "万元/吨" },
  { name: "三元前驱体", specs: "111", origin: "国产", unit: "万元/吨" },
  { name: "电解钴", specs: "≥99.8%", origin: "国产", unit: "万元/吨" },
  { name: "氢氧化锂", specs: "电池级", origin: "国产", unit: "万元/吨" },
  { name: "碳酸锂", specs: "工业级", origin: "国产", unit: "万元/吨" },
  { name: "隔膜", specs: "7+2μm陶瓷涂覆隔膜", origin: "国产中端", unit: "元/平方米" },
  { name: "电解液", specs: "三元/圆柱/2600mAh", unit: "万元/吨" },
  { name: "电解液", specs: "磷酸铁锂", unit: "万元/吨" },
  { name: "六氟磷酸锂", specs: "六氟磷酸锂", origin: "国产", unit: "万元/吨" },
  { name: "EMC", specs: "电池级", origin: "国产", unit: "万元/吨" },
  { name: "DMC", specs: "电池级", origin: "国产", unit: "万元/吨" },
  { name: "铜箔", specs: "6um电池级", origin: "国产", unit: "万元/吨" },
];

function evalScope(script, returnVariable) {
  // eslint-disable-next-line no-unused-vars
  const echarts = { init() { return { setOption() { } }; } };
  // eslint-disable-next-line no-unused-vars
  const document = { getElementById() { } };
  eval(script);
  return eval(returnVariable);
}
// 匹配需要抓取页面的正则
const regexp = new RegExp(prods.map(e => e.origin ? `((?=.?${e.name}).+(?=.?${e.specs.replace("+", "\\+")}).+(?=.?${e.origin}).*)` : `((?=.?${e.name}).+(?=.?${e.specs.replace("+", "\\+")}).+)`).join("|"));

// 数据库新增字段，更新表结构及其数据，不作为客户端接口使用
router.get("/prdPrice/initial", async function (req, res) {
  try {
    const [_, body] = await syncRequest({ url: `http://www.icbattery.com/quote/todaymainprice.php` });
    const $ = cheerio.load(body);
    const links = [];
    $(`#content`).find("a").each(function () {
      links.push($(this).attr("href"));
    });
    console.log(links.map(e => decodeURIComponent(e)));
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
                return `${year - 1}-${e}`;
              }
            });
          } else {
            dates = dates.map(e => `${year}-${e}`);
          }
          // 取出所有数据
          const val = option.series.data;
          // 将年月日和数据映射为一个对象
          const data = dates.map((date, index) => ({ date, value: val[index] }));
          const modRes = await Model.findOne({ name, type });
          // 根据是否存在该条数据创建或更新数据条;
          if (!modRes) {
            const model = new Model({
              name,
              type,
              data
            });
            await model.save();
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
      which: "添加数据库新数据成功"
    });
  } catch (error) {
    console.error(error);
    res.json({
      status: false,
      which: "爬取数据失败"
    });
  }
});

// 数据库增加字段，更新表结构及其数据，不作为客户端接口使用
router.get("/prdPrice/update", async function (req, res) {
  try {
    // const Model = req.mongo`productPrice`;
    // const rrr= await Model.findOneAndUpdate({ _id: ObjectId("61dda01766b3b64343a1a3e6") }, {
    //   data: ""
    // });
    res.json({
      status: true,
      which: "操作成功"
    });
  } catch (error) {
    console.error(error);
    res.json({
      status: false,
      which: "执行出错"
    });
  }
});

// 网页前置接口，进入网页时自动发起该请求，，网页判断数据更新日期，如果日期不对，则发起更新
router.get('/prdPrice/getSpotGoodsHistoryPrice', async function (req, res) {
  console.log("time: ", moment().format("YYYY-MM-DD HH:mm:ss.ssssss"));
  try {
    console.log("开始访问全列表");
    const [_, body] = await syncRequest({ url: `http://www.icbattery.com/quote/todaymainprice.php` });
    const $ = cheerio.load(body);
    const links = [];
    $(`#content`).find("a").each(function () {
      links.push($(this).attr("href"));
    });
    // 过滤出有效条信息
    const usefulLinks = links.filter(e => regexp.test(decodeURIComponent(e)));
    const fullLinks = usefulLinks.map(e => `http://www.icbattery.com${encodeURI(e)}`);
    console.log("全列表访问成功，过滤有效信息 ", fullLinks.length, "条");
    let isPartSuccess = false;
    for (let index = 0; index < fullLinks.length; index++) {
      const fullurl = fullLinks[index];
      const url = usefulLinks[index];
      const Model = req.mongo`productPrice`;
      const durl = decodeURIComponent(url);
      // 过滤字段
      const name = durl.replace(/^.+&kname=(.*)&specs.+$/, "$1");
      const type = durl.replace(/^.+&specs=(.*)&origi.+$/, "$1");
      // 根据类型和更新时间查询是否需要更新改条数据
      const modRes = await Model.findOne({ name, type, editTime: { $lt: new Date(moment().format("YYYY-MM-DD")) } });
      if (modRes) {
        console.log("需要获取" + name + " " + type + "的数据");
        // 为每次请求包一个try catch 这样出错后不会直接停止，而是会继续访问后续
        try {
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
                  return `${year - 1}-${e}`;
                }
              });
            } else {
              dates = dates.map(e => `${year}-${e}`);
            }
            // 取出所有数据
            const val = option.series.data;
            // 将年月日和数据映射为一个对象
            const data = dates.map((date, index) => ({ date, value: val[index] }));
            const diffDateData = differenceBy(data, modRes.data, "date");
            console.log(diffDateData);
            if (diffDateData.length) {
              await modRes.updateOne({
                $push: {
                  data: {
                    $each: diffDateData,
                    $sort: { date: -1 }
                  }
                },
                editTime: Date.now()
              });
              console.log(`更新 ${name}, ${type} 结束`);
            }
          }
        } catch (error) {
          isPartSuccess = true;
          console.log(`请求${name}-${type}时发生错误`);
          console.error(error);
        }
      } else {
        console.log("不需要获取" + name + " " + type + "的数据");
      }
    }
    res.json({
      status: true,
      data: isPartSuccess ? "部分更新成功" : "更新成功",
      which: isPartSuccess ? "部分更新成功" : "更新成功"
    });
    return;
  } catch (error) {
    console.error(error);
    res.json({
      status: false,
      which: "爬取数据失败"
    });
  }
});

// 搜索某类列表数据
router.get('/prdPrice/list', async function (req, res) {
  const name = req.query.name;
  const type = req.query.type;
  const origin = req.query.origin || "";
  console.log("请求数据的筛选条件", name, type);
  if (name || type || origin) {
    const Model = req.mongo`productPrice`;
    try {
      const obj = { name };
      if (type) obj.type = type;
      if (origin) obj.origin = origin;
      const data = await Model.findOne(obj, { _id: 0, name: 1, type: 1, unit: 1, origin: 1, data: { date: 1, value: 1 } });
      if (data) {
        res.json({
          status: true,
          data
        });
      } else {
        res.json({
          status: false,
          which: "未找到数据"
        });
      }
    } catch (error) {
      console.error(error);
      res.json({
        status: false,
        which: "获取列表出错"
      });
    }
  } else {
    res.json({
      status: false,
      which: "name或type或origin字段缺失"
    });
  }
});

module.exports = router;

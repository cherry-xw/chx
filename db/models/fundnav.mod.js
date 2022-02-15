const { Schema, model } = require("mongoose");

const fundnav = Schema({
  code: { type: String }, // 基金代码
  createTime: { type: Date, default: Date.now }, // 创建时间
  netValue: Number, // 基金净值
  valuationDate: String // 净值日期
});

model('fundnav', fundnav);

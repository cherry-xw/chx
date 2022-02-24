const {Schema,model} = require("mongoose");

const productPrice = Schema({
  name: String, // 产品名
  type: String, // 产品类型
  origin: String, // 厂家/产地
  unit: String, // 单位
  createTime: {type: Date, default: Date.now}, // 创建时间
  editTime: {type: Date, default: Date.now}, // 修改时间
  data: [{
    date: String,
    value: Number,
  }] // 存储信息
});

model('productPrice', productPrice);

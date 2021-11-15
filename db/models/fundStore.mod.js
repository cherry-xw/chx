const {Schema,model} = require("mongoose");

const fundStore = Schema({
  name: {
    type: String,
    unique: true
  }, // 用户名
  createTime: {type: Date, default: Date.now}, // 创建时间
  editTime: {type: Date, default: Date.now}, // 修改时间
  message: {
    type: String,
    get: v => JSON.parse(v),
    set: v => JSON.stringify(v)
  } // 存储信息（object转字符串存储）
});
fundStore.virtual('messageJSON').get(function() {
  return JSON.parse(this.message);
});

model('FundStore', fundStore);

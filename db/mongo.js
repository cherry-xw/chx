const mongoose = require('mongoose');
const uri = require("../config").mongo;
const requireContext = require("../utils/requireContext");

requireContext(module, "./models", /\.mod\.js/);

mongoose.connect(uri);
// connect() 返回一个状态待定（pending）的连接，可以用来判断连接成功或失败
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("       mongodb已连接");
});

function mongodb([modelName]) {
  // 获取模块
  const Mod =  mongoose.model(modelName);
  if (Mod) {
    return Mod;
  } else {
    throw new Error(`不存在Model：${modelName}`);
  }
}

module.exports = function (req, res, next) {
  req.mongo = mongodb;
  next();
};

// https://www.cnblogs.com/winyh/p/6682032.html 使用示例

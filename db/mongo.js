const path = require("path");
const mongoose = require('mongoose');
const uri = require("../config").mongo;
const requireDirectory = require('require-directory');

const modelsPath = path.join(__dirname, "./models");
const models = requireDirectory(module, {include(rpath){
  return rpath.startsWith(modelsPath) && rpath.endsWith(".mod.js");
}}).models;

mongoose.connect(uri);
// connect() 返回一个状态待定（pending）的连接，可以用来判断连接成功或失败
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("mongo connected");
});

const mongodb = {
  // 插入，
  insert(modelName, data, callback) {
    const Mod = models[`${modelName}.mod`];
    if (Mod) {
      return new Mod(data).save(callback);
    }
  },
  // 查询，模块名称，查询参数
  model (modelName) {
    return mongoose.model(modelName);
  }
};

module.exports = function (req, res, next) {
  req.mongo = mongodb;
  next();
};

// https://www.cnblogs.com/winyh/p/6682032.html 使用示例

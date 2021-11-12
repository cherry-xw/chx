const mongoose = require('mongoose');

const uri = 'mongodb://chery:GA6sqpJ3ei@localhost:27017/chery';
mongoose.connect(uri);

module.exports = function (req, res, next) {
  req.mongo = {};
  const cacheModel = {};
  // 模块名称，查询参数
  req.mongo.model = modelName => {
    let mod = cacheModel[modelName];
    if (mod) {
      return mod;
    } else {
      return cacheModel[modelName] = mongoose.model(modelName);
    }
  };
  next();
};

// https://www.cnblogs.com/winyh/p/6682032.html 使用示例

const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require("cors");
const config = require("./config");
const expressJwt = require('express-jwt');
const requireContext = require("./utils/requireContext");

const moment = require('moment-timezone');
moment.tz.setDefault("Asia/Shanghai");

console.log("-------启动时间: "+moment().format("YYYY-MM-DD HH:mm:ss.ssssss")+"-------");

// const errorhandler = require('errorhandler')

const routes = requireContext(module, "./routes", /\.js/);
// TODO 给所有的路由增加一个配置项，用于收集是否需要验证token

const mongo = require('./db/mongo');

// console.log(module);

const CORSOrigins = [
  "http://localhost:3000",
  "http://localhost:8080",
  "https://ww.xcherry.top",
  "http://ww.xcherry.top",
  "https://www.xcherry.top",
  "http://www.xcherry.top",
  "https://xcherry.top",
  "http://xcherry.top"
];

const app = express();

// https://github.com/expressjs/cors
app.all('*', cors(function (req, callback) {
  let corsOptions;
  if (CORSOrigins.indexOf(req.header('Origin')) !== -1) {
    corsOptions = { origin: true, optionsSuccessStatus: 200 }; // reflect (enable) the requested origin in the CORS response
  } else {
    corsOptions = { origin: false }; // disable CORS for this request
  }
  callback(null, corsOptions); // callback expects two parameters: error and options
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(mongo);

// 默认从req.headers.authorization获取token值
app.use(expressJwt({
  secret: 'WU_LIANG_xiao_WAN_CHERY',  // 签名的密钥 或 PublicKey
  algorithms: ["HS256"],
  // isRevoked(req, payload, done) {
  // }
}).unless({ path: config.notcheckpath }));

Object.values(routes).forEach(route => {
  app.use(config.prefix, route);
});

// error handler
app.use(function(err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    res.status(401);
    res.json({
      status: false,
      which: "UnauthorizedError"
    });
  } else if (err.name) {
    res.status(err.status || 500);
    console.log(err);
    res.json({
      status: false,
      which: err.name
    });
  } else {
    res.status(500);
    res.json({
      status: false,
      which: "unknowError"
    });
  }
  next();
});

app.use(config.prefix, (err, req, res) => {
  if (!err) {
    res.status(404);
    res.json({
      status: false,
      which: "404 not found"
    });
  }
});

module.exports = app;

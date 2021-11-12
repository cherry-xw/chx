const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const config = require("./config");
const expressJwt = require('express-jwt');
const mysql = require('./db/mysql');
// const errorhandler = require('errorhandler')

const billRouter = require('./routes/bill');
const userRouter = require('./routes/users');
const blogRouter = require('./routes/blog');
const fundRouter = require('./routes/fund');
const mongo = require('./db/mongo');

const app = express();

const CORSOrigins = [
  "http://localhost:8080",
  "https://www.xcherry.top"
];

app.all('*', function(req, res, next) {
  if (CORSOrigins.indexOf(req.headers.origin) !== -1) {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
  }
  res.header("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Authorization");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1');
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(mysql);
app.use(mongo);

// 默认从req.headers.authorization获取token值
app.use(expressJwt({
  secret: 'WU_LIANG_xiao_WAN_CHERY',  // 签名的密钥 或 PublicKey
  algorithms: ["HS256"],
  // isRevoked(req, payload, done) {

  // }
}).unless({ path: config.notcheckpath }));

app.use(config.prefix, userRouter);
app.use(config.prefix, billRouter);
app.use(config.prefix, blogRouter);
app.use(config.prefix, fundRouter);

// error handler
app.use(function(err, req, res, next) {
  console.error(err);
  if (err.name === 'UnauthorizedError') {
    res.status(401);
    res.json({
      status: false,
      which: "UnauthorizedError"
    });
  } else if (err) {
    res.status(err.status || 500);
    res.json({
      status: false,
      which: "serverError"
    });
  } else {
    res.status(500);
    res.json({
      status: false,
      which: "unknowError"
    });
  }
});

module.exports = app;

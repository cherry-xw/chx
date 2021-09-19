const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const expressJwt = require('express-jwt')
const db = require('./db')
// const errorhandler = require('errorhandler')

const billRouter = require('./routes/bill');
const userRouter = require('./routes/users');
const blogRouter = require('./routes/blog');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(db)

// 默认从req.headers.authorization获取token值
app.use(expressJwt({
  secret: 'WU_LIANG_xiao_WAN_CHERY',  // 签名的密钥 或 PublicKey
  algorithms: ["HS256"]
}).unless({
  path: ['/api/login', '/api/verifycode', '/api/regist', '/api/bloglist', '/api/blogcontent']  // 指定路径不经过 Token 解析
}))

app.use('/api', userRouter);
app.use('/api', billRouter);
app.use('/api', blogRouter);

// error handler
app.use(function(err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    res.status(401)
    res.json({
      status: false,
      which: "UnauthorizedError"
    })
  } else if (err) {  
    res.status(err.status || 500);
    res.json({
      status: false,
      which: "serverError"
    })
  } else {
    res.status(500);
    res.json({
      status: false,
      which: "unknowError"
    })
  }
});

module.exports = app;

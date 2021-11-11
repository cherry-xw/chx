const config = require('./config');
const mysql = require('mysql');
const connection = mysql.createConnection(config);

connection.connect();
console.log('mysql connected');

module.exports = function (req, res, next) {
  req.mysql = {};
  req.mysql.query = (option, value, errMsg = "请求数据库出错") => new Promise(resolve => {
    connection.query(option, value, (err, result) => {
      if (err) {
        res.json({
          status: false,
          which: errMsg
        });
        console.log(err);
      } else {
        resolve(result);
      }
    });
  });
  next();
};
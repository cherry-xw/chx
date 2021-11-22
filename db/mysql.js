const mysql = require('mysql');
const config = require('../config').mysql;
const pool = mysql.createPool(config);

// function getConnection() {
//   return new Promise((resolve, reject) => {
//     pool.getConnection(function (err, connection) {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(connection);
//         connection.release();
//       }
//     });
//   });
// }

module.exports = function (req, res, next) {
  req.mysql = {
    query: (option, value, errMsg = "请求数据库出错") => new Promise(resolve => {
      pool.getConnection(function (err, connection) {
        if (err) {
          connection.release();
          console.error(err);
          res.json({
            status: false,
            which: "连接数据库错误"
          });
        } else {
          console.log('mysql connected');
          connection.query(option, value, (err, result) => {
            connection.release();
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
        }
      });
    })
  };
  next();
};
const request = require('request');

module.exports = function (...params) {
  return new Promise((resolve, reject) => {
    request(...params, (err, res, body) => {
      if (err) {
        reject(err);
      } else {
        resolve([res, body]);
      }
    });
  });
};
const moment = require('moment-timezone');

function formatTime(str) {
  return moment(str).format("YYYY-MM-DD HH:mm:ss.ssssss");
}

module.exports = {
  formatTime
};
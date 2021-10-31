const moment = require('moment');

 function formatTime(str) {
   return moment(str).format("YYYY-MM-DD HH:mm:ss.ssssss")
 }

 console.log("-------启动时间: "+formatTime()+"-------");

 module.exports = {
  formatTime
 }
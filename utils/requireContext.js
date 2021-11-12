const path = require("path");
const requireDirectory = require('require-directory');
const lodash = require("lodash");

module.exports = function (thatModule, cpath, end) {
  const modelsPath = path.join(thatModule.path, cpath);
  const obj = requireDirectory(thatModule, {
    include(rpath){
      return rpath.startsWith(modelsPath) && end.test(rpath);
    }
  });
  return lodash.get(obj, cpath.replace(/^\.\//,"").replace(/\/$/, "").replace(/\//g, "."), null);
};
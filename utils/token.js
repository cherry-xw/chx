const jwt = require('jsonwebtoken');

// const HEADER = {'typ': 'JWP', 'alg': 'default'};
// const KEY = 'WU_LIANG_xiao_WAN_CHERY';
// const SALT = 'www.xcherry.com';
const TIME_OUT = 604800;  // 7 * 24 * 60 * 60  # 存储秒数


function getToken(id) {
  return 'Bearer ' + jwt.sign(
    {
      id
    },
    'WU_LIANG_xiao_WAN_CHERY',
    {
      expiresIn: TIME_OUT
    }
  );
}

module.exports = {
  getToken
};
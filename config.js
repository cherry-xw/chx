module.exports = {
  prefix: '/api',
  mongo: 'mongodb://chery-node:GA6sqpJ3ei-node@sql.xcherry.top:38194/chery-node?authSource=admin',
  // mongo: 'mongodb://localhost:27017/test',
  notcheckpath: [
    'test',
    'login', 'verifycode', 'regist',
    'bloglist', 'blogcontent',
    'fundGroup', "fundNetWorth", "fundNetWorthHistory",
    "prdPrice/getSpotGoodsHistoryPrice", "prdPrice/list", "prdPrice/update",
    'socialFinancing/upload', 'socialFinancing/list'
  ].map(e => '/api/' + e).concat("/")  // 指定路径不经过 Token 解析
};
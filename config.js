module.exports = {
  prefix: '/api',
  mysql: {
    host: 'sql.xcherry.top',
    user: 'root',
    password: '1176587427',
    database: 'blog'
  },
  mongo: 'mongodb://chery-node:GA6sqpJ3ei-node@main.xcherry.top:27017/chery-node?authSource=admin',
  notcheckpath: [
    'test',
    'login', 'verifycode', 'regist',
    'bloglist', 'blogcontent',
    'fundGroup', "fundNetWorth", "fundNetWorthHistory",
    "prdPrice/getSpotGoodsHistoryPrice", "prdPrice/list",
    'socialFinancing/upload', 'socialFinancing/list'
  ].map(e => '/api/' + e).concat("/")  // 指定路径不经过 Token 解析
};
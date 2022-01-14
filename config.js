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
    "/",
    '/api/test',
    '/api/login', '/api/verifycode', '/api/regist',
    '/api/bloglist', '/api/blogcontent',
    '/api/fundGroup', "/api/fundNetWorth",
    "/api/prdPrice/getSpotGoodsHistoryPrice", "/api/prdPrice/list",
    '/api/socialFinancing/upload', '/api/socialFinancing/list'
  ]  // 指定路径不经过 Token 解析
};
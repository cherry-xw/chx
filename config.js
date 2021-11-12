module.exports = {
  prefix: '/api',
  mysql: {
    host: 'sql.xcherry.top',
    user: 'root',
    password: '1176587427',
    database: 'blog',
    useConnectionPooling: true
  },
  mongo: 'mongodb://chery-node:GA6sqpJ3ei-node@main.xcherry.top:27017/chery-node?authSource=admin',
  notcheckpath: ['/api/login', '/api/verifycode', '/api/regist', '/api/bloglist', '/api/blogcontent', '/api/fundGroup', "/api/fundNetWorth", '/api/test']  // 指定路径不经过 Token 解析
};
var express = require('express');
const { nanoid } = require('nanoid');
const { checkPassword, aesDecrypt, makePassword } = require('../utils/hashers');
const { formatTime } = require('../utils/time');
const { getToken } = require('../utils/token');
var router = express.Router();

const verifyCache = {}

router.post('/login', async function(req, res) {
  const code = verifyCache[req.body.verifyCode]
  if (req.body.username || req.body.password || code) {
    delete verifyCache[req.body.verifyCode]
    const username = aesDecrypt(req.body.username, code)
    const result = await req.db.query('SELECT * FROM note_user where ?', {
      username
    })
    const pwd = aesDecrypt(result[0].password, code)
    if (checkPassword(req.body.password, pwd)) {
      res.json({
        status: true,
        which: "登录成功",
        data: getToken(result[0].id)
      });
    } else {
      res.json({
        status: false,
        which: '用户名或密码错误'
      });
    }
  } else {
    res.json({
      status: false,
      which: "用户名密码不能为空"
    })
  }
});

router.post('/regist', async (req, res) => {
  const code = verifyCache[req.body.verifyCode]
  if (req.body.username || req.body.password || code) {
    delete verifyCache[req.body.verifyCode]
    const username = req.body.username // aesDecrypt(req.body.username, code)
    const password = req.body.password // aesDecrypt(req.body.password, code)
    if (username.length < 4 || password.length < 8) {
      res.json({
        status: false,
        which: "用户名或密码长度不足"
      })
    } else {
      await req.db.query.query("INSERT INTO note_user SET ?", {
        username,
        password: makePassword(password),
        createtime: formatTime()
      })
      res.json({
        status: true,
        which: "注册成功"
      });
    }
  } else {
    res.json({
      status: false,
      which: "用户名密码不能为空"
    })
  }
})

router.get('/verifycode', (req, res) => {
  const key = nanoid(5)
  const value = nanoid(8)
  verifyCache[key] = value
  res.json({
    status: true,
    data: {
      key,
      value
    }
  })
})

module.exports = router;

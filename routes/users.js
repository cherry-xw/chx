let express = require('express');
const { customAlphabet, nanoid } = require('nanoid');
const { checkPassword, aesDecrypt, makePassword } = require('../utils/hashers');
const { MD5 } = require('crypto-js');
const { getToken } = require('../utils/token');
let router = express.Router();
const nanoid8 = customAlphabet('abcdefghijklmnopqrstuvwxyz', 8);
const verifyCache = {};

router.post('/login', async function (req, res) {
  const code = verifyCache[req.body.verifyCodeKey];
  if (req.body.username || req.body.password || code) {
    delete verifyCache[req.body.verifyCodeKey];
    // const username = aesDecrypt(req.body.username, code);
    const username = req.body.username;
    const result = await req.mongo`user`.findOne({ username });
    if (result) {
      // const pwd = aesDecrypt(req.body.password, code);
      const pwd = req.body.password;
      if (checkPassword(pwd, result.password)) {
        res.json({
          status: true,
          which: "登录成功",
          data: getToken(result.id)
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
        which: "该用户不存在"
      });
    }
  } else {
    res.json({
      status: false,
      which: "用户名密码不能为空"
    });
  }
});

router.post('/regist', async (req, res) => {
  const code = verifyCache[req.body.verifyCodeKey];
  if (req.body.username || req.body.password || code) {
    const username = req.body.username; // aesDecrypt(req.body.username, code)
    const password = req.body.password; // aesDecrypt(req.body.password, code)
    if (username.length < 4 || password.length < 8) {
      res.json({
        status: false,
        which: "用户名或密码长度不足"
      });
    } else {
      try {
        const User = req.mongo`user`;
        const result = await User.findOne({ username });
        if (result) {
          res.json({
            status: false,
            which: "用户名已存在"
          });
        } else {
          const count = await User.find().count();
          const rrr = await new User({
            username,
            _id: MD5(username),
            id: count + 1,
            password: makePassword(password)
          }).save();
          if (rrr) {
            res.json({
              status: true,
              which: "注册成功"
            });
          }
        }
      } catch (error) {
        res.json({
          status: false,
          which: "操作数据库异常"
        });
      }
    }
  } else {
    res.json({
      status: false,
      which: "用户名密码不能为空"
    });
  }
});

router.get('/verifycode', (req, res) => {
  const key = nanoid(5);
  const value = nanoid8();
  verifyCache[key] = value;
  console.log(verifyCache, '---');
  res.json({
    status: true,
    data: {
      key,
      value
    }
  });
});

module.exports = router;

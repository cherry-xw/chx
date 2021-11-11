const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const {nanoid} = require('nanoid');

function makePassword(pwd, salt = nanoid(12), iterations = 120000, keylen = 32, digest = 'sha256') {
  const sha = crypto.pbkdf2Sync(pwd, salt, iterations, keylen, digest).toString('base64');
  return [`pbkdf2_${digest}`, iterations, salt, sha].join('$');
}

function checkPassword(password, encode) {
  const arr = encode.split('$');
  return crypto.pbkdf2Sync(password, arr[2], parseInt(arr[1]), 32, arr[0].split('_')[1]).toString('base64') === arr[3];
}

function aesEncrypt(data, key) {
  return CryptoJS.AES.encrypt(data, key).toString();
}

function aesDecrypt(encrypted, key) {
  try {
    const bytes  = CryptoJS.AES.decrypt(encrypted, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.warn(error);
    return "err";
  }
}

module.exports = {
  makePassword,
  checkPassword,
  aesEncrypt,
  aesDecrypt
};
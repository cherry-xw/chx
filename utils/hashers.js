const crypto = require('crypto');
const {nanoid} = require('nanoid')
function makePassword(pwd, salt = nanoid(12), iterations = 120000, keylen = 32, digest = 'sha256') {
  const sha = crypto.pbkdf2Sync(pwd, salt, iterations, keylen, digest).toString('base64')
  return [`pbkdf2_${digest}`, iterations, salt, sha].join('$')
}

function checkPassword(password, encode) {
  const arr = encode.split('$')
  return crypto.pbkdf2Sync(password, arr[2], parseInt(arr[1]), 32, arr[0].split('_')[1]).toString('base64') === arr[3]
}

function aesEncrypt(data, key) {
  const cipher = crypto.createCipheriv('aes192', key);
  var crypted = cipher.update(data, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
}

function aesDecrypt(encrypted, key) {
  return encrypted
  const decipher = crypto.createDecipheriv('aes192', key);
  var decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = {
  makePassword,
  checkPassword,
  aesEncrypt,
  aesDecrypt
}
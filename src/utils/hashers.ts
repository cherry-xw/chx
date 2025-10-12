import CryptoJS from "crypto-js"

export function aesEncrypt(data: string, key: string) {
  return CryptoJS.AES.encrypt(data, key).toString();
}

export function aesDecrypt(encrypted: string, key: string) {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.warn(error);
    return "err";
  }
}

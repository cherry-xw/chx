import { customAlphabet } from 'nanoid';
/**
 * 递归函数
 * @param arr 数组
 * @param key 迭代子节点的key
 * @param handle 处理函数
 * @param parent 父节点
 */
export function recursion<T extends Record<string, any>>(
  arr: T[],
  key: string,
  handle: (item: T, parentNode: T | undefined) => void,
  parent?: T | undefined
) {
  for (let index = 0; index < arr.length; index++) {
    const element = arr[index]
    handle(element, parent)
    if (element[key]?.length) {
      recursion<T>(element[key], key, handle, element)
    }
  }
}

const ctx = document.createElement('canvas').getContext('2d')
export function calcTextSize(
  text: string,
  fontSize = 12,
  fontWeight: '400' | '500' | '600' | 'bold' = '400'
) {
  if (ctx) {
    ctx.font = `${fontWeight} ${fontSize}px sans-serif`
    return ctx.measureText(text).width
  }
  return text.length * fontSize
}

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 6);
export function encode(str: string) {
  return btoa(new TextEncoder().encode(str).reduce((a, b) => a + String.fromCharCode(b), '')) + nanoid();
}

export function decode(str: string) {
  return new TextDecoder().decode(Uint8Array.from(atob(str.slice(0, -6)), c => c.charCodeAt(0)));
}

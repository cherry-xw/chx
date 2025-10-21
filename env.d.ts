/// <reference types="vite/client" />
/// <reference types="@webgpu/types" />

declare module 'element-plus/dist/locale/zh-cn.min.mjs'

type DeepPartial<T> = Partial<{ [K in keyof T]: DeepPartial<T[K]> }>
type DeepRequired<T> = Required<{ [K in keyof T]: DeepRequired<T[K]> }>

// window 全局变量声明
interface Window {
  isLoginNotificationShow: boolean
}
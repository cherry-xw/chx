/**
 * 请求无感刷新token封装
 */

import { core, Middleware, ServeCreator } from 'chery-fetch'
import { router } from "@/router"

// 存储token
let aToken = localStorage.getItem('accessToken')
let rToken = localStorage.getItem('refreshToken')

export function resetToken() {
  aToken = localStorage.getItem('accessToken')
  rToken = localStorage.getItem('refreshToken')
}

const addHeader: API.MiddlewareHandle<API.Context<any>> = async function (ctx, next) {
  ctx.request.options.headers = {
    Authorization: localStorage.getItem('refreshToken') || ""
  }
  await next()
}
const middleware = new Middleware([addHeader, core])

// token刷新服务
const tokenServe = ServeCreator('/api', 'POST', { middleware })
// token刷新请求函数，如果同时发起多个相同请求合并只发一个请求
const refresh = tokenServe<{
  data: { accessToken: string; refreshToken: string }
}>('/refreshToken', {}, { useMergeIdenticalRequest: true })

// token刷新中间件
// 定义一个token刷新中间件
const tokenRefreshMiddleware: API.MiddlewareHandle<API.Context<any>> = async function (ctx, next) {
  // 如果token不存在，则直接返回
  if (!aToken || !rToken) {
    ctx.response.error = 'token is not exist'
    router.push('/login')
    return
  }
  // 如果请求头不存在，则创建一个空对象
  if (!ctx.request.options.headers) {
    ctx.request.options.headers = {}
  }
  // 将token添加到请求头中
  ctx.request.options.headers['Authorization'] = aToken

  // 执行下一个中间件
  await next()

  // 如果响应状态码为401，则说明token过期，需要刷新token
  if (ctx.response.result?.status === 401) {
    try {
      // 调用刷新token的promise
      const res = await refresh.promise()
      // 如果刷新成功，则更新token并重新执行下一个中间件
      if (res.status === 200) {
        aToken = res.data.accessToken
        rToken = res.data.refreshToken
        localStorage.setItem('accessToken', aToken)
        localStorage.setItem('refreshToken', rToken)
        // 刷新token成功重新发起前面的请求，重新执行当前中间件
        await next(true)
      } else {
        ctx.response.error = 'token refresh failed'
        router.push('/login')
      }
    } catch (error) {
      ctx.response.error = 'token refresh failed'
      router.push('/login')
      console.warn(error)
    }
  }
}

export default tokenRefreshMiddleware

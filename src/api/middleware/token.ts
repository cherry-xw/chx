/**
 * 请求无感刷新token封装
 */

import { core, Middleware, ServeCreator } from 'chery-fetch'
import { ElNotification } from 'element-plus'
import { router } from '@/router'
import { encode } from '@/utils/common'

window.isLoginNotificationShow = false

// 存储token
let aToken = localStorage.getItem('accessToken')
let rToken = localStorage.getItem('refreshToken')

export function resetToken({
  accessToken,
  refreshToken
}: {
  accessToken: string
  refreshToken: string
}) {
  aToken = accessToken
  rToken = refreshToken
  localStorage.setItem('accessToken', aToken)
  localStorage.setItem('refreshToken', rToken)
}

const addHeader: API.MiddlewareHandle<API.Context<any>> = async function (ctx, next) {
  ctx.request.options.headers = {
    Authorization: localStorage.getItem('refreshToken') || ''
  }
  await next()
}
const middleware = new Middleware([addHeader, core])

// token刷新服务
const tokenServe = ServeCreator('/api', 'POST', { middleware })

function showLoginNotification() {
  if (window.isLoginNotificationShow) return
  window.isLoginNotificationShow = true
  const noti = ElNotification({
    title: '请求失败',
    type: 'error',
    duration: 0,
    onClose() {
      window.isLoginNotificationShow = false
    },
    dangerouslyUseHTMLString: true,
    message: `<div class="login-notification-content">
        <div style="margin-bottom: 8px">当前未登录或登录状态已失效</div>
        <div>
          <button type="button" class="cancel el-button is-plain" onclick="window.isLoginNotificationShow = false">取消</button>
          <button type="button" class="to-login el-button el-button--primary is-plain" onclick="window.isLoginNotificationShow = false">登录</button>
        </div>
      </div>`
  })
  setTimeout(() => {
    document
      .querySelector('.login-notification-content button.cancel')
      ?.addEventListener('click', () => {
        window.isLoginNotificationShow = false
        noti.close()
      })
    document
      .querySelector('.login-notification-content button.to-login')
      ?.addEventListener('click', () => {
        window.isLoginNotificationShow = false
        noti.close()
        const from = encode(router.currentRoute.value.fullPath)
        router.push({ path: '/login', query: { from } })
      })
  }, 200)
}
// token刷新中间件
// 定义一个token刷新中间件
const tokenRefreshMiddleware: API.MiddlewareHandle<API.Context<any>> = async function (ctx, next) {
  // 如果token不存在，则直接返回
  if (!aToken || !rToken) {
    ctx.response.error = 'token is not exist'
    showLoginNotification()
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
  console.log(ctx.response)
  if (ctx.response.error?.status === 401) {
    try {
      delete ctx.response.error
      // token刷新请求函数，如果同时发起多个相同请求合并只发一个请求
      // 调用刷新token的promise
      const res = await tokenServe<{
        data: { accessToken: string; refreshToken: string }
      }>('/refreshToken', {}, { useMergeIdenticalRequest: true }).promise()
      // 如果刷新成功，则更新token并重新执行下一个中间件
      console.log(res)
      if (res.status) {
        aToken = res.data.accessToken
        rToken = res.data.refreshToken
        localStorage.setItem('accessToken', aToken)
        localStorage.setItem('refreshToken', rToken)
        // 刷新token成功重新发起前面的请求，重新执行当前中间件
        await next(true)
      } else {
        ctx.response.error = 'token refresh failed'
        showLoginNotification()
      }
    } catch (error) {
      ctx.response.error = 'token refresh failed'
      showLoginNotification()
      console.warn(error)
    }
  }
}

export default tokenRefreshMiddleware

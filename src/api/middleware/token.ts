/**
 * 基于 chery-fetch 洋葱模型的双 Token 无感自动刷新中间件
 */

import { core, Middleware, ServeCreator } from 'chery-fetch'
import { ElNotification } from 'element-plus'
import 'element-plus/es/components/notification/style/css'
import { router } from '@/router'
import { encode } from '@/utils/common'
import type { UserInfo } from '@/stores/counter'

window.isLoginNotificationShow = false

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_INFO_KEY = 'backend-ui'

function safeGetStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore storage errors
  }
}

function safeRemoveStorage(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore storage errors
  }
}

let aToken = safeGetStorage(ACCESS_TOKEN_KEY)
let rToken = safeGetStorage(REFRESH_TOKEN_KEY)

export interface TokenPairPayload {
  accessToken: string
  refreshToken: string
  user?: UserInfo
}

export function resetToken({ accessToken, refreshToken, user }: TokenPairPayload) {
  aToken = accessToken
  rToken = refreshToken
  safeSetStorage(ACCESS_TOKEN_KEY, aToken)
  safeSetStorage(REFRESH_TOKEN_KEY, rToken)
  if (user && user.id && user.name) {
    safeSetStorage(USER_INFO_KEY, JSON.stringify(user))
  }
}

export function clearToken() {
  aToken = null
  rToken = null
  safeRemoveStorage(ACCESS_TOKEN_KEY)
  safeRemoveStorage(REFRESH_TOKEN_KEY)
  safeRemoveStorage(USER_INFO_KEY)
}

export function getAccessToken(): string {
  aToken = safeGetStorage(ACCESS_TOKEN_KEY) || aToken
  return aToken || ''
}

export function getRefreshToken(): string {
  rToken = safeGetStorage(REFRESH_TOKEN_KEY) || rToken
  return rToken || ''
}

export function hasTokenPair(): boolean {
  return Boolean(getAccessToken() && getRefreshToken())
}

const addHeader: API.MiddlewareHandle<API.Context<unknown>> = async function (ctx, next) {
  ctx.request.options.headers = {
    ...ctx.request.options.headers,
    Authorization: getRefreshToken()
  }
  await next()
}

const middleware = new Middleware([addHeader, core])

// token 刷新服务（合并并发重复刷新请求）
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

interface RefreshTokenResponse {
  status: boolean
  msg: string
  data: TokenPairPayload | null
}

// 记录已重试过的请求上下文，避免刷新后依然 401 时无限递归
const retriedContexts = new WeakSet<object>()

const tokenRefreshMiddleware: API.MiddlewareHandle<API.Context<unknown>> = async function (
  ctx,
  next
) {
  const currentAccess = getAccessToken()
  const currentRefresh = getRefreshToken()

  if (!currentAccess || !currentRefresh) {
    ctx.response.error = 'token is not exist'
    showLoginNotification()
    return
  }

  if (!ctx.request.options.headers) {
    ctx.request.options.headers = {}
  }
  ctx.request.options.headers['Authorization'] = currentAccess

  await next()

  const errStatus = (ctx.response.error as { status?: number } | undefined)?.status
  if (errStatus === 401) {
    if (retriedContexts.has(ctx)) {
      clearToken()
      ctx.response.error = 'token refresh failed'
      showLoginNotification()
      return
    }

    retriedContexts.add(ctx)
    try {
      delete ctx.response.error
      const res = await tokenServe<RefreshTokenResponse>(
        '/refreshToken',
        {},
        { useMergeIdenticalRequest: true }
      ).promise()

      if (res?.status && res.data?.accessToken && res.data?.refreshToken) {
        resetToken(res.data)
        // 刷新成功，通过 chery-fetch compose 的 resetIndex 重新执行当前中间件链
        await next(true)
      } else {
        clearToken()
        ctx.response.error = 'token refresh failed'
        showLoginNotification()
      }
    } catch (error) {
      clearToken()
      ctx.response.error = 'token refresh failed'
      showLoginNotification()
      console.warn(error)
    }
  }
}

export default tokenRefreshMiddleware

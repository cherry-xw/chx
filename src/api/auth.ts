import serve, { tServe } from './index'
import type { UserInfo } from '@/stores/counter'

export interface ApiResponse<T> {
  status: boolean
  msg: string
  which?: string
  data: T
}

export interface VerifyCodeData {
  key: string
  value: string
}

export interface AuthSessionData {
  accessToken: string
  refreshToken: string
  user: UserInfo
  returnTo?: string
}

export interface PocketIdConfigData {
  enabled: boolean
  bootstrapRequired?: boolean
}

export interface InviteCodeItem {
  code: string
  createdBy: string
  note: string
  usedBy: string | null
  usedByUsername: string | null
  expiresAt: number
  consumedAt: number | null
  createdAt: number
  status: 'active' | 'used' | 'expired'
}

export interface AdminPocketIdSettings {
  issuer: string
  clientId: string
  hasClientSecret: boolean
  redirectUri: string
  scopes: string
  enabled: boolean
}

export function requestVerifyCode() {
  return serve<ApiResponse<VerifyCodeData>>('/verifycode', 'GET')
}

export function requestPasswordLogin(payload: {
  username: string
  password: string
  verifyCodeKey: string
}) {
  return serve<ApiResponse<AuthSessionData>>('/login', payload)
}

export function requestPasswordRegister(payload: {
  username: string
  password: string
  verifyCodeKey: string
  name?: string
  inviteCode?: string
}) {
  return serve<ApiResponse<AuthSessionData>>('/regist', payload)
}

export function requestPocketIdConfig() {
  return serve<ApiResponse<PocketIdConfigData>>('/auth/pocket-id/config', 'GET')
}

export function requestPocketIdExchange(code: string) {
  return serve<ApiResponse<AuthSessionData>>('/auth/pocket-id/exchange', { code })
}

export function requestCompletePocketIdRegistration(payload: {
  pendingToken: string
  inviteCode: string
}) {
  return serve<ApiResponse<AuthSessionData>>('/auth/pocket-id/complete-registration', payload)
}

export function requestCurrentUser() {
  return tServe<ApiResponse<UserInfo>>('/userinfo', 'GET')
}

export function requestLogout(refreshToken?: string) {
  return serve<ApiResponse<null>>('/logout', { refreshToken })
}

export function requestAdminInviteCodes() {
  return tServe<ApiResponse<InviteCodeItem[]>>('/admin/invite-codes', 'GET')
}

export function requestCreateInviteCode(payload: { note?: string; expiresInDays?: number }) {
  return tServe<ApiResponse<InviteCodeItem>>('/admin/invite-codes', payload)
}

export function requestDeleteInviteCode(code: string) {
  return tServe<ApiResponse<null>>(`/admin/invite-codes/${encodeURIComponent(code)}`, 'DELETE')
}

export function requestAdminPocketIdSettings() {
  return tServe<ApiResponse<AdminPocketIdSettings>>('/admin/pocket-id', 'GET')
}

export function requestSaveAdminPocketIdSettings(payload: {
  issuer: string
  clientId: string
  clientSecret?: string
  clearClientSecret?: boolean
  redirectUri: string
  scopes: string
}) {
  return tServe<ApiResponse<AdminPocketIdSettings>>('/admin/pocket-id', 'PUT', payload)
}

export function buildPocketIdLoginUrl(from = '/'): string {
  const safeFrom = from.startsWith('/') ? from : '/'
  return `/api/auth/pocket-id/login?from=${encodeURIComponent(safeFrom)}`
}

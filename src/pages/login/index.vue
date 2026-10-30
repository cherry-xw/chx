<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElButton, ElInput, ElMessage } from 'element-plus'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/message/style/css'
import { aesEncrypt } from '@/utils/hashers'
import { useRoute, useRouter } from 'vue-router'
import { resetToken } from '@/api/middleware/token'
import { decode } from '@/utils/common'
import { useUserInfoStore } from '@/stores/counter'
import {
  buildPocketIdLoginUrl,
  requestCompletePocketIdRegistration,
  requestPasswordLogin,
  requestPasswordRegister,
  requestPocketIdConfig,
  requestPocketIdExchange,
  requestVerifyCode
} from '@/api/auth'

defineOptions({ name: 'loginView' })

const route = useRoute()
const router = useRouter()
const userStore = useUserInfoStore()

const isRegister = ref(false)
const username = ref('')
const displayName = ref('')
const password = ref('')
const inviteCode = ref('')
const loading = ref(false)
const oidcLoading = ref(false)
const bootstrapRequired = ref(false)

// 陌生 Pocket ID 首次登录待输入邀请码状态
const oidcPendingToken = ref('')
const oidcPendingName = ref('')

const isBootstrapChery = computed(
  () =>
    isRegister.value &&
    bootstrapRequired.value &&
    username.value.trim().toLowerCase() === 'chery'
)

function resolveReturnTo(rawFrom?: unknown): string {
  if (!rawFrom || typeof rawFrom !== 'string') return '/'
  const trimmed = rawFrom.trim()
  if (trimmed.startsWith('/')) {
    return trimmed
  }
  try {
    const decoded = decode(trimmed)
    return decoded.startsWith('/') ? decoded : '/'
  } catch {
    return '/'
  }
}

async function handleSubmit() {
  if (!username.value.trim() || !password.value) {
    ElMessage.error('用户名或密码不能为空')
    return
  }
  if (isRegister.value && !isBootstrapChery.value && !inviteCode.value.trim()) {
    ElMessage.error('请输入管理员（chery）生成的邀请码')
    return
  }
  loading.value = true
  try {
    const codeRes = await requestVerifyCode().sync
    const uname = aesEncrypt(username.value.trim(), codeRes.data.value)
    const pwd = aesEncrypt(password.value, codeRes.data.value)

    const res = isRegister.value
      ? await requestPasswordRegister({
          username: uname,
          password: pwd,
          verifyCodeKey: codeRes.data.key,
          name: displayName.value.trim() || undefined,
          inviteCode: inviteCode.value.trim() || undefined
        }).sync
      : await requestPasswordLogin({
          username: uname,
          password: pwd,
          verifyCodeKey: codeRes.data.key
        }).sync

    if (res.status && res.data) {
      resetToken(res.data)
      userStore.updateUserInfo(res.data.user)
      ElMessage.success(isRegister.value ? '注册并登录成功' : '登录成功')
      const from = resolveReturnTo(route.query.from)
      await router.replace({ path: from })
    } else {
      ElMessage.error(res.msg || res.which || (isRegister.value ? '注册失败' : '登录失败'))
    }
  } catch {
    ElMessage.error(isRegister.value ? '注册失败，请稍后重试' : '登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function handleOidcPendingActivate() {
  if (!inviteCode.value.trim()) {
    ElMessage.error('请输入管理员（chery）生成的邀请码')
    return
  }
  oidcLoading.value = true
  try {
    const res = await requestCompletePocketIdRegistration({
      pendingToken: oidcPendingToken.value,
      inviteCode: inviteCode.value.trim()
    }).sync
    if (res.status && res.data) {
      resetToken(res.data)
      userStore.updateUserInfo(res.data.user)
      ElMessage.success('Pocket ID 账号激活并登录成功')
      const target = res.data.returnTo || resolveReturnTo(route.query.from)
      await router.replace({ path: target })
    } else {
      ElMessage.error(res.msg || '邀请码校验失败')
    }
  } catch {
    ElMessage.error('激活失败，请稍后重试')
  } finally {
    oidcLoading.value = false
  }
}

function cancelOidcPending() {
  oidcPendingToken.value = ''
  oidcPendingName.value = ''
  inviteCode.value = ''
  const restQuery = { ...route.query }
  delete restQuery.oidcPending
  delete restQuery.oidcName
  void router.replace({ path: '/login', query: restQuery })
}

function toPocketIdLogin() {
  oidcLoading.value = true
  const from = resolveReturnTo(route.query.from)
  window.location.href = buildPocketIdLoginUrl(from)
}

function toggleMode() {
  isRegister.value = !isRegister.value
  if (isRegister.value && bootstrapRequired.value && !username.value) {
    username.value = 'chery'
  }
}

onMounted(async () => {
  try {
    const cfgRes = await requestPocketIdConfig().sync
    if (cfgRes.status && cfgRes.data) {
      bootstrapRequired.value = Boolean(cfgRes.data.bootstrapRequired)
    }
  } catch {
    // 忽略配置探测异常
  }

  const oidcError = route.query.oidcError
  if (oidcError && typeof oidcError === 'string') {
    ElMessage.error(oidcError)
    const restQuery = { ...route.query }
    delete restQuery.oidcError
    await router.replace({ path: '/login', query: restQuery })
    return
  }

  const pending = route.query.oidcPending
  if (pending && typeof pending === 'string') {
    oidcPendingToken.value = pending
    oidcPendingName.value = typeof route.query.oidcName === 'string' ? route.query.oidcName : ''
    return
  }

  const oidcCode = route.query.oidcCode
  if (oidcCode && typeof oidcCode === 'string') {
    oidcLoading.value = true
    try {
      const res = await requestPocketIdExchange(oidcCode).sync
      if (res.status && res.data) {
        resetToken(res.data)
        userStore.updateUserInfo(res.data.user)
        ElMessage.success('Pocket ID 登录成功')
        const target = res.data.returnTo || resolveReturnTo(route.query.from)
        await router.replace({ path: target })
      } else {
        ElMessage.error(res.msg || 'Pocket ID 登录失败')
      }
    } catch {
      ElMessage.error('Pocket ID 登录验证失败，请重试')
    } finally {
      oidcLoading.value = false
    }
  }
})
</script>

<template>
  <div class="login-container">
    <div v-if="oidcPendingToken" class="login-card">
      <div class="login-header">
        <h1 class="login-title">激活 Pocket ID 账号</h1>
        <p class="login-subtitle">
          欢迎 {{ oidcPendingName || '新用户' }}，首次登录本系统需验证管理员（chery）生成的邀请码
        </p>
      </div>

      <div class="login-form">
        <el-input
          v-model="inviteCode"
          placeholder="请输入邀请码（如 CHX-XXXXXXXX）"
          @keydown.enter="handleOidcPendingActivate"
        />
        <el-button
          type="primary"
          class="submit-btn"
          :loading="oidcLoading"
          @click="handleOidcPendingActivate"
        >
          验证邀请码并完成登录
        </el-button>
      </div>

      <div class="login-footer">
        <button type="button" class="mode-switch" @click="cancelOidcPending">
          返回登录页
        </button>
      </div>
    </div>

    <div v-else class="login-card">
      <div class="login-header">
        <h1 class="login-title">{{ isRegister ? '凭邀请码注册账号' : '登录系统' }}</h1>
        <p class="login-subtitle">
          {{
            isRegister
              ? '需使用管理员 chery 生成的邀请码注册（同名自动关联 Pocket ID）'
              : '支持本地账号密码与 Pocket ID 统一认证'
          }}
        </p>
      </div>

      <div v-if="bootstrapRequired" class="bootstrap-banner">
        系统尚未创建管理员账号：可先切换到注册创建 <strong>chery</strong> 管理员（免邀请码），登录后在顶栏「管理后台」配置 Pocket ID 与生成邀请码。
      </div>

      <div class="login-form">
        <el-input
          v-model="username"
          placeholder="用户名"
          autocomplete="username"
          @keydown.enter="handleSubmit"
        />
        <el-input
          v-if="isRegister"
          v-model="displayName"
          placeholder="显示名称（选填）"
          autocomplete="name"
          @keydown.enter="handleSubmit"
        />
        <el-input
          v-model="password"
          placeholder="密码"
          type="password"
          show-password
          autocomplete="current-password"
          @keydown.enter="handleSubmit"
        />
        <el-input
          v-if="isRegister && !isBootstrapChery"
          v-model="inviteCode"
          placeholder="管理员邀请码（必填，如 CHX-XXXXXXXX）"
          @keydown.enter="handleSubmit"
        />
        <el-button type="primary" class="submit-btn" :loading="loading" @click="handleSubmit">
          {{ isRegister ? (isBootstrapChery ? '初始化 chery 管理员' : '凭邀请码注册并登录') : '账号密码登录' }}
        </el-button>
      </div>

      <div class="divider">
        <span>或</span>
      </div>

      <el-button class="pocket-id-btn" :loading="oidcLoading" @click="toPocketIdLogin">
        使用 Pocket ID 登录
      </el-button>

      <div class="login-footer">
        <button type="button" class="mode-switch" @click="toggleMode">
          {{ isRegister ? '已有账号？去登录' : '有邀请码？凭邀请码注册账号' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 82vh;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 360px;
  padding: 28px 24px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.login-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.login-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.bootstrap-banner {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.submit-btn,
.pocket-id-btn {
  width: 100%;
  margin-left: 0 !important;
}

.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-muted);
  font-size: 12px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.login-footer {
  display: flex;
  justify-content: center;
}

.mode-switch {
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
}

.mode-switch:hover {
  color: var(--color-accent);
}
</style>

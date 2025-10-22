<script setup lang="ts">
import serve from '@/api'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { aesEncrypt } from '@/utils/hashers'
import { useRouter } from 'vue-router'
import { resetToken } from '@/api/middleware/token'
import { decode } from '@/utils/common'
// --------------------------- config -------------------------------
defineOptions({ name: 'loginView' })
// ---------------------------- data --------------------------------
const username = ref('')
const password = ref('')
const loading = ref(false)
const router = useRouter()
// -------------------------- computed ------------------------------
// --------------------------- methods ------------------------------
async function toLogin() {
  if (!username.value || !password.value) {
    ElMessage.error('用户名或密码不能为空')
    return
  }
  loading.value = true
  try {
    const codeRes = await serve<{
      data: { key: string; value: string }
    }>('/verifycode', 'GET').sync
    const uname = aesEncrypt(username.value, codeRes.data.value)
    const pwd = aesEncrypt(password.value, codeRes.data.value)
    const res = await serve('/login', {
      username: uname,
      password: pwd,
      verifyCodeKey: codeRes.data.key
    }).sync
    if (res.status) {
      ElMessage.success('登录成功')
      localStorage.setItem('accessToken', res.data.accessToken)
      localStorage.setItem('refreshToken', res.data.refreshToken)
      resetToken()
      const str = router.currentRoute.value.query.from
      let from = '/'
      if (str && typeof str === 'string') {
        from = decode(str)
      }
      console.log('from', from)
      router.push({ path: from })
    }
  } catch (error) {
    ElMessage.error('登录失败')
  }
  loading.value = false
}
// ---------------------------- watch -------------------------------
// ---------------------------- life --------------------------------
// --------------------------- other --------------------------------
</script>

<template>
  <div class="login-container">
    <el-input v-model="username" style="width: 240px" placeholder="用户名" @keydown.enter="toLogin" />
    <el-input
      v-model="password"
      style="width: 240px"
      placeholder="密码"
      type="password"
      show-password
      @keydown.enter="toLogin"
    />
    <el-button type="primary" @click="toLogin" :loading="loading">登录</el-button>
  </div>
</template>

<style lang="less" scoped>
.login-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
  height: 80vh;
}
</style>

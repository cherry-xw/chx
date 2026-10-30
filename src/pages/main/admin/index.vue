<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { ElButton, ElInput, ElMessage } from 'element-plus'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/message/style/css'
import { useUserInfoStore } from '@/stores/counter'
import {
  requestAdminInviteCodes,
  requestAdminPocketIdSettings,
  requestCreateInviteCode,
  requestDeleteInviteCode,
  requestSaveAdminPocketIdSettings,
  type InviteCodeItem
} from '@/api/auth'

defineOptions({ name: 'adminView' })

const router = useRouter()
const userStore = useUserInfoStore()
const { userInfo } = storeToRefs(userStore)

const isAdmin = computed(
  () =>
    Boolean(userInfo.value?.isAdmin) ||
    String(userInfo.value?.username || userInfo.value?.userName || '')
      .trim()
      .toLowerCase() === 'chery'
)

// 邀请码状态
const inviteCodes = ref<InviteCodeItem[]>([])
const inviteLoading = ref(false)
const createInviteLoading = ref(false)
const inviteNote = ref('')
const inviteDays = ref(7)

// Pocket ID 配置状态
const oidcLoading = ref(false)
const oidcSaving = ref(false)
const oidcEnabled = ref(false)
const hasClientSecret = ref(false)
const oidcForm = ref({
  issuer: '',
  clientId: '',
  clientSecret: '',
  redirectUri: `${window.location.origin}/api/auth/pocket-id/callback`,
  scopes: 'openid profile email'
})

function formatTime(ts: number | null): string {
  if (!ts) return '-'
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function copyText(text: string, label = '已复制到剪贴板') {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(label)
  } catch {
    ElMessage.info(`请手动复制：${text}`)
  }
}

async function loadInviteCodes() {
  if (!isAdmin.value) return
  inviteLoading.value = true
  try {
    const res = await requestAdminInviteCodes().sync
    if (res.status && Array.isArray(res.data)) {
      inviteCodes.value = res.data
    }
  } catch {
    ElMessage.error('获取邀请码列表失败')
  } finally {
    inviteLoading.value = false
  }
}

async function handleCreateInviteCode() {
  createInviteLoading.value = true
  try {
    const res = await requestCreateInviteCode({
      note: inviteNote.value.trim(),
      expiresInDays: inviteDays.value
    }).sync
    if (res.status && res.data) {
      inviteNote.value = ''
      inviteCodes.value = [res.data, ...inviteCodes.value]
      await copyText(res.data.code, `已生成并复制邀请码：${res.data.code}`)
    } else {
      ElMessage.error(res.msg || '生成邀请码失败')
    }
  } catch {
    ElMessage.error('生成邀请码失败')
  } finally {
    createInviteLoading.value = false
  }
}

async function handleDeleteInviteCode(code: string) {
  try {
    const res = await requestDeleteInviteCode(code).sync
    if (res.status) {
      inviteCodes.value = inviteCodes.value.filter((item) => item.code !== code)
      ElMessage.success('邀请码已作废删除')
    } else {
      ElMessage.error(res.msg || '删除失败')
    }
  } catch {
    ElMessage.error('删除邀请码失败')
  }
}

async function loadPocketIdSettings() {
  if (!isAdmin.value) return
  oidcLoading.value = true
  try {
    const res = await requestAdminPocketIdSettings().sync
    if (res.status && res.data) {
      oidcEnabled.value = res.data.enabled
      hasClientSecret.value = res.data.hasClientSecret
      oidcForm.value = {
        issuer: res.data.issuer || '',
        clientId: res.data.clientId || '',
        clientSecret: '',
        redirectUri:
          res.data.redirectUri || `${window.location.origin}/api/auth/pocket-id/callback`,
        scopes: res.data.scopes || 'openid profile email'
      }
    }
  } catch {
    ElMessage.error('获取 Pocket ID 配置失败')
  } finally {
    oidcLoading.value = false
  }
}

async function handleSavePocketId() {
  oidcSaving.value = true
  try {
    const res = await requestSaveAdminPocketIdSettings({
      issuer: oidcForm.value.issuer.trim(),
      clientId: oidcForm.value.clientId.trim(),
      clientSecret: oidcForm.value.clientSecret.trim() || undefined,
      redirectUri: oidcForm.value.redirectUri.trim(),
      scopes: oidcForm.value.scopes.trim() || 'openid profile email'
    }).sync
    if (res.status && res.data) {
      oidcEnabled.value = res.data.enabled
      hasClientSecret.value = res.data.hasClientSecret
      oidcForm.value.clientSecret = ''
      ElMessage.success('Pocket ID 配置已保存并立即生效')
    } else {
      ElMessage.error(res.msg || '保存失败')
    }
  } catch {
    ElMessage.error('保存 Pocket ID 配置失败')
  } finally {
    oidcSaving.value = false
  }
}

onMounted(() => {
  if (isAdmin.value) {
    void loadInviteCodes()
    void loadPocketIdSettings()
  }
})
</script>

<template>
  <div class="admin-page">
    <div v-if="!isAdmin" class="admin-Forbidden">
      <h2>无访问权限</h2>
      <p>当前页面为管理员（chery）专用管理后台，请使用 chery 账号登录。</p>
      <el-button type="primary" @click="router.push('/login')">前往登录</el-button>
    </div>

    <div v-else class="admin-grid">
      <!-- 模块 1：邀请码生成与管理 -->
      <section class="admin-panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">注册邀请码管理</h2>
            <p class="panel-desc">
              系统已禁止随意注册，新用户（本地注册或陌生 Pocket ID 首次激活）必须凭有效邀请码注册，单次使用后即失效。
            </p>
          </div>
          <el-button size="small" :loading="inviteLoading" @click="loadInviteCodes">刷新</el-button>
        </div>

        <div class="invite-create-bar">
          <el-input
            v-model="inviteNote"
            placeholder="备注说明（选填，例如：给某同事注册）"
            class="note-input"
            @keydown.enter="handleCreateInviteCode"
          />
          <select v-model.number="inviteDays" class="days-select" aria-label="邀请码有效天数">
            <option :value="1">有效期 1 天</option>
            <option :value="7">有效期 7 天</option>
            <option :value="30">有效期 30 天</option>
          </select>
          <el-button
            type="primary"
            :loading="createInviteLoading"
            @click="handleCreateInviteCode"
          >
            生成并复制邀请码
          </el-button>
        </div>

        <div class="invite-table-wrap">
          <table class="invite-table">
            <thead>
              <tr>
                <th>邀请码</th>
                <th>状态</th>
                <th>备注</th>
                <th>使用者</th>
                <th>创建时间</th>
                <th>过期时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="inviteCodes.length === 0">
                <td colspan="7" class="empty-cell">暂无邀请码，点击上方按钮即可生成</td>
              </tr>
              <tr v-for="item in inviteCodes" :key="item.code">
                <td class="code-cell">
                  <code>{{ item.code }}</code>
                </td>
                <td>
                  <span :class="['status-badge', `status-${item.status}`]">
                    {{
                      item.status === 'active'
                        ? '可用'
                        : item.status === 'used'
                          ? '已使用'
                          : '已过期'
                    }}
                  </span>
                </td>
                <td>{{ item.note || '-' }}</td>
                <td>{{ item.usedByUsername || '-' }}</td>
                <td>{{ formatTime(item.createdAt) }}</td>
                <td>{{ formatTime(item.expiresAt) }}</td>
                <td class="action-cell">
                  <button
                    type="button"
                    class="link-btn"
                    @click="copyText(item.code, `已复制邀请码 ${item.code}`)"
                  >
                    复制
                  </button>
                  <button
                    v-if="item.status !== 'used'"
                    type="button"
                    class="link-btn danger"
                    @click="handleDeleteInviteCode(item.code)"
                  >
                    作废
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 模块 2：Pocket ID OIDC 在线配置与多用户关联说明 -->
      <section class="admin-panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">
              Pocket ID 统一认证配置
              <span :class="['status-badge', oidcEnabled ? 'status-active' : 'status-expired']">
                {{ oidcEnabled ? '已启用' : '未配置' }}
              </span>
            </h2>
            <p class="panel-desc">
              保存后直接写入 SQLite 数据库并立即生效，无需重启后端服务。
            </p>
          </div>
        </div>

        <div class="rule-box">
          <strong>Pocket ID 与多用户系统关联规则：</strong>
          <ul>
            <li>
              <strong>管理员与同名合并</strong>：当你在 Pocket ID 中使用 <code>chery</code>（或本地已存在的同名/同邮箱账号）登录时，系统会自动将该 Pocket ID 身份合并绑定到已有的本地账号（共享同一用户 ID 与数据）。
            </li>
            <li>
              <strong>陌生新用户受控激活</strong>：未在本地注册过的其他 Pocket ID 用户首次登录时，系统会拦截并要求输入上方生成的邀请码，验证通过后自动创建独立本地账号并完成绑定。
            </li>
          </ul>
        </div>

        <div class="oidc-form">
          <label class="form-item">
            <span class="form-label">Pocket ID 服务地址 (Issuer URL)</span>
            <el-input
              v-model="oidcForm.issuer"
              placeholder="例如：https://id.xcherry.top"
            />
          </label>

          <label class="form-item">
            <span class="form-label">Client ID</span>
            <el-input
              v-model="oidcForm.clientId"
              placeholder="在 Pocket ID 后台创建的 OIDC Client ID"
            />
          </label>

          <label class="form-item">
            <span class="form-label">
              Client Secret
              <small v-if="hasClientSecret" class="secret-hint">（当前已保存密钥，留空则保持原密钥不变）</small>
            </span>
            <el-input
              v-model="oidcForm.clientSecret"
              type="password"
              show-password
              :placeholder="hasClientSecret ? '已保存，如需更换请输入新密钥' : '请输入 OIDC Client Secret（Public Client 可留空）'"
            />
          </label>

          <label class="form-item">
            <span class="form-label">
              回调地址 (Callback / Redirect URI — 请填入 Pocket ID 后台)
            </span>
            <div class="inline-row">
              <el-input v-model="oidcForm.redirectUri" />
              <el-button @click="copyText(oidcForm.redirectUri, '已复制回调地址')">
                复制回调地址
              </el-button>
            </div>
          </label>

          <label class="form-item">
            <span class="form-label">授权范围 (Scopes)</span>
            <el-input v-model="oidcForm.scopes" placeholder="openid profile email" />
          </label>

          <div class="form-actions">
            <el-button type="primary" :loading="oidcSaving" @click="handleSavePocketId">
              保存 Pocket ID 配置并立即生效
            </el-button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  padding: 20px;
  max-width: 1180px;
  margin: 0 auto;
}

.admin-Forbidden {
  padding: 40px 24px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  text-align: center;
}

.admin-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.admin-panel {
  padding: 20px 24px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.invite-create-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.note-input {
  flex: 1;
  min-width: 220px;
}

.days-select {
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 13px;
}

.invite-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.invite-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

.invite-table th,
.invite-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  white-space: nowrap;
}

.invite-table th {
  background: var(--color-background);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.code-cell code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  color: var(--color-accent);
}

.empty-cell {
  text-align: center;
  color: var(--color-text-muted);
  padding: 24px !important;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  border: 1px solid var(--color-border);
}

.status-active {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.status-used {
  color: var(--color-text-secondary);
}

.status-expired {
  color: var(--color-text-muted);
}

.action-cell {
  display: flex;
  gap: 10px;
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--color-accent);
  cursor: pointer;
  padding: 0;
  font-size: 12px;
}

.link-btn.danger {
  color: #f56c6c;
}

.rule-box {
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.rule-box ul {
  margin: 6px 0 0;
  padding-left: 18px;
}

.oidc-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  color: var(--color-text);
  font-weight: 500;
}

.secret-hint {
  color: var(--color-text-secondary);
  font-weight: 400;
}

.inline-row {
  display: flex;
  gap: 8px;
}

.form-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 4px;
}
</style>

<!-- 管理面包屑和用户设置 -->
<script lang="ts">
export default { name: 'HeaderView' }
import { useNavStore, type NavTreeSingleNode } from '@/stores/nav'
import { nanoid } from 'nanoid'
import { onMounted } from 'vue'
import { watch } from 'vue'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Sunny, Moon } from '@element-plus/icons-vue'
import { useModeStore } from '@/stores/counter'
// import { setToken } from '@/api/tokenManager'
import serve from '@/api'
import { ElMessage } from 'element-plus'
function getPath(data: NavTreeSingleNode): {
  key: string
  label: string
}[] {
  if (data.parent) {
    return [
      ...getPath(data.parent),
      {
        key: nanoid(),
        label: data.label
      }
    ]
  }
  return [
    {
      key: nanoid(),
      label: data.label
    }
  ]
}
</script>

<script setup lang="ts">
import { useUserInfoStore } from '@/stores/counter'
// ---------------------------- prop --------------------------------
// ---------------------------- state -------------------------------
const route = useRoute()
const router = useRouter()
// ---------------------------- data --------------------------------
const { userInfo, updateUserInfo } = useUserInfoStore()
const { name2Nav } = useNavStore()
const list = ref<
  {
    key: string
    label: string
  }[]
>([])
const styleMode = ref(true)
const { switchMode } = useModeStore()
// --------------------------- methods ------------------------------
async function loginout() {
  await serve('/logout').sync
  // setToken('')
  updateUserInfo()
  router.push(`/login?from=${route.path}`)
  ElMessage.success('登出成功')
}
// ---------------------------- watch -------------------------------
watch(
  () => route.path,
  () => {
    if (typeof route.name === 'string') {
      list.value = getPath(name2Nav[route.name])
    }
  }
)
watch(
  styleMode,
  (md) => {
    switchMode(md ? 'dark' : 'light')
    document.documentElement.setAttribute('class', md ? 'dark' : 'light')
  },
  { immediate: true }
)
// -------------------------- computed ------------------------------
// ---------------------------- life --------------------------------
onMounted(() => {
  if (typeof route.name === 'string') {
    // console.log(name2Nav[route.name], route.name, name2Nav)
    list.value = getPath(name2Nav[route.name])
  }
})
</script>

<template>
  <div class="ttl-view-container flex flex-row items-center">
    <!-- <el-breadcrumb class="flex-1" separator="/">
      <el-breadcrumb-item
        v-for="(item, index) in list"
        :key="item.key"
        :class="{ 'last-item': index === list.length - 1 }"
        >{{ item.label }}</el-breadcrumb-item
      >
    </el-breadcrumb> -->
    <div class="flex-1"></div>
    <el-switch
      v-model="styleMode"
      inline-prompt
      :active-action-icon="Sunny"
      :inactive-action-icon="Moon"
      style="--el-switch-on-color: #444; --el-switch-off-color: #ccc"
    />
    <el-popover
      v-if="userInfo"
      popper-class="header-popover"
      placement="bottom-start"
      :width="100"
      trigger="hover"
    >
      <div class="logout-button" @click="loginout">登出</div>
      <template #reference>
        <div class="flex flex-row items-center">
          <div class="user-avatar"></div>
          <div class="user-info">{{ userInfo?.name ?? '用户名' }}</div>
        </div>
      </template>
    </el-popover>
  </div>
</template>

<style lang="less" scoped>
.ttl-view-container {
  height: 64px;
  padding: 0 16px;
  border-bottom: 1px dashed var(--el-border-color);

  .last-item {
    :deep(.el-breadcrumb__inner) {
      border: none;
    }
  }
  .user-avatar {
    width: 32px;
    height: 32px;
    margin: 0 8px;
    background: url(./icon/avatar.svg) center / 100% no-repeat;
    border-radius: 50%;
  }
  .user-info {
    color: var(--el-text-color-primary);
    font-size: 14px;
    margin-right: 12px;
    cursor: pointer;
  }
}
</style>

<style lang="less">
.header-popover {
  min-width: 100px !important;
  .logout-button {
    color: var(--el-text-color-primary);
    font-size: 14px;
    text-align: center;
    cursor: pointer;
  }
}
</style>

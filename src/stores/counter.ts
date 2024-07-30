import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useModeStore = defineStore('counter', () => {
  const mode = ref<'light' | 'dark'>('light')
  function switchMode(md?: 'light' | 'dark') {
    if (md) {
      mode.value = md
    } else {
      mode.value = mode.value === 'light' ? 'dark' : 'light'
    }
  }
  return { mode, switchMode }
})

export const useUserInfoStore = defineStore('userInfo', () => {
  type UserInfo = {
    company: string
    createTime: string
    department: string
    email: string
    id: string
    isDelete: number
    mobile: string
    name: string
    password: string
    position: string
    roleLevel: number
    state: number
    token: string
    updateTime: string
    userName: string
  }
  const str = localStorage.getItem('backend-ui') || undefined
  let ui: UserInfo | undefined = undefined
  if (str) {
    ui = JSON.parse(str)
  }
  const userInfo = ref<UserInfo | undefined>(ui)
  function updateUserInfo(info?: UserInfo) {
    userInfo.value = info
    localStorage.setItem('backend-ui', JSON.stringify(info || {}))
  }
  return { userInfo, updateUserInfo }
})

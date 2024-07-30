import { reactive } from 'vue'
import { defineStore } from 'pinia'
import { recursion } from '@/utils/common'
import { nanoid } from 'nanoid'

type noKeyNav = {
  icon?: string // 目录树图标
  label: string // 名称
  name: string // path name
  focus: boolean // 左侧目录树高亮状态
  secondConfirmation?: boolean | (() => boolean) // 页签关闭两步验证
  parent?: noKeyNav // 节点父级
  children?: noKeyNav[] // 节点子集
}
export type NavTreeSingleNode = Omit<noKeyNav, 'parent' | 'children'> & {
  key: string
  children?: NavTreeSingleNode[]
  parent?: NavTreeSingleNode
}

const navOrigin: noKeyNav[] = [
  {
    label: '主页',
    name: 'navigation',
    icon: 'HomeFilled',
    focus: false
  },
  {
    label: '博客',
    name: 'blog',
    icon: 'Notebook',
    focus: false
  }
  // {
  //   label: '客户管理',
  //   name: '',
  //   icon: 'client-management',
  //   focus: false,
  //   children: [
  //     { label: '部署客户', focus: false, name: 'deploymentClient' },
  //     { label: 'API服务客户', focus: false, name: 'APIServerClient' },
  //     { label: 'SAAS在线对接', focus: false, name: 'SAASOnlineDocking' },
  //     { label: '正式客户清单', focus: false, name: 'officialCustomerList' },
  //     { label: '客户需求管理', focus: false, name: 'customerDemandManagement' },
  //     { label: '客户拜访清单', focus: false, name: 'customerVisitList' }
  //   ]
  // },
  // {
  //   label: '运营管理',
  //   name: '',
  //   icon: 'operations-management',
  //   focus: false,
  //   children: [
  //     {
  //       label: '版本管理',
  //       name: '',
  //       focus: false,
  //       children: [
  //         { label: 'SAAS管理', focus: false, name: 'SAASManage' },
  //         { label: 'APP管理', focus: false, name: 'APPManage' }
  //       ]
  //     },
  //     {
  //       label: '帮助中心',
  //       name: '',
  //       focus: false,
  //       children: [
  //         { label: '更新说明', focus: false, name: 'changelog' },
  //         { label: '快速上手', focus: false, name: 'quickStart' }
  //       ]
  //     },
  //     {
  //       label: "广告管理",
  //       name: '',
  //       focus: false,
  //       children: [
  //         { label: '广告列表', focus: false, name: 'advertisementList' },
  //       ]
  //     }
  //   ]
  // },
  // {
  //   label: '系统管理',
  //   name: '',
  //   icon: 'system-management',
  //   focus: false,
  //   children: [
  //     { label: '登录日志', focus: false, name: 'loginLog' },
  //     { label: '操作日志', focus: false, name: 'operateLog' },
  //     { label: '用户管理', focus: false, name: 'userManagement' }
  //   ]
  // }
]
export const useNavStore = defineStore('nav', () => {
  const nav = reactive(navOrigin)
  const name2Nav = reactive<Record<string, NavTreeSingleNode>>({})

  recursion(nav as NavTreeSingleNode[], 'children', (node, parent) => {
    node.key = nanoid()
    node.parent = parent
    name2Nav[node.name] = node
  })

  function useSecondConfirmation(name: string, state: boolean | (() => boolean)) {
    const nav = name2Nav[name]
    if (nav) {
      nav.secondConfirmation = state
    }
  }
  return { nav, name2Nav, useSecondConfirmation }
})

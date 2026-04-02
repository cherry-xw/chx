import { reactive } from 'vue'
import { defineStore } from 'pinia'
import { recursion } from '@/utils/common'
import { nanoid } from 'nanoid'

type noKeyNav = {
  icon?: string // 目录树图标(https://element-plus.org/zh-CN/component/icon)
  label: string // 名称
  name: string // path name
  focus: boolean // 左侧目录树高亮状态
  secondConfirmation?: boolean | (() => boolean) // 页签关闭两步验证
  parent?: noKeyNav // 节点父级
  dir?: boolean // 是否为目录
  children?: noKeyNav[] // 节点子集
  blank?: boolean // 是否新标签页打开
}
export type NavTreeSingleNode = Omit<noKeyNav, 'parent' | 'children'> & {
  key: string
  children?: NavTreeSingleNode[]
  parent?: NavTreeSingleNode
}

const navOrigin: noKeyNav[] = [
  {
    label: 'chx',
    name: 'entrance',
    icon: 'HomeFilled',
    focus: false
  },
  {
    label: 'IOT',
    name: "iot",
    icon: "Cpu",
    dir: true,
    focus: false,
    children: [
      {
        label: 'MQTT',
        name: 'mqtt',
        icon: 'Collection',
        focus: false
      }
    ]
  },
  {
    label: '学习',
    name: 'study',
    icon: 'Reading',
    dir: true,
    focus: false,
    children: [
      {
        label: '博客',
        name: 'blog',
        icon: 'Collection',
        focus: false
      },
      {
        label: '小笔记',
        name: 'https://www.notion.so/9f7e0ec81670455ab42394dbae2fbf87?v=ad19923dc2724000a4fa428a8e09ad27',
        icon: 'Notebook',
        focus: false,
        blank: true
      }
    ]
  },
  {
    label: 'AI',
    name: 'ai',
    icon: 'MagicStick',
    dir: true,
    focus: false,
    children: [
      {
        label: '工作流',
        name: 'workflow',
        icon: 'Connection',
        focus: false
      }
    ]
  },
  {
    label: '练习',
    name: 'practice',
    icon: 'EditPen',
    dir: true,
    focus: false,
    children: [
      {
        label: '绘图1',
        name: 'draw',
        icon: 'Picture',
        focus: false
      },
      {
        label: '绘图2',
        name: 'navigation',
        icon: 'Picture',
        focus: false
      }
    ]
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

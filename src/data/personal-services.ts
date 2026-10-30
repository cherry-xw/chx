export const serviceCategories = [
  { id: 'security', name: '安全', caption: '密码与凭据' },
  { id: 'network', name: '网络与代理', caption: '订阅转换、内核与代理面板' },
  { id: 'ai', name: 'AI 服务', caption: 'AI 服务与管理面板' },
  { id: 'media', name: '媒体', caption: '影音库与直播' },
  { id: 'downloads', name: '下载', caption: 'BT 与离线下载' },
  { id: 'devops', name: '开发与运维', caption: '网页 IDE 与主机管理' },
  { id: 'remote-desktop', name: '远程桌面', caption: '长期与临时桌面' },
  { id: 'smart-home', name: '智能家居', caption: '灯光、空调与自动化' },
  { id: 'devices', name: '通讯与硬件', caption: '机器人面板与打印设备' }
] as const satisfies ReadonlyArray<{ id: string; name: string; caption: string }>

export type ServiceCategoryId = (typeof serviceCategories)[number]['id']

export interface PersonalService {
  name: string
  icon: string
  category: ServiceCategoryId
  description: string
  port: number
  lan: boolean
  vpn: boolean
  domainUrl?: string
  path?: string
  https?: boolean
  lanHost?: string
  vpnHost?: string
}

export interface ServiceLink {
  label: string
  url: string
}

// 迁入本机 80 端口服务导航；地址按服务原有的网络入口维护。
export const LAN_HOST = '192.168.68.164'
export const VPN_HOST = '10.2.3.6'
export const personalServices: PersonalService[] = [
  {
    name: 'Bitwarden',
    icon: 'Lock',
    category: 'security',
    description: '密码管理器（Vaultwarden）',
    port: 6666,
    lan: false,
    vpn: false,
    domainUrl: 'https://www.xcherry.top/bit/'
  },
  {
    name: 'Home Assistant',
    icon: 'HomeFilled',
    category: 'smart-home',
    description: '智能家居控制台：灯、空调、自动化、场景',
    port: 8123,
    lan: true,
    vpn: true
  },
  {
    name: 'SubBoost',
    icon: 'Switch',
    category: 'network',
    description: 'Clash 订阅转换 / 聚合管理',
    port: 3000,
    lan: true,
    vpn: true
  },
  {
    name: 'Jellyfin',
    icon: 'Film',
    category: 'media',
    description: '媒体服务器：电影 / 剧集 / 音乐 / 直播',
    port: 8096,
    lan: true,
    vpn: true
  },
  {
    name: 'qBittorrent',
    icon: 'Download',
    category: 'downloads',
    description: 'BT 下载 WebUI',
    port: 8085,
    lan: true,
    vpn: true
  },
  {
    name: 'AriaNg',
    icon: 'Bottom',
    category: 'downloads',
    description: 'Aria2 下载前端（AriaNg）',
    port: 6880,
    lan: true,
    vpn: true
  },
  {
    name: 'code-server',
    icon: 'Monitor',
    category: 'devops',
    description: '网页版 VS Code',
    port: 8848,
    lan: true,
    vpn: true
  },
  {
    name: 'Hermes Dashboard',
    icon: 'Cpu',
    category: 'ai',
    description: 'Hermes AI 服务面板',
    port: 9119,
    lan: true,
    vpn: true,
    domainUrl: 'https://hermes.xcherry.top/'
  },
  {
    name: 'manager',
    icon: 'Monitor',
    category: 'ai',
    description: 'manager Web 管理面板',
    port: 39980,
    lan: true,
    vpn: true
  },
  {
    name: 'NapCat QQ',
    icon: 'Connection',
    category: 'devices',
    description: 'NapCat QQ Web 管理面板',
    port: 6099,
    lan: true,
    vpn: true
  },
  {
    name: 'mihomo 面板',
    icon: 'Connection',
    category: 'network',
    description: 'Clash 内核管理面板（metacubexd）',
    port: 9090,
    path: '/ui/',
    lan: true,
    vpn: true
  },
  {
    name: 'KDE 桌面',
    icon: 'Monitor',
    category: 'remote-desktop',
    description: '长期运行桌面（webtop-kde，重启自动拉起）',
    port: 443,
    path: '/kde/',
    lan: true,
    vpn: true,
    https: true,
    domainUrl: 'https://www.xcherry.top/kde/'
  },
  {
    name: '临时桌面',
    icon: 'Timer',
    category: 'remote-desktop',
    description: '按需临时桌面（KDE，空闲 10 分钟自动销毁）',
    port: 443,
    path: '/temp/kde/',
    lan: true,
    vpn: true,
    https: true,
    domainUrl: 'https://www.xcherry.top/temp/kde/'
  },
  {
    name: '打印机',
    icon: 'Printer',
    category: 'devices',
    description: '3D 打印机 Web 界面（Mainsail）',
    port: 80,
    lan: true,
    vpn: true,
    lanHost: '192.168.68.235',
    vpnHost: '10.2.3.13'
  }
]

export function serviceLinks(service: PersonalService): ServiceLink[] {
  const links: ServiceLink[] = []
  if (service.domainUrl) links.push({ label: '外网直达', url: service.domainUrl })
  const protocol = service.https ? 'https' : 'http'
  const port = service.https && service.port === 443 ? '' : `:${service.port}`
  const path = service.path || '/'
  if (service.vpn)
    links.push({
      label: '隧道打开',
      url: `${protocol}://${service.vpnHost || VPN_HOST}${port}${path}`
    })
  if (service.lan)
    links.push({
      label: '局域网打开',
      url: `${protocol}://${service.lanHost || LAN_HOST}${port}${path}`
    })
  return links
}

export interface PersonalService {
  name: string
  icon: string
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
    description: '密码管理器（Vaultwarden）',
    port: 6666,
    lan: false,
    vpn: false,
    domainUrl: 'https://www.xcherry.top/bit/'
  },
  {
    name: 'Home Assistant',
    icon: 'HomeFilled',
    description: '智能家居控制台：灯、空调、自动化、场景',
    port: 8123,
    lan: true,
    vpn: true
  },
  {
    name: 'SubBoost',
    icon: 'Switch',
    description: 'Clash 订阅转换 / 聚合管理',
    port: 3000,
    lan: true,
    vpn: true
  },
  {
    name: 'Jellyfin',
    icon: 'Film',
    description: '媒体服务器：电影 / 剧集 / 音乐 / 直播',
    port: 8096,
    lan: true,
    vpn: true
  },
  {
    name: 'qBittorrent',
    icon: 'Download',
    description: 'BT 下载 WebUI',
    port: 8085,
    lan: true,
    vpn: true
  },
  {
    name: 'AriaNg',
    icon: 'Bottom',
    description: 'Aria2 下载前端（AriaNg）',
    port: 6880,
    lan: true,
    vpn: true
  },
  {
    name: 'code-server',
    icon: 'Monitor',
    description: '网页版 VS Code',
    port: 8848,
    lan: true,
    vpn: true
  },
  {
    name: 'Hermes Dashboard',
    icon: 'Cpu',
    description: 'Hermes 代理管理面板',
    port: 9119,
    lan: true,
    vpn: true,
    domainUrl: 'https://www.xcherry.top:9119/'
  },
  {
    name: 'mihomo 面板',
    icon: 'Connection',
    description: 'Clash 内核管理面板（metacubexd）',
    port: 9090,
    path: '/ui/',
    lan: true,
    vpn: true
  },
  {
    name: 'WebSSH2',
    icon: 'Platform',
    description: '浏览器 SSH 客户端（WebSSH2）',
    port: 2222,
    path: '/ssh/',
    lan: true,
    vpn: true,
    domainUrl: 'https://www.xcherry.top/ssh/'
  },
  {
    name: 'KDE 桌面',
    icon: 'Monitor',
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

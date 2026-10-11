export interface SearchEngine {
  id: string
  name: string
  group: '综合搜索' | '视频平台' | '开发工具'
  url: string
}

export const searchEngines: SearchEngine[] = [
  { id: 'bing', name: '必应', group: '综合搜索', url: 'https://cn.bing.com/search?q=' },
  { id: 'google', name: 'Google', group: '综合搜索', url: 'https://www.google.com/search?q=' },
  { id: 'baidu', name: '百度', group: '综合搜索', url: 'https://www.baidu.com/s?wd=' },
  { id: 'duckduckgo', name: 'DuckDuckGo', group: '综合搜索', url: 'https://duckduckgo.com/?q=' },
  {
    id: 'bilibili',
    name: '哔哩哔哩',
    group: '视频平台',
    url: 'https://search.bilibili.com/all?keyword='
  },
  {
    id: 'youtube',
    name: 'YouTube',
    group: '视频平台',
    url: 'https://www.youtube.com/results?search_query='
  },
  { id: 'youku', name: '优酷', group: '视频平台', url: 'https://so.youku.com/search_video/q_' },
  { id: 'iqiyi', name: '爱奇艺', group: '视频平台', url: 'https://so.iqiyi.com/so/q_' },
  { id: 'tencent', name: '腾讯视频', group: '视频平台', url: 'https://v.qq.com/x/search/?q=' },
  { id: 'douyin', name: '抖音', group: '视频平台', url: 'https://www.douyin.com/search/' },
  {
    id: 'kuaishou',
    name: '快手',
    group: '视频平台',
    url: 'https://www.kuaishou.com/search/video/?keyword='
  },
  {
    id: 'weibo',
    name: '微博视频',
    group: '视频平台',
    url: 'https://video.weibo.com/show?mod=page&keyword='
  },
  { id: 'mango', name: '芒果 TV', group: '视频平台', url: 'https://search.mgtv.com/mgtv?wd=' },
  { id: 'github', name: 'GitHub', group: '开发工具', url: 'https://github.com/search?q=' },
  {
    id: 'stackoverflow',
    name: 'Stack Overflow',
    group: '开发工具',
    url: 'https://stackoverflow.com/search?q='
  },
  { id: 'npm', name: 'npm', group: '开发工具', url: 'https://www.npmjs.com/search?q=' }
]

export function buildSearchURL(engineId: string, keyword: string): string | null {
  const engine = searchEngines.find((item) => item.id === engineId)
  const query = keyword.trim()
  return engine && query ? engine.url + encodeURIComponent(query) : null
}

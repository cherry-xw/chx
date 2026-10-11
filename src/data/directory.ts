export interface DirectorySite {
  name: string
  description: string
  url: string
  mark: string
  color: string
}

export interface DirectoryCategory {
  id: string
  name: string
  caption: string
  icon:
    | 'community'
    | 'anime'
    | 'video'
    | 'search'
    | 'news'
    | 'manga'
    | 'art'
    | 'music'
    | 'game'
    | 'directory'
  sites: DirectorySite[]
}

export const directory: DirectoryCategory[] = [
  {
    id: 'acg',
    name: 'ACG 社区',
    caption: '找到同好，分享热爱',
    icon: 'community',
    sites: [
      {
        name: '哔哩哔哩',
        description: '你感兴趣的视频，都在这里',
        url: 'https://www.bilibili.com/',
        mark: '哔',
        color: '#df709a'
      },
      {
        name: 'AcFun',
        description: '认真你就赢了的弹幕社区',
        url: 'https://www.acfun.cn/',
        mark: 'A',
        color: '#e36a63'
      },
      {
        name: 'Bangumi',
        description: '记录、发现与讨论 ACG 作品',
        url: 'https://bgm.tv/',
        mark: 'B',
        color: '#df9856'
      },
      {
        name: 'pixiv',
        description: '插画、漫画与创作灵感',
        url: 'https://www.pixiv.net/',
        mark: 'P',
        color: '#409ad4'
      },
      {
        name: '萌娘百科',
        description: '万物皆可萌的 ACG 百科',
        url: 'https://zh.moegirl.org.cn/',
        mark: '萌',
        color: '#6ca05b'
      },
      {
        name: '米游社',
        description: '游戏资讯与玩家创作社区',
        url: 'https://www.miyoushe.com/',
        mark: '米',
        color: '#c18b42'
      }
    ]
  },
  {
    id: 'anime',
    name: '动漫番剧',
    caption: '下一部好故事，从这里开始',
    icon: 'anime',
    sites: [
      {
        name: '哔哩哔哩番剧',
        description: '新番时间表与经典动画',
        url: 'https://www.bilibili.com/anime/',
        mark: '番',
        color: '#df709a'
      },
      {
        name: '腾讯视频动漫',
        description: '国漫新作与热门连载',
        url: 'https://v.qq.com/channel/cartoon',
        mark: '腾',
        color: '#5791db'
      },
      {
        name: '爱奇艺动漫',
        description: '国漫、日漫与动画剧场',
        url: 'https://www.iqiyi.com/dongman/',
        mark: '奇',
        color: '#58a76c'
      },
      {
        name: '优酷动漫',
        description: '热血冒险与精选动画',
        url: 'https://www.youku.com/channel/webcomic',
        mark: '酷',
        color: '#4498c8'
      },
      {
        name: 'Crunchyroll',
        description: '动画流媒体与新番资讯',
        url: 'https://www.crunchyroll.com/',
        mark: 'C',
        color: '#d98042'
      },
      {
        name: 'MyAnimeList',
        description: '动画评分、榜单与片单',
        url: 'https://myanimelist.net/',
        mark: 'M',
        color: '#6684c7'
      }
    ]
  },
  {
    id: 'video',
    name: '视频平台',
    caption: '给自己留一点放映时间',
    icon: 'video',
    sites: [
      {
        name: 'YouTube',
        description: '探索世界各地的精彩视频',
        url: 'https://www.youtube.com/',
        mark: '▶',
        color: '#d96767'
      },
      {
        name: '腾讯视频',
        description: '热门剧集、电影与综艺',
        url: 'https://v.qq.com/',
        mark: '腾',
        color: '#5791db'
      },
      {
        name: '爱奇艺',
        description: '好故事，总有新发现',
        url: 'https://www.iqiyi.com/',
        mark: '奇',
        color: '#58a76c'
      },
      {
        name: '优酷',
        description: '剧集、综艺与人文纪实',
        url: 'https://www.youku.com/',
        mark: '酷',
        color: '#4498c8'
      },
      {
        name: '芒果 TV',
        description: '综艺、剧集与快乐日常',
        url: 'https://www.mgtv.com/',
        mark: '芒',
        color: '#d38c38'
      },
      {
        name: '抖音',
        description: '发现生活里的有趣瞬间',
        url: 'https://www.douyin.com/',
        mark: '抖',
        color: '#90819e'
      }
    ]
  },
  {
    id: 'search',
    name: '综合搜索',
    caption: '让每一个好奇，都有回音',
    icon: 'search',
    sites: [
      {
        name: '必应',
        description: '网页、图片与更多答案',
        url: 'https://cn.bing.com/',
        mark: 'b',
        color: '#46a8a0'
      },
      {
        name: 'Google',
        description: '从一个问题探索整个世界',
        url: 'https://www.google.com/',
        mark: 'G',
        color: '#568bdd'
      },
      {
        name: '百度',
        description: '中文资讯与生活信息搜索',
        url: 'https://www.baidu.com/',
        mark: '度',
        color: '#627ddd'
      },
      {
        name: 'DuckDuckGo',
        description: '注重隐私的综合搜索',
        url: 'https://duckduckgo.com/',
        mark: 'D',
        color: '#ce815b'
      },
      {
        name: '搜狗',
        description: '网页与微信内容搜索',
        url: 'https://www.sogou.com/',
        mark: '搜',
        color: '#d88757'
      },
      {
        name: '知乎',
        description: '在经验与讨论中寻找答案',
        url: 'https://www.zhihu.com/',
        mark: '知',
        color: '#568bdd'
      }
    ]
  },
  {
    id: 'news',
    name: '番剧资讯',
    caption: '新番日历、作品资料与动画新闻',
    icon: 'news',
    sites: [
      {
        name: 'AniList',
        description: '动画与漫画资料、评分及追番记录',
        url: 'https://anilist.co/',
        mark: 'AL',
        color: '#568bdd'
      },
      {
        name: 'AniDB',
        description: '动画作品、角色与制作资料库',
        url: 'https://anidb.net/',
        mark: 'DB',
        color: '#ce815b'
      },
      {
        name: 'Anime News Network',
        description: '动画行业新闻、评论与访谈',
        url: 'https://www.animenewsnetwork.com/',
        mark: 'AN',
        color: '#6684c7'
      },
      {
        name: 'LiveChart.me',
        description: '新番时间表、预告与播出信息',
        url: 'https://www.livechart.me/',
        mark: 'LC',
        color: '#58a76c'
      },
      {
        name: 'AnimeSchedule',
        description: '按周查看动画播出日程',
        url: 'https://animeschedule.net/',
        mark: 'AS',
        color: '#90819e'
      },
      {
        name: '动漫之家',
        description: '动漫资讯、作品介绍与社区',
        url: 'https://www.dmzj.com/',
        mark: '漫',
        color: '#df9856'
      }
    ]
  },
  {
    id: 'manga',
    name: '漫画阅读',
    caption: '连载、单行本与数字书架',
    icon: 'manga',
    sites: [
      {
        name: '哔哩哔哩漫画',
        description: '中文漫画连载与正版作品',
        url: 'https://manga.bilibili.com/',
        mark: '哔',
        color: '#df709a'
      },
      {
        name: '腾讯动漫',
        description: '国漫连载与热门漫画',
        url: 'https://ac.qq.com/',
        mark: '腾',
        color: '#5791db'
      },
      {
        name: '快看漫画',
        description: '原创漫画与创作者社区',
        url: 'https://www.kuaikanmanhua.com/',
        mark: '快',
        color: '#c18b42'
      },
      {
        name: 'MANGA Plus',
        description: '集英社漫画与同步连载',
        url: 'https://mangaplus.shueisha.co.jp/',
        mark: 'M+',
        color: '#d96767'
      },
      {
        name: 'BOOK☆WALKER',
        description: '漫画、轻小说与电子书',
        url: 'https://bookwalker.jp/',
        mark: 'BW',
        color: '#ce815b'
      },
      {
        name: '少年ジャンプ＋',
        description: '集英社日文漫画与原创连载',
        url: 'https://shonenjumpplus.com/',
        mark: 'J+',
        color: '#d96767'
      }
    ]
  },
  {
    id: 'art',
    name: '插画与创作',
    caption: '收集灵感，也试着亲手创作',
    icon: 'art',
    sites: [
      {
        name: 'ArtStation',
        description: '概念设计、角色与数字艺术',
        url: 'https://www.artstation.com/',
        mark: 'Ar',
        color: '#409ad4'
      },
      {
        name: 'DeviantArt',
        description: '插画、同人作品与艺术社区',
        url: 'https://www.deviantart.com/',
        mark: 'DA',
        color: '#58a76c'
      },
      {
        name: 'LOFTER',
        description: '同人创作、绘画与兴趣社区',
        url: 'https://www.lofter.com/',
        mark: 'LO',
        color: '#6ca05b'
      },
      {
        name: 'BOOTH',
        description: '创作者的同人作品与数字商品',
        url: 'https://booth.pm/',
        mark: 'BO',
        color: '#df709a'
      },
      {
        name: 'CLIP STUDIO ASSETS',
        description: '绘画笔刷、素材与创作资源',
        url: 'https://assets.clip-studio.com/',
        mark: 'CS',
        color: '#90819e'
      },
      {
        name: 'Krita',
        description: '开源数字绘画与动画工具',
        url: 'https://krita.org/',
        mark: 'Kr',
        color: '#90819e'
      }
    ]
  },
  {
    id: 'music',
    name: '音乐与电台',
    caption: '动画原声、同人音乐与日常循环',
    icon: 'music',
    sites: [
      {
        name: '网易云音乐',
        description: '歌单、动画原声与音乐社区',
        url: 'https://music.163.com/',
        mark: '云',
        color: '#d96767'
      },
      {
        name: 'QQ 音乐',
        description: '音乐曲库、歌单与数字专辑',
        url: 'https://y.qq.com/',
        mark: 'Q',
        color: '#58a76c'
      },
      {
        name: 'Spotify',
        description: '音乐、专辑与个性化歌单',
        url: 'https://open.spotify.com/',
        mark: 'S',
        color: '#58a76c'
      },
      {
        name: 'YouTube Music',
        description: '音乐视频、原声与现场演出',
        url: 'https://music.youtube.com/',
        mark: 'YM',
        color: '#d96767'
      },
      {
        name: 'Bandcamp',
        description: '独立音乐人与数字专辑',
        url: 'https://bandcamp.com/',
        mark: 'BC',
        color: '#4498c8'
      },
      {
        name: 'VocaDB',
        description: 'Vocaloid 歌曲、歌手与专辑资料',
        url: 'https://vocadb.net/',
        mark: 'V',
        color: '#46a8a0'
      }
    ]
  },
  {
    id: 'game',
    name: '游戏与同人',
    caption: '发现新游戏，遇见独立创作',
    icon: 'game',
    sites: [
      {
        name: 'Steam',
        description: 'PC 游戏、社区与创意工坊',
        url: 'https://store.steampowered.com/',
        mark: 'St',
        color: '#6684c7'
      },
      {
        name: 'itch.io',
        description: '独立游戏、视觉小说与创作工具',
        url: 'https://itch.io/',
        mark: 'it',
        color: '#d96767'
      },
      {
        name: 'TapTap',
        description: '发现手游、玩家评价与社区',
        url: 'https://www.taptap.cn/',
        mark: 'T',
        color: '#46a8a0'
      },
      {
        name: 'DLsite',
        description: '同人游戏、音声与数字作品商店',
        url: 'https://www.dlsite.com/',
        mark: 'DL',
        color: '#568bdd'
      },
      {
        name: 'VNDB',
        description: '视觉小说作品与发行信息数据库',
        url: 'https://vndb.org/',
        mark: 'VN',
        color: '#c18b42'
      },
      {
        name: 'THBWiki',
        description: '东方 Project 作品与同人资料百科',
        url: 'https://thwiki.cc/',
        mark: '東',
        color: '#df709a'
      }
    ]
  },
  {
    id: 'directory',
    name: '导航与发现',
    caption: '继续发现更多 ACG 入口',
    icon: 'directory',
    sites: [
      {
        name: '萌导航 · moe48',
        description: 'ACG 网站与常用入口导航',
        url: 'https://www.moe48.com/',
        mark: '萌',
        color: '#df709a'
      },
      {
        name: 'EverythingMoe',
        description: '动漫、漫画与 ACG 工具目录',
        url: 'https://everythingmoe.com/',
        mark: 'EM',
        color: '#90819e'
      },
      {
        name: '萌导航 · moe123',
        description: '二次元网站与兴趣导航',
        url: 'https://www.moe123.net/',
        mark: 'M',
        color: '#6684c7'
      },
      {
        name: '维基百科',
        description: '作品背景、人物与百科资料',
        url: 'https://zh.wikipedia.org/',
        mark: 'W',
        color: '#90819e'
      },
      {
        name: 'Internet Archive',
        description: '公开数字馆藏与历史网页存档',
        url: 'https://archive.org/',
        mark: 'IA',
        color: '#c18b42'
      },
      {
        name: 'The Anime Index',
        description: '动画相关网站与工具索引',
        url: 'https://theindex.moe/',
        mark: 'I',
        color: '#46a8a0'
      }
    ]
  }
]

const featuredNames = ['哔哩哔哩', 'Bangumi', 'YouTube', '必应']
export const featuredSites = featuredNames.flatMap((name) =>
  directory.flatMap((category) => category.sites).filter((site) => site.name === name)
)

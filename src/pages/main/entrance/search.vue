<script setup lang="ts">
import { ref } from 'vue'
import { Search } from '@element-plus/icons-vue'

// --------------------------- config -------------------------------
defineOptions({ name: 'SearchView' })
const modelValue = defineModel<string>()
const engineList = [
  {
    name: '必应',
    icon: 'https://cn.bing.com/favicon.ico',
    url: 'https://cn.bing.com/search?q='
  },
  {
    name: '谷歌',
    icon: 'https://www.google.com/favicon.ico',
    url: 'https://www.google.com/search?q='
  },
  {
    name: 'duckduckgo',
    icon: 'https://duckduckgo.com/favicon.ico',
    url: 'https://duckduckgo.com/?q='
  },
  {
    name: '开发',
    children: [
      {
        name: 'github',
        icon: 'https://github.com/favicon.ico',
        url: 'https://github.com/search?q='
      },
      {
        name: 'stackOverflow',
        icon: 'https://stackoverflow.com/favicon.ico',
        url: 'https://stackoverflow.com/search?q='
      },
      {
        name: 'npm',
        icon: 'https://www.npmjs.com/favicon.ico',
        url: 'https://www.npmjs.com/search?q='
      }
    ]
  },
  {
    name: '视频',
    children: [
      {
        name: 'bilibili',
        icon: 'https://www.bilibili.com/favicon.ico',
        url: 'https://search.bilibili.com/all?keyword='
      },
      {
        name: 'youtube',
        icon: 'https://www.youtube.com/favicon.ico',
        url: 'https://www.youtube.com/results?search_query='
      },
      {
        name: '优酷',
        icon: 'https://www.youku.com/favicon.ico',
        url: 'https://so.youku.com/search_video/q_'
      },
      {
        name: '爱奇艺',
        icon: 'https://www.iqiyi.com/favicon.ico',
        url: 'https://so.iqiyi.com/so/q_'
      },
      {
        name: '腾讯视频',
        icon: 'https://v.qq.com/favicon.ico',
        url: 'https://v.qq.com/x/search/?q='
      },
      {
        name: '抖音',
        icon: 'https://www.douyin.com/favicon.ico',
        url: 'https://www.douyin.com/search/'
      },
      {
        name: '快手',
        icon: 'https://www.kuaishou.com/favicon.ico',
        url: 'https://www.kuaishou.com/search/video/?keyword='
      },
      {
        name: '微博视频',
        icon: 'https://video.weibo.com/favicon.ico',
        url: 'https://video.weibo.com/show?mod=page&keyword='
      },
      {
        name: '芒果',
        icon: 'https://www.mgtv.com/favicon.ico',
        url: 'https://search.mgtv.com/mgtv?wd='
      }
    ]
  }
]
const mapName2URL = Object.assign(
  {},
  ...engineList.map((item) =>
    item.children
      ? Object.assign({}, ...item.children.map((item) => ({ [item.name]: item.url })))
      : { [item.name]: item.url }
  )
)
const props = {
  expandTrigger: 'hover' as const,
  label: 'name',
  value: 'name'
}
// ---------------------------- data --------------------------------
const searchEngine = ref(['必应'])
// -------------------------- computed ------------------------------
// --------------------------- methods ------------------------------
function searchHandler() {
  const url = mapName2URL[searchEngine.value[searchEngine.value.length - 1]]
  if (url) {
    window.open(url + modelValue.value)
  }
}
// ---------------------------- watch -------------------------------
// ---------------------------- life --------------------------------
// --------------------------- other --------------------------------
</script>

<template>
  <el-input
    size="large"
    v-model="modelValue"
    placeholder="请输入关键词"
    class="!w-[600px]"
    @keydown.enter="searchHandler"
    clearable
    :suffix-icon="Search"
  >
    <template #prepend>
      <el-cascader
        size="large"
        v-model="searchEngine"
        :options="engineList"
        :show-all-levels="false"
        :props="props"
      />
    </template>
  </el-input>
</template>

<style lang="less" scoped>
:deep(.el-cascader) {
  position: relative;
  width: 140px;
  margin-left: -20px;
  margin-right: -21px;
  .el-input__wrapper {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    width: 100%;
    &.is-focus {
      z-index: 1;
    }
  }
}
</style>

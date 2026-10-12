<!-- 打开的页签管理 -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElIcon } from 'element-plus'
import 'element-plus/es/components/icon/style/css'
import { Close, HomeFilled } from '@element-plus/icons-vue'
import { navIcons } from './nav-icons'
import SecondConfirmation from './SecondConfirmation.vue'
import { useNavStore, type NavTreeSingleNode } from '@/stores/nav'
import { SlickItem, SlickList } from 'vue-slicksort'
import { nanoid } from 'nanoid'
import { removePageCahce } from './keepAliveRouteView.vue'
import config from './progress'
import { RouterView, useRoute, useRouter } from 'vue-router'

defineOptions({ name: 'TabManageView' })
type Tab = {
  key: string
  label: string
  name: string
  active: boolean
  nav: NavTreeSingleNode
}
// ---------------------------- config -------------------------------
const route = useRoute()
const router = useRouter()
// const particlesOptions = reactive({
//   fullScreen: { enable: false },
//   background: { color: 'transparent' },
//   fpsLimit: 60,
//   interactivity: {
//     events: {
//       onHover: { enable: false, mode: 'repulse' },
//       onClick: { enable: false, mode: 'push' }
//     }
//   },
//   particles: {
//     color: { value: '#ffffff' },
//     links: { enable: true, color: '#ffffff', distance: 100, width: 0.5, opacity: 0.4 },
//     move: { enable: true, speed: 0.5 },
//     number: { value: 75 },
//     opacity: { value: 0.5 },
//     shape: { type: 'circle' },
//     size: { value: 1 }
//   },
//   detectRetina: true
// })
// ---------------------------- data --------------------------------
const lastActive = ref('')
const list = ref<Tab[]>([])
const { name2Nav } = useNavStore()
const homeNav = name2Nav.entrance
list.value = [
  { key: nanoid(), label: homeNav.label, name: homeNav.name, active: false, nav: homeNav }
]
// 首页在排序容器之外，其余页签只能在首页之后排序。
const sortableTabs = computed({
  get: () => list.value.slice(1),
  set: (tabs: Tab[]) => {
    list.value = [list.value[0], ...tabs]
  }
})
// --------------------------- methods ------------------------------
function closeTabHandler(who: number, state: boolean) {
  if (list.value[who]?.name === 'entrance') return
  // console.log(who, state)
  if (state) {
    if (list.value.length > 1) {
      const closePage = list.value.splice(who, 1)[0]
      // console.log(closePage)
      removePageCahce(closePage.name)
      // 如果关闭的是高亮页面
      if (closePage.active) {
        const lastIdx = list.value.findIndex((el) => el.key === lastActive.value)
        // console.log(lastIdx, lastActive.value, list.value)
        // 如果上一个高亮页面已经关了
        if (lastIdx !== -1) {
          router.push({ name: list.value[lastIdx].name })
        } else {
          // 直接切换一个周围页面高亮
          const len = list.value.length
          router.push({ name: list.value[who >= len ? who - 1 : who].name })
        }
      } else if (lastActive.value === closePage.key) {
        // 如果关闭的是上一个高亮页面，直接删除该数据
        lastActive.value = ''
      }
    }
  }
}
function changeTab(idx: number) {
  if (!list.value[idx].active) {
    router.push({ name: list.value[idx].name })
    // console.log('changeTab')
  }
}
// ---------------------------- watch -------------------------------
watch(
  () => route.name,
  () => {
    if (typeof route.name === 'string') {
      // console.log('watch')
      const nav = name2Nav[route.name]
      // 判断跳转的页面路径是新的还是旧的(新的：添加，旧的：定位并修改active)
      if (nav) {
        const navInListIndex = list.value.findIndex((item) => item.name === nav.name)
        // 对于新增来说肯定是找不到的，但是得吧已有的全部去高亮
        list.value.forEach((ele) => {
          if (ele.active) {
            lastActive.value = ele.key
          }
          ele.active = false
        })
        if (navInListIndex !== -1) {
          list.value[navInListIndex].active = true
        } else {
          list.value.push({
            key: nanoid(),
            label: nav.label,
            name: nav.name,
            active: true,
            nav
          })
        }
      }
    }
  },
  { immediate: true }
)
function isDisabled(index: number) {
  if (list.value.length > 1) {
    const dis = list.value[index].nav.secondConfirmation
    if (dis) return typeof dis === 'boolean' ? dis : dis()
    return false
  }
  return false
}
// -------------------------- computed ------------------------------
// ---------------------------- life --------------------------------
onMounted(() => {
  config('#conteintBox')
})
</script>

<template>
  <div id="conteintBox" class="tab-manage-container flex flex-col">
    <div class="tab-button-list-wrapper">
      <button
        type="button"
        class="tab-single-btn home-tab"
        :class="{ active: list[0].active }"
        :aria-current="list[0].active ? 'page' : undefined"
        @click="changeTab(0)"
      >
        <el-icon aria-hidden="true"><HomeFilled /></el-icon>
        <span>{{ list[0].label }}</span>
      </button>
      <SlickList
        class="sortable-tabs"
        axis="x"
        lockAxis="x"
        v-model:list="sortableTabs"
        :distance="5"
        :lockToContainerEdges="true"
        :lockOffset="['0%', '0%']"
      >
        <template v-for="(item, idx) in sortableTabs" :key="item?.key || idx">
          <SlickItem
            class="tab-single-btn"
            v-if="item"
            :index="idx"
            :class="{ active: item.active }"
            :title="item.label"
          >
            <button
              type="button"
              class="tab-select-btn"
              :aria-current="item.active ? 'page' : undefined"
              @click="changeTab(idx + 1)"
            >
              <el-icon v-if="item.nav.icon" aria-hidden="true"
                ><component :is="navIcons[item.nav.icon]"
              /></el-icon>
              <span>{{ item.label }}</span>
            </button>
            <SecondConfirmation
              :disabled="() => isDisabled(idx + 1)"
              @done="() => closeTabHandler(idx + 1, true)"
            >
              <template #default="{ next }">
                <button
                  type="button"
                  class="tab-close-btn-box"
                  :aria-label="'关闭' + item.label"
                  @mousedown.stop
                  @touchstart.stop
                  @click.stop="next"
                >
                  <el-icon class="tab-close-btn" aria-hidden="true"><Close /></el-icon>
                </button>
              </template>
            </SecondConfirmation>
          </SlickItem>
        </template>
      </SlickList>
    </div>
    <div class="content flex-1">
      <!-- <vue-particles id="tsparticles" :options="particlesOptions" /> -->
      <div class="fill-content">
        <RouterView />
        <div class="h12"></div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.tab-manage-container {
  padding: 0;
  flex: 1;
  min-height: 0;
  .content {
    position: relative;
    overflow: hidden;
    #tsparticles {
      position: absolute;
      inset: 0;
      z-index: 0;
    }
    .fill-content {
      position: absolute;
      overflow: auto;
      inset: 0;
      .h12 {
        height: 12px;
      }
    }
  }
  .tab-button-list-wrapper {
    height: 30px;
    flex-shrink: 0;
    display: flex;
    padding-left: 4px;
    border-bottom: 1px solid var(--el-border-color);
    overflow-x: auto;
  }
  .sortable-tabs {
    display: flex;
    flex: 1;
    min-width: 0;
  }
}
</style>

<style lang="less">
.tab-single-btn {
  min-width: 80px;
  max-width: 160px;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  flex: 0 0 auto;
  padding: 0 10px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  &.active {
    color: var(--color-accent);
    background: var(--color-accent-soft);
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 14px;
      right: 14px;
      height: 2px;
      background: var(--color-highlight);
      border-radius: 2px;
    }
  }
  .tab-close-btn-box {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 2px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
}
.tab-select-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.tab-select-btn span {
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (hover: hover) and (pointer: fine) {
  .tab-single-btn:hover {
    background: var(--color-accent-soft);
  }
  .tab-single-btn .tab-close-btn-box:hover {
    background: var(--color-background-mute);
  }
}
</style>

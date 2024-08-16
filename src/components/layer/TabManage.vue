<!-- 打开的页签管理 -->
<script lang="ts">
export default { name: 'TabManageView' }
import { onMounted } from 'vue'
import SecondConfirmation from './SecondConfirmation.vue'
import { ref } from 'vue'
import { useNavStore, type NavTreeSingleNode } from '@/stores/nav'
import { SlickItem, SlickList } from 'vue-slicksort'
import { nanoid } from 'nanoid'
import { watch } from 'vue'
import { findIndex } from 'lodash'
import { removePageCahce } from './keepAliveRouteView.vue'
import config from './progress'
type Tab = {
  key: string
  label: string
  name: string
  active: boolean
  nav: NavTreeSingleNode
}
</script>

<script setup lang="ts">
import { RouterView, useRoute, useRouter } from 'vue-router'
// ---------------------------- config -------------------------------
const route = useRoute()
const router = useRouter()
// ---------------------------- data --------------------------------
const lastActive = ref('')
const currentActiveIndex = ref(0)
const list = ref<Tab[]>([])
const closeBtnIndex = ref(-1)
const { name2Nav } = useNavStore()
// --------------------------- methods ------------------------------
// 用于hover存值逻辑频繁变化，index防抖
function closeIndexChange(idx: number) {
  closeBtnIndex.value = idx
}
function closeTabHandler(who: number, state: boolean) {
  const lastKey = lastActive.value
  // console.log(lastKey)
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
  () => route.path,
  () => {
    if (typeof route.name === 'string') {
      // console.log('watch')
      const nav = name2Nav[route.name]
      // 判断跳转的页面路径是新的还是旧的(新的：添加，旧的：定位并修改active)
      if (nav) {
        const navInListIndex = findIndex(list.value, ['name', nav.name])
        // 对于新增来说肯定是找不到的，但是得吧已有的全部去高亮
        list.value.forEach((ele) => {
          if (ele.active) {
            lastActive.value = ele.key
          }
          ele.active = false
        })
        if (navInListIndex !== -1) {
          currentActiveIndex.value = navInListIndex
          list.value[navInListIndex].active = true
        } else {
          currentActiveIndex.value =
            list.value.push({
              key: nanoid(),
              label: nav.label,
              name: nav.name,
              active: true,
              nav
            }) - 1
        }
      }
    }
  }
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
  if (typeof route.name === 'string') {
    const nav = name2Nav[route.name]
    list.value = [
      {
        key: nanoid(),
        label: nav.label,
        name: nav.name,
        active: true,
        nav
      }
    ]
  }
  config('#conteintBox')
})
</script>

<template>
  <div id="conteintBox" class="tab-manage-container flex flex-col">
    <SlickList
      class="tab-button-list-wrapper"
      axis="x"
      lockAxis="x"
      v-model:list="list"
      :lockToContainerEdges="true"
      :lockOffset="['0%', '0%']"
    >
      <template v-for="(item, idx) in list" :key="item?.key || idx">
        <SlickItem
          class="tab-single-btn"
          v-if="item"
          :index="idx"
          :class="{ active: item.active }"
          :title="item.label"
          @mousedown="changeTab(idx)"
          @mouseover="closeIndexChange(idx)"
        >
          <span>{{ item.label }}</span>
          <SecondConfirmation
            :disabled="() => isDisabled(idx)"
            @done="() => closeTabHandler(idx, closeBtnIndex === idx)"
          >
            <template #default="{ next }">
              <div class="tab-close-btn-box">
                <el-icon @mousedown.stop @click="next" class="tab-close-btn"><Close /></el-icon>
              </div>
            </template>
          </SecondConfirmation>
        </SlickItem>
      </template>
    </SlickList>
    <div class="content flex-1">
      <div class="fill-content">
        <RouterView />
        <div class="h12"></div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.tab-manage-container {
  padding: 8px 0 0;
  height: 100%;
  .content {
    position: relative;
    overflow: hidden;
    .fill-content {
      position: absolute;
      overflow-y: overlay;
      inset: 0;
      .h12 {
        height: 12px;
      }
    }
  }
  .tab-button-list-wrapper {
    height: 32px;
    display: flex;
    padding-left: 12px;
    border-bottom: 1px dashed var(--el-border-color);
  }
}
</style>

<style lang="less">
.tab-single-btn {
  min-width: 32px;
  max-width: 150px;
  display: flex;
  align-items: center;
  overflow: hidden;
  position: relative;
  flex: 1;
  z-index: 1;
  line-height: 1em;
  user-select: none;
  color: var(--el-text-color-primary);
  border-radius: 8px 8px 0 0;
  padding-left: 16px;
  white-space: nowrap;
  background: var(--el-border-color-extra-light);
  .tab-close-btn-box {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    padding-left: 12px;
    padding-right: 8px;
    z-index: 2;
    border-top-right-radius: 8px;
    background: linear-gradient(to left, transparent 0, transparent 70%, rgba(0, 0, 0, 0));
    .tab-close-btn {
      transition: all 0.3s ease;
      border-radius: 2px;
      margin-top: 9px;
      &:hover {
        background-color: var(--el-border-color);
      }
    }
  }
  &::before {
    content: '';
    width: 1px;
    height: 18px;
    position: absolute;
    top: 9px;
    left: 0;
    background-color: var(--color-tab-button-split);
  }
  &:last-child::after {
    content: '';
    width: 1px;
    height: 18px;
    position: absolute;
    top: 9px;
    right: 0;
    z-index: 3;
    background-color: var(--color-tab-button-split);
  }
  &:first-child::before {
    display: none;
  }
  &.active {
    background-color: var(--color-background);
    box-shadow:
      -8px -6px 12px -4px rgba(200, 200, 200, 0.2),
      8px -6px 12px -4px rgba(200, 200, 200, 0.2);
    .tab-close-btn-box {
      background: linear-gradient(
        to left,
        var(--color-background) 0,
        var(--color-background) 70%,
        rgba(0, 0, 0, 0)
      );
    }
    + .tab-single-btn::before,
    &::before,
    &::after {
      display: none;
    }
  }
  &:hover {
    background-color: var(--el-fill-color-dark);
    .tab-close-btn-box {
      background: linear-gradient(
        to left,
        var(--el-fill-color-dark) 0,
        var(--el-fill-color-dark) 70%,
        rgba(0, 0, 0, 0)
      );
    }
    + .tab-single-btn::before,
    &::before,
    &::after {
      display: none;
    }
  }
}
</style>

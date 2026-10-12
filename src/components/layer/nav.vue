<!-- 左侧目录树 -->
<script setup lang="ts">
import { ElIcon, ElTree } from 'element-plus'
import 'element-plus/es/components/icon/style/css'
import 'element-plus/es/components/tree/style/css'
import { ArrowDown } from '@element-plus/icons-vue'
import { navIcons } from './nav-icons'
import { type NavTreeSingleNode } from '@/stores/nav'
import { recursion } from '@/utils/common'
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

defineOptions({ name: 'NavView' })

const router = useRouter()
const route = useRoute()
const treeRef = ref()
const props = defineProps<{ data: NavTreeSingleNode[]; collapse: boolean }>()
const navLeavesNode = computed(() => {
  const list: Record<string, NavTreeSingleNode> = {}
  recursion(props.data, 'children', (node) => {
    if (!node.children?.length) {
      list[node.name] = node
    }
  })
  return list
})
let lastReverse: NavTreeSingleNode

function reverseIteration(data: NavTreeSingleNode, state: boolean) {
  if (data.parent) {
    reverseIteration(data.parent, state)
  }
  data.focus = state
}
const handleNodeClick = (data: NavTreeSingleNode) => {
  // console.log(data)
  if (data.dir) return
  if (data.blank) {
    window.open(data.name)
    return
  }
  if (lastReverse) {
    reverseIteration(lastReverse, false)
  }
  // reverseIteration(data, true)
  lastReverse = data
  data.focus = true
  if (data.name && data.name !== route.name) {
    console.log(data.name)
    router.push({ name: data.name })
  }
}
watch(
  () => route.path,
  () => {
    if (typeof route.name === 'string') {
      // 导航树判定路由变化与树节点展示
      const nav = navLeavesNode.value[route.name]
      if (nav) {
        handleNodeClick(nav)
        treeRef.value?.setCurrentKey(nav.key)
      }
    }
  }
)
onMounted(() => {
  if (typeof route.name === 'string') {
    const nav = navLeavesNode.value[route.name]
    if (nav) {
      handleNodeClick(nav)
      treeRef.value?.setCurrentKey(nav.key)
    }
  }
})
</script>

<template>
  <!-- https://segmentfault.com/a/1190000039916159 修改ui -->
  <RouterLink class="base-logo" :to="{ name: 'entrance' }" aria-label="chery 首页"
    ><span aria-hidden="true">▸</span> chery<span class="brand-suffix"> / web</span></RouterLink
  >
  <el-tree
    class="navigation-tree flex-1 scrollbar-hover-toggle"
    :data="data"
    ref="treeRef"
    node-key="key"
    @node-click="handleNodeClick"
  >
    <template #default="{ node, data }">
      <el-icon
        v-if="data.icon"
        :color="data.focus ? 'var(--el-color-primary)' : 'var(--color-text)'"
        class="nav-node-icon"
      >
        <component :is="navIcons[data.icon]" />
      </el-icon>
      <div class="leading-[18px]" :class="{ 'lable-active': data.focus }">
        <span v-if="!collapse">{{ node.label }}</span>
      </div>
      <div style="flex: 1"></div>
      <el-icon
        v-if="data.children"
        :color="data.focus ? 'var(--el-color-primary)' : 'var(--color-text)'"
        class="arrow-down"
        :class="{ 'active-rotate': node.expanded }"
      >
        <ArrowDown />
      </el-icon>
    </template>
  </el-tree>
</template>

<style lang="less" scoped>
.base-logo {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 42px;
  padding: 0 12px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-heading);
  text-decoration: none;
  font:
    600 14px ui-monospace,
    monospace;
}
.base-logo > span:first-child {
  color: var(--color-accent);
}
.brand-suffix {
  color: var(--color-text-muted);
  font-size: 11px;
}
.navigation-tree {
  padding: 7px 4px 40px;
  --el-tree-node-hover-bg-color: var(--color-accent-soft);
  background: transparent;
}
:deep(.el-tree-node__content) {
  height: 29px;
  padding-right: 4px;
  border-radius: 2px;
  font-size: 12px;
  margin-bottom: 1px;
}
:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--color-highlight);
  color: var(--color-on-highlight);
  box-shadow: inset 2px 0 var(--color-accent);
}
:deep(.el-tree-node.is-current > .el-tree-node__content) .lable-active,
:deep(.el-tree-node.is-current > .el-tree-node__content) .nav-node-icon {
  color: var(--color-on-highlight) !important;
}
.lable-active {
  font-weight: 600;
}
.arrow-down {
  font-size: 10px;
  margin-right: 6px;
  height: 10px;
  display: block;
  transition: transform 160ms var(--ease-out);
  &.active-rotate {
    transform: rotate(180deg);
  }
}
:deep(.el-tree-node__expand-icon) {
  display: none;
}
.nav-node-icon {
  width: 14px;
  height: 14px;
  margin: 0 7px 0 5px;
}
@media (pointer: coarse) {
  :deep(.el-tree-node__content) {
    height: 36px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .arrow-down {
    transition: none;
  }
}
</style>

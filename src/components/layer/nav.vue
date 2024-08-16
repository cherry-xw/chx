<!-- 左侧目录树 -->
<script setup lang="ts">
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
  <div class="base-logo px-[12px]">chery</div>
  <el-tree
    class="flex-1 scrollbar-hover-toggle"
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
        <component :is="data.icon" />
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
:deep(.el-tree-node__content) {
  height: 36px;
}
@keyframes move {
  0% {
    offset-rotate: 0deg;
    offset-distance: 0%;
  }
  100% {
    offset-rotate: 180deg;
    offset-distance: 100%;
  }
}
.base-logo {
  cursor: pointer;
  line-height: 60px;
  font-size: 16px;
  position: relative;
  color: var(--el-text-color-primary);
  text-shadow: 0 0 6px #12c2e963;
  transition: all 0.3s ease;
  &:hover {
    text-shadow: 0 0 6px #c471ed;
  }
}
.lable-active {
  color: var(--el-color-primary);
}

.arrow-down {
  font-size: 12px;
  margin-right: 18px;
  text-align: right;
  height: 12px;
  display: block;
  transition: all 0.3s ease;

  &.active-rotate {
    transform: rotate(180deg);
  }
}

:deep(.el-tree-node__content) {
  .el-icon {
    &:first-child {
      display: none;
    }
  }
}
.nav-node-icon {
  width: 18px;
  height: 18px;
  margin: 0 6px;
}
:deep(.el-tree-node) {
  &.is-current {
    position: relative;
    &::before {
      content: '';
    }
  }
}
</style>

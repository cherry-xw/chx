<!-- 左侧目录树 -->
<script lang="ts">
import { type NavTreeSingleNode } from '@/stores/nav'
import { recursion } from '@/utils/common'
import { ref } from 'vue'
import { onMounted } from 'vue'
import { computed } from 'vue'
import { watch } from 'vue'
import { reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
export default { name: 'NavView' }
</script>

<script setup lang="ts">
const router = useRouter()
const route = useRoute()
const defaultProps = {
  children: 'children',
  label: 'label'
}
const treeRef = ref()
const props = defineProps<{ data: NavTreeSingleNode[] }>()
const navTree = reactive<NavTreeSingleNode[]>(props.data)
const navLeavesNode = computed(() => {
  const list: Record<string, NavTreeSingleNode> = {}
  recursion(navTree, 'children', (node) => {
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
  if (lastReverse) {
    reverseIteration(lastReverse, false)
  }
  reverseIteration(data, true)
  lastReverse = data
  if (data.name && data.name !== route.name) {
    router.push({ name: data.name })
  }
}
function ev(node: NavTreeSingleNode, data: any) {
  // console.log(node, data);
}
function goHome() {
  router.push({ name: 'home' })
}
watch(
  () => route.path,
  () => {
    if (typeof route.name === 'string') {
      // 导航树判定路由变化与树节点展示
      const nav = navLeavesNode.value[route.name]
      // console.log('xxxxxxxxx', nav)
      if (nav) {
        handleNodeClick(nav)
        treeRef.value?.setCurrentKey(nav.key)
      }
    }
  }
)
onMounted(() => {
  // console.log("treeRef", treeRef);
  if (typeof route.name === 'string') {
    const nav = navLeavesNode.value[route.name]
    // console.log('xxxxxxxxx', nav)
    if (nav) {
      handleNodeClick(nav)
      treeRef.value?.setCurrentKey(nav.key)
    }
  }
})
</script>

<template>
  <div class="base-logo px-[12px]" @click="goHome">chery</div>
  <el-tree
    class="flex-1 scrollbar-hover-toggle"
    :data="navTree"
    :props="defaultProps"
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
      <div class="leading-[18px]" @click="ev(node, data)" :class="{ 'lable-active': data.focus }">
        {{ node.label }}
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

.base-logo {
  cursor: pointer;
  line-height: 60px;
  font-size: 16px;
  position: relative;
  color: var(--el-text-color-primary);
  &::after {
    content: 'chery';
    transition: all 0.3s ease;
    font-size: 16px;
    position: absolute;
    left: 11px;
    font-weight: 600;
    color: #12c2e963;
    filter: blur(2px);
  }
  &:hover {
    &::after {
      color: #c471ed;
    }
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
</style>

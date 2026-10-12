<script setup lang="ts">
import { ElIcon } from 'element-plus'
import 'element-plus/es/components/icon/style/css'
import { CaretLeft } from '@element-plus/icons-vue'
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import { useNavStore } from '@/stores/nav'
const { nav } = useNavStore()

defineOptions({ name: 'BasicLayer' })
const collapseState = ref(window.matchMedia('(max-width: 760px)').matches)
</script>

<template>
  <div id="layer" class="flex absolute inset-0">
    <div
      id="main-navigation"
      class="nav flex flex-col h-full overflow-hidden"
      :class="{ collapse: collapseState }"
    >
      <RouterView name="nav" :data="nav" :collapse="collapseState"></RouterView>
    </div>
    <button
      type="button"
      class="collpase-btn"
      :class="{ rotate: collapseState }"
      :aria-label="collapseState ? '展开导航' : '收起导航'"
      :aria-expanded="!collapseState"
      aria-controls="main-navigation"
      @click="collapseState = !collapseState"
    >
      <el-icon><CaretLeft /></el-icon>
    </button>
    <div class="main-column flex-1 flex flex-col">
      <RouterView name="header"></RouterView>
      <RouterView />
      <footer class="site-record">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
          苏ICP备18035382号
        </a>
      </footer>
    </div>
  </div>
</template>

<style lang="less" scoped>
#layer {
  overflow: hidden;
  background: var(--color-background);
  .main-column {
    min-width: 0;
    min-height: 0;
  }
  .site-record {
    flex-shrink: 0;
    padding: 6px 12px;
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    font-size: 12px;
    line-height: 18px;
    text-align: center;
    a {
      color: inherit;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
  }
  .nav {
    width: 154px;
    flex-shrink: 0;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    &.collapse {
      width: 0px;
      border-right: 0;
      visibility: hidden;
    }
  }
  .collpase-btn {
    position: absolute;
    left: 6px;
    bottom: 6px;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-surface);
    color: var(--color-text-secondary);
    cursor: pointer;
    z-index: 30;
    &.rotate {
      transform: rotate(180deg);
    }
  }
  @media (max-width: 760px) {
    .nav {
      position: absolute;
      z-index: 20;
      box-shadow: 8px 0 24px #00000018;
    }
  }
}
</style>

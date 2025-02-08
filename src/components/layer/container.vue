<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import { useNavStore } from '@/stores/nav'
const { nav } = useNavStore()

defineOptions({ name: 'BasicLayer' })
const collapseState = ref(false)
</script>

<template>
  <div id="layer" class="flex absolute inset-0 min-w-[1280px]">
    <div
      class="nav flex flex-col h-full overflow-hidden border-r border-dashed border-[var(--el-border-color)]"
      :class="{ collapse: collapseState }"
    >
      <RouterView name="nav" :data="nav" :collapse="collapseState"></RouterView>
    </div>
    <div
      class="collpase-btn"
      :class="{ rotate: collapseState }"
      @click="collapseState = !collapseState"
    >
      <el-icon><CaretLeft /></el-icon>
    </div>
    <div class="flex-1 flex flex-col">
      <el-collapse-transition>
        <RouterView v-show="!collapseState" name="header"></RouterView>
      </el-collapse-transition>
      <RouterView />
    </div>
  </div>
</template>

<style lang="less" scoped>
#layer {
  .nav {
    width: 160px;
    transition: all 0.3s ease;
    &.collapse {
      width: 0px;
    }
  }
  .collpase-btn {
    position: absolute;
    left: 5px;
    bottom: 5px;
    cursor: pointer;
    z-index: 10;
    transition: all 0.3s ease;
    &.rotate {
      transform: rotate(180deg);
    }
  }
}
</style>

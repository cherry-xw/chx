<script lang="ts">
import { RouterView } from 'vue-router'
export default { name: 'BasicLayer', components: { RouterView } }
</script>

<template>
  <div id="layer" class="flex absolute inset-0 min-w-[1280px]">
    <div
      class="flex flex-col w-[200px] min-w-[200px] h-full overflow-hidden border-r border-solid border-[var(--el-border-color)]"
    >
      <RouterView name="nav"></RouterView>
    </div>
    <div class="flex-1 flex flex-col">
      <RouterView name="header"></RouterView>
      <RouterView />
    </div>
  </div>
</template>

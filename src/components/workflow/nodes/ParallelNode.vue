<template>
  <div class="parallel-node">
    <div class="node-header">
      <el-icon><Connection /></el-icon>
      <span class="node-title">Parallel</span>
    </div>
    <div class="node-content">
      <div class="node-info">Split into parallel flows</div>
    </div>
    <!-- Input handle -->
    <Handle type="target" :position="Position.Left" class="input-handle" />
    <!-- Output handle -->
    <Handle type="source" :position="Position.Right" class="output-handle" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { Grid } from '@element-plus/icons-vue'

interface Props {
  data: {
    label: string
    config: any
  }
}
defineProps<Props>()
</script>

<style scoped>
.parallel-node {
  width: 180px;
  height: 80px;
  border: 2px solid #8b5cf6;
  border-radius: 8px;
  background: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  position: relative;
}

.node-header {
  padding: 8px;
  background-color: #ede9fe;
  border-bottom: 1px solid #ddd6fe;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.node-title {
  font-weight: 600;
  color: #581c87;
  font-size: 14px;
}

.node-content {
  padding: 8px;
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-info {
  color: #6b7280;
  font-size: 12px;
}

.input-handle {
  background: #8b5cf6;
  border: 2px solid white;
  width: 12px;
  height: 12px;
}

.output-handle {
  background: #8b5cf6;
  border: 2px solid white;
  width: 12px;
  height: 12px;
}
</style>
<template>
  <div class="trigger-node">
    <div class="node-header">
      <el-icon><VideoPlay /></el-icon>
      <span class="node-title">Trigger</span>
    </div>
    <div class="node-content">
      <div class="node-info">Starts the workflow</div>
    </div>
    <!-- Output handle -->
    <Handle type="source" :position="Position.Right" class="output-handle" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { CaretRight } from '@element-plus/icons-vue'

interface Props {
  data: {
    label: string
    config: any
  }
}
defineProps<Props>()
</script>

<style scoped>
.trigger-node {
  width: 180px;
  height: 80px;
  border: 2px solid #10b981;
  border-radius: 8px;
  background: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  position: relative;
}

.node-header {
  padding: 8px;
  background-color: #ecfdf5;
  border-bottom: 1px solid #d1fae5;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.node-title {
  font-weight: 600;
  color: #065f46;
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

.output-handle {
  background: #10b981;
  border: 2px solid white;
  width: 12px;
  height: 12px;
}
</style>
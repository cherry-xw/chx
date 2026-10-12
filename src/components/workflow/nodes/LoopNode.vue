<template>
  <div class="loop-node">
    <div class="node-header">
      <el-icon><Refresh /></el-icon>
      <span class="node-title">Loop</span>
    </div>
    <div class="node-content">
      <div class="node-info">Repeat until condition</div>
    </div>
    <!-- Input handle -->
    <Handle type="target" :position="Position.Left" class="input-handle" />
    <!-- Output handle for regular flow -->
    <Handle
      type="source"
      :position="Position.Right"
      :id="'output'"
      class="output-handle regular-output"
      style="top: 30%"
    />
    <!-- Output handle for loop body -->
    <Handle
      type="source"
      :position="Position.Bottom"
      :id="'loop-body'"
      class="output-handle loop-output"
      style="left: 50%; transform: translateX(-50%); bottom: -6px;"
    />
  </div>
</template>

<script setup lang="ts">
import { ElIcon } from 'element-plus'
import 'element-plus/es/components/icon/style/css'
import { Handle, Position } from '@vue-flow/core'
import { Refresh } from '@element-plus/icons-vue'

interface Props {
  data: {
    label: string
    config: any
  }
}
defineProps<Props>()
</script>

<style scoped>
.loop-node {
  width: 180px;
  height: 100px;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  background: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  position: relative;
}

.node-header {
  padding: 8px;
  background-color: #dbeafe;
  border-bottom: 1px solid #bfdbfe;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.node-title {
  font-weight: 600;
  color: #1e3a8a;
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
  background: #3b82f6;
  border: 2px solid white;
  width: 12px;
  height: 12px;
}

.output-handle {
  background: #3b82f6;
  border: 2px solid white;
  width: 12px;
  height: 12px;
}

.regular-output {
  right: -6px;
}

.loop-output {
  right: -6px;
}
</style>

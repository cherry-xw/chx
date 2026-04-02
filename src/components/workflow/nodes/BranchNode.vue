<template>
  <div class="branch-node">
    <div class="node-header">
      <el-icon><Share /></el-icon>
      <span class="node-title">Branch</span>
    </div>
    <div class="node-content">
      <div class="node-info">Conditional logic</div>
    </div>
    <!-- Input handle -->
    <Handle type="target" :position="Position.Left" class="input-handle" />
    <!-- Output handles for conditions -->
    <Handle
      v-for="(condition, index) in conditions"
      :key="index"
      type="source"
      :position="Position.Right"
      :id="`condition-${index}`"
      :class="['output-handle', 'condition-handle']"
      :style="{ top: `${25 + index * 20}%` }"
    />
    <!-- Default output handle -->
    <Handle
      type="source"
      :position="Position.Bottom"
      :id="'default'"
      class="output-handle default-handle"
      style="left: 50%; transform: translateX(-50%); bottom: -6px;"
    />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { Share } from '@element-plus/icons-vue'

interface Props {
  data: {
    label: string
    config: any
  }
  conditions?: Array<string>
}
const props = withDefaults(defineProps<Props>(), {
  conditions: () => ['Condition 1', 'Condition 2']
})
</script>

<style scoped>
.branch-node {
  width: 180px;
  height: 120px;
  border: 2px solid #f59e0b;
  border-radius: 8px;
  background: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  position: relative;
}

.node-header {
  padding: 8px;
  background-color: #fef3c7;
  border-bottom: 1px solid #fde68a;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.node-title {
  font-weight: 600;
  color: #92400e;
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
  background: #f59e0b;
  border: 2px solid white;
  width: 12px;
  height: 12px;
}

.output-handle {
  background: #f59e0b;
  border: 2px solid white;
  width: 12px;
  height: 12px;
}

.condition-handle {
  right: -6px;
}

.default-handle {
  right: -6px;
}
</style>
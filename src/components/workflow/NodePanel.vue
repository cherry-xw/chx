<template>
  <div class="node-panel">
    <el-collapse v-model="activeNames" accordion>
      <el-collapse-item
        v-for="group in nodes"
        :key="group.name"
        :title="group.title"
        :name="group.name"
      >
        <div
          v-for="node in group.items"
          :key="node.name"
          class="node-item"
          draggable
          @dragstart="handleDragStart($event, node)"
        >
          {{ node.label }}
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface NodeItem {
  name: string
  label: string
  type: string
  icon?: string
  [key: string]: any
}

interface NodeGroup {
  name: string
  title: string
  items: NodeItem[]
}

interface Props {
  nodes: NodeGroup[]
}

interface Emits {
  (e: 'drag-start', event: DragEvent, node: NodeItem): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const activeNames = ref([])

const handleDragStart = (event: DragEvent, node: NodeItem) => {
  event.dataTransfer?.setData('application/json', JSON.stringify(node))
  emit('drag-start', event, node)
}
</script>

<style scoped>
.node-panel {
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.node-item {
  padding: 8px 12px;
  margin: 4px 0;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: move;
  background-color: #fafafa;
  transition: all 0.2s;
}

.node-item:hover {
  background-color: #f0f0f0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style>
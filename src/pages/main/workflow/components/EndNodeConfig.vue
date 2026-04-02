<template>
  <div class="end-node-config">
    <el-form label-position="top">
      <el-form-item label="状态">
        <el-select v-model="node.data.status" placeholder="选择状态">
          <el-option label="成功完成" value="success" />
          <el-option label="失败" value="failed" />
          <el-option label="取消" value="cancelled" />
        </el-select>
      </el-form-item>
      <el-form-item label="输出">
        <el-input
          v-model="node.data.output"
          type="textarea"
          placeholder="输入结束节点输出"
          :rows="3"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Node } from '@vue-flow/core'

interface Props {
  node: Node
}

const props = defineProps<Props>()

// 定义 emits
const emit = defineEmits<{
  update: [node: Node]
}>()

// 监听节点数据变化并发出更新事件
watch(() => props.node, (newNode) => {
  emit('update', newNode)
}, { deep: true })
</script>

<style scoped>
.end-node-config {
  padding: 10px 0;
}
</style>
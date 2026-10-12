<template>
  <div class="start-node-config">
    <el-form label-position="top">
      <el-form-item label="状态">
        <el-select v-model="node.data.status" placeholder="选择状态">
          <el-option label="就绪" value="ready" />
          <el-option label="运行中" value="running" />
          <el-option label="完成" value="completed" />
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ElForm, ElFormItem, ElOption, ElSelect } from 'element-plus'
import 'element-plus/es/components/form/style/css'
import 'element-plus/es/components/form-item/style/css'
import 'element-plus/es/components/option/style/css'
import 'element-plus/es/components/select/style/css'
import { watch } from 'vue'
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
.start-node-config {
  padding: 10px 0;
}
</style>

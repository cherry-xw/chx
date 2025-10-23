<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { MqttClient } from 'mqtt'
import { ref, watch } from 'vue'

// --------------------------- config -------------------------------
defineOptions({ name: 'SubscribeView' })
const { clinet } = defineProps<{
  clinet: MqttClient | void
}>()
// ---------------------------- data --------------------------------
const topic = ref<string>('')
const isSubscribed = ref<boolean>(false)
// -------------------------- computed ------------------------------
// --------------------------- methods ------------------------------
async function handleSubscribe(auto = false) {
  if (!topic.value) {
    if (!auto) {
      ElMessage.warning('请输入topic')
    }
    return
  }
  try {
    const res = await clinet!.subscribeAsync(topic.value)
    isSubscribed.value = true
    console.log('订阅结果', res)
    ElMessage.success('订阅成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('订阅失败')
  }
}
// ---------------------------- watch -------------------------------
watch(
  () => clinet,
  (newVal) => {
    if (!newVal) {
      isSubscribed.value = false
    } else {
      // 自动重新订阅主题
      handleSubscribe(true)
    }
  }
)
// ---------------------------- life --------------------------------
// --------------------------- other --------------------------------
</script>

<template>
  <div class="Subscribe-container">
    <el-row :gutter="8">
      <el-col :span="24">
        <el-input v-model="topic" style="max-width: 600px" placeholder="请输入topic">
          <template #append>
            <el-button @click="handleSubscribe(false)">{{
              isSubscribed ? 'UnSubscribe' : 'Subscribe'
            }}</el-button>
          </template>
        </el-input>
      </el-col>
    </el-row>
    <el-row :gutter="8">
      <el-col :span="24">解析映射：</el-col>
    </el-row>
  </div>
</template>

<style lang="less" scoped>
//.Subscribe-container {}
</style>

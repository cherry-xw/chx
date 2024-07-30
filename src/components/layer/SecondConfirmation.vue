<script setup lang="ts">
import { ref } from 'vue'

// --------------------------- config --------------------------------
defineOptions({ name: 'SecondConfirmationView' })
const props = withDefaults(
  defineProps<{
    title?: string
    content?: string
    disabled?: boolean | (() => boolean)
  }>(),
  {
    title: '警告',
    content: '有修改内容未保存，是否直接退出？'
  }
)
const emits = defineEmits<{
  (ev: 'done'): void
}>()
// ---------------------------- data --------------------------------
const dialogState = ref(false)
// --------------------------- methods ------------------------------
function done() {
  dialogState.value = false
  emits('done')
}
function setState(state: boolean | MouseEvent = true) {
  console.log(props.disabled)
  if (props.disabled) {
    const disable = typeof props.disabled === 'boolean' ? props.disabled : props.disabled()
    console.log(disable)
    if (disable) {
      dialogState.value = Boolean(state)
    } else {
      emits('done')
    }
  } else {
    emits('done')
  }
}
// ---------------------------- watch -------------------------------
// -------------------------- computed ------------------------------
// ---------------------------- life --------------------------------
</script>

<template>
  <el-dialog v-model="dialogState" :title="props.title" width="480" append-to-body draggable>
    <div class="flex flex-row">
      <span>{{ props.content }}</span>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogState = false">取消</el-button>
        <el-button type="primary" @click="done">确认</el-button>
      </span>
    </template>
  </el-dialog>
  <slot :next="setState" />
</template>

<style lang="less" scoped></style>

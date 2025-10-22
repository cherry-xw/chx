<!-- @AIGC-BEGIN: -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'

// --------------------------- config -------------------------------
defineOptions({ name: 'BoxView' })
type Motion =
  | ''
  | 'Down'
  | 'Left'
  | 'Right'
  | 'Up'
  | 'TopLeft'
  | 'TopRight'
  | 'BottomLeft'
  | 'BottomRight'
  | 'X'
  | 'Y'
  | 'DownLeft'
  | 'DownRight'
  | 'UpLeft'
  | 'UpRight'
  | false
const props = withDefaults(
  defineProps<{
    random?: boolean
    which?: keyof typeof animate.value | ''
    in?: Motion
    out?: Motion
    immediate?: boolean
  }>(),
  {
    random: false,
    immediate: false,
    which: '',
    in: '',
    out: ''
  }
)
const show = defineModel<boolean>({ required: true })
// ---------------------------- data --------------------------------
const animate = ref({
  // 'Down' 'Left' 'Right' 'Up' 'TopLeft' 'TopRight' 'BottomLeft' 'BottomRight'
  bounce: {
    in: 'animate__animated animate__bounceIn',
    out: 'animate__animated animate__bounceOut'
  },
  // 'Down' 'Left' 'Right' 'Up' 'TopLeft' 'TopRight' 'BottomLeft' 'BottomRight'
  fade: {
    in: 'animate__animated animate__fadeIn',
    out: 'animate__animated animate__fadeOut'
  },
  // 'X' 'Y'
  flip: {
    in: 'animate__animated animate__flipIn',
    out: 'animate__animated animate__flipOut'
  },
  // 必入 Left Right
  lightspeed: {
    in: 'animate__animated animate__lightSpeedIn',
    out: 'animate__animated animate__lightSpeedOut'
  },
  // DownLeft DownRight UpLeft UpRight
  rotate: {
    in: 'animate__animated animate__rotateIn',
    out: 'animate__animated animate__rotateOut'
  },
  // Down Left Right Up
  zoom: {
    in: 'animate__animated animate__zoomIn',
    out: 'animate__animated animate__zoomOut'
  },
  roll: {
    in: 'animate__animated animate__rollIn',
    out: 'animate__animated animate__rollOut'
  },
  jack: {
    in: 'animate__animated animate__jackInTheBox',
    out: 'animate__animated animate__rollOut'
  }
})
const animateInOut = ref({
  bounce: ['Down', 'Left', 'Right', 'Up', 'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'],
  fade: ['Down', 'Left', 'Right', 'Up', 'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'],
  flip: ['X', 'Y'],
  lightspeed: ['Left', 'Right'],
  rotate: ['DownLeft', 'DownRight', 'UpLeft', 'UpRight'],
  zoom: ['Down', 'Left', 'Right', 'Up'],
  roll: [],
  jack: []
})
const randomWhich = ref<keyof typeof animate.value>('bounce')
// -------------------------- computed ------------------------------
const whiches = computed(() => Object.keys(animate.value) as (keyof typeof animate.value)[])
const enter = computed(() => {
  if (props.random) {
    const arr = animateInOut.value[randomWhich.value]
    return animate.value[randomWhich.value].in + arr[Math.floor(Math.random() * arr.length)]
  }
  return props.which && props.in !== false ? animate.value[props.which].in + props.in : ''
})
const leave = computed(() => {
  if (props.random) {
    const arr = animateInOut.value[randomWhich.value]
    return animate.value[randomWhich.value].out + arr[Math.floor(Math.random() * arr.length)]
  }
  return props.which && props.out !== false ? animate.value[props.which].out + props.out : ''
})
// --------------------------- methods ------------------------------
// ---------------------------- watch -------------------------------
watch(show, (ss) => {
  if (!ss) {
    randomWhich.value = whiches.value[Math.floor(Math.random() * whiches.value.length)]
  }
})
// ---------------------------- life --------------------------------
// --------------------------- other --------------------------------
</script>

<template>
  <transition
    mode="out-in"
    :appear="immediate"
    :enter-active-class="enter"
    :leave-active-class="leave"
  >
    <div class="anim-box-container" v-show="show">
      <slot />
    </div>
  </transition>
</template>

<style lang="less" scoped>
.anim-box-container {
  width: 100%;
  height: 100%;
}
</style>
<!-- @AIGC-END -->

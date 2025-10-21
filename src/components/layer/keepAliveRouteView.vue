<script lang="ts">
class KeepAliveHandler {
  _: Record<string, any> = {}
  constructor() {}
  //绑定keepAlive信息
  bind(keepAlive: any) {
    if (keepAlive && keepAlive.$.__v_cache) {
      const sharedContext = keepAlive.$.ctx
      const instance = keepAlive.$
      const { suspense: parentSuspense, __v_cache: cache } = instance
      const {
        renderer: { um: unmount }
      } = sharedContext

      Object.assign(this._, {
        cache() {
          return cache
        },
        unmount(vnode: any) {
          resetShapeFlag(vnode)
          unmount(vnode, instance, parentSuspense, true)
        },
        isCurrent(key: string) {
          return keepAlive.$.subTree && keepAlive.$.subTree.key === key
        }
      })
    } else {
      console.warn('当且仅当开发环境或者启用了devtool时生效')
    }
  }

  //删除指定key的缓存
  remove(key: string, reset = true) {
    pruneCache.call(this, (k: string) => key !== k, reset)
  }
  //清空
  clear() {
    pruneCache.call(this, () => false, false)
  }
}

function pruneCache(
  this: InstanceType<typeof KeepAliveHandler>,
  filter: (k: string) => boolean,
  reset: boolean
) {
  const { cache, unmount, isCurrent } = this._
  if (!cache || !cache()) {
    return
  }
  const c = cache()
  c.set = new Map().set
  c.forEach((vnode: any, key: string) => {
    if (!filter(key)) {
      if (isCurrent(key)) {
        //重写set，因为渲染函数可能会重新执行
        //这样就会导致缓存重新添加，导致清除失败
        if (reset) {
          c.set = function () {
            c.set = new Map().set
          }
        }
        resetShapeFlag(vnode)
      } else {
        unmount(vnode)
      }
      c.delete(key)
    }
  })
}

function resetShapeFlag(vnode: any) {
  let shapeFlag = vnode.shapeFlag
  if (shapeFlag & 256) {
    shapeFlag -= 256
  }
  if (shapeFlag & 512) {
    shapeFlag -= 512
  }
  vnode.shapeFlag = shapeFlag
}
const handler = new KeepAliveHandler()
export const removePageCahce = (name: string) => {
  handler.remove(name)
}
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { onMounted } from 'vue'
import { getCurrentInstance } from 'vue'

// --------------------------- config --------------------------------
defineOptions({ name: 'KeepAliveRouteViewView' })
const instance = getCurrentInstance()
// ---------------------------- data --------------------------------
const keepAliveDom = ref()
// --------------------------- methods ------------------------------
// ---------------------------- watch -------------------------------
// -------------------------- computed ------------------------------
// ---------------------------- life --------------------------------
onMounted(() => {
  const keepAlive = instance?.refs.keepAlive
  handler.bind(keepAliveDom.value)
})
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <KeepAlive ref="keepAliveDom">
      <component :is="Component" :key="route.name" />
    </KeepAlive>
  </RouterView>
</template>

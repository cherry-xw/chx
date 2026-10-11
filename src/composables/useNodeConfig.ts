// 定义节点配置组件映射
const nodeConfigComponents: Record<string, any> = {
  trigger: () => import('@/pages/main/workflow/components/StartNodeConfig.vue'),
  branch: () => import('@/pages/main/workflow/components/TaskNodeConfig.vue'),
  loop: () => import('@/pages/main/workflow/components/DecisionNodeConfig.vue'),
  parallel: () => import('@/pages/main/workflow/components/TaskNodeConfig.vue'),
  end: () => import('@/pages/main/workflow/components/EndNodeConfig.vue'),
  // Legacy mappings to maintain compatibility
  start: () => import('@/pages/main/workflow/components/StartNodeConfig.vue'),
  task: () => import('@/pages/main/workflow/components/TaskNodeConfig.vue'),
  decision: () => import('@/pages/main/workflow/components/DecisionNodeConfig.vue'),
  // Fallback for unknown node types
  default: () => import('@/pages/main/workflow/components/EndNodeConfig.vue')
}

/**
 * 节点配置相关的 Composable
 */
export function useNodeConfig() {
  /**
   * 根据节点类型获取对应的配置组件
   */
  const getConfigComponent = (nodeType: string) => {
    if (nodeConfigComponents[nodeType]) {
      return nodeConfigComponents[nodeType]()
    }
    // Try default component for unknown node types
    if (nodeConfigComponents['default']) {
      return nodeConfigComponents['default']()
    }
    return null
  }

  return {
    getConfigComponent
  }
}
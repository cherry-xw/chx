import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Workflow, WorkflowNode, WorkflowEdge } from '@/types/workflow'
import type { TriggerConfig } from '@/types/node'
import { workflowDB } from '@/db/workflow-db'

export const useWorkflowStore = defineStore('workflow', () => {
  // State
  const currentWorkflowId = ref<string | null>(null)
  const workflowName = ref<string>('')
  const nodes = ref<WorkflowNode[]>([])
  const edges = ref<WorkflowEdge[]>([])
  const variables = ref<Record<string, any>>({})
  const selectedNode = ref<WorkflowNode | null>(null)
  const trigger = ref<TriggerConfig>({ type: 'manual' })

  // Computed
  const hasUnsavedChanges = computed(() => {
    // For now, assume changes exist if we have a workflow with content
    // A production implementation would track the original state vs current state
    return workflowName.value !== '' ||
           nodes.value.length > 0 ||
           edges.value.length > 0 ||
           Object.keys(variables.value).length > 0
  })

  // Methods
  const createNewWorkflow = () => {
    currentWorkflowId.value = null
    workflowName.value = ''
    nodes.value = []
    edges.value = []
    variables.value = {}
    trigger.value = { type: 'manual' }
    selectedNode.value = null
  }

  const loadWorkflow = async (id: string) => {
    const workflow = await workflowDB.get(id)
    if (workflow) {
      currentWorkflowId.value = workflow.id
      workflowName.value = workflow.name
      nodes.value = workflow.nodes
      edges.value = workflow.edges
      variables.value = workflow.variables || {}
      trigger.value = workflow.trigger
      selectedNode.value = null
    }
  }

  const saveWorkflow = async (): Promise<string> => {
    // Create workflow data based on whether we're updating or creating
    let workflowData: Workflow

    if (currentWorkflowId.value) {
      // Retrieve existing workflow to preserve original createdAt
      const existingWorkflow = await workflowDB.get(currentWorkflowId.value)

      workflowData = {
        id: currentWorkflowId.value,
        name: workflowName.value,
        nodes: nodes.value,
        edges: edges.value,
        variables: variables.value,
        trigger: trigger.value, // Use the current trigger configuration
        version: existingWorkflow?.version || '1.0.0', // Preserve original version or use default
        status: existingWorkflow?.status || 'draft', // Preserve original status or use default
        createdAt: existingWorkflow?.createdAt || new Date().toISOString(), // Preserve original creation time
        updatedAt: new Date().toISOString()
      }
      await workflowDB.update(workflowData)
    } else {
      // Create new workflow
      const newId = crypto.randomUUID() // Use crypto API to generate UUID
      workflowData = {
        id: newId,
        name: workflowName.value,
        nodes: nodes.value,
        edges: edges.value,
        variables: variables.value,
        trigger: trigger.value, // Use the current trigger configuration
        version: '1.0.0', // Default version, should be configurable
        status: 'draft', // Default status, should be configurable
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      await workflowDB.create(workflowData)
      currentWorkflowId.value = newId
    }

    return workflowData.id
  }

  const addNode = (node: WorkflowNode) => {
    // Check if node already exists
    const existingIndex = nodes.value.findIndex(n => n.id === node.id)
    if (existingIndex >= 0) {
      nodes.value[existingIndex] = node
    } else {
      nodes.value.push(node)
    }
  }

  const removeNode = (nodeId: string) => {
    // Remove the node
    nodes.value = nodes.value.filter(node => node.id !== nodeId)

    // Also remove connected edges
    edges.value = edges.value.filter(
      edge => edge.source !== nodeId && edge.target !== nodeId
    )

    // Clear selection if the selected node was removed
    if (selectedNode.value?.id === nodeId) {
      selectedNode.value = null
    }
  }

  const updateNode = (nodeId: string, updates: Partial<WorkflowNode>) => {
    const nodeIndex = nodes.value.findIndex(node => node.id === nodeId)
    if (nodeIndex >= 0) {
      nodes.value[nodeIndex] = { ...nodes.value[nodeIndex], ...updates }
    }
  }

  const addEdge = (edge: WorkflowEdge) => {
    // Check if edge already exists
    const existingIndex = edges.value.findIndex(e => e.id === edge.id)
    if (existingIndex >= 0) {
      edges.value[existingIndex] = edge
    } else {
      edges.value.push(edge)
    }
  }

  const removeEdge = (edgeId: string) => {
    edges.value = edges.value.filter(edge => edge.id !== edgeId)
  }

  const selectNode = (node: WorkflowNode | null) => {
    selectedNode.value = node
  }

  const updateTrigger = (newTrigger: TriggerConfig) => {
    trigger.value = newTrigger
  }

  return {
    // State
    currentWorkflowId,
    workflowName,
    nodes,
    edges,
    variables,
    selectedNode,
    trigger,

    // Computed
    hasUnsavedChanges,

    // Methods
    createNewWorkflow,
    loadWorkflow,
    saveWorkflow,
    addNode,
    removeNode,
    updateNode,
    addEdge,
    removeEdge,
    selectNode,
    updateTrigger
  }
})
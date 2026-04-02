/**
 * Workflow Node Configuration Types
 *
 * This file defines configuration interfaces for each workflow node type.
 * These configurations are used in the `data.config` field of WorkflowNode.
 */

// ============================================================================
// TriggerConfig - Workflow Trigger Configuration
// ============================================================================

/**
 * Trigger configuration for workflow execution
 * Defines how a workflow can be started
 */
export interface TriggerConfig {
  /** Type of trigger */
  type: 'manual' | 'webhook' | 'schedule'
  /** Webhook path (required when type is 'webhook') */
  webhookPath?: string
  /** Schedule configuration (required when type is 'schedule') */
  scheduleConfig?: {
    /** Cron expression for scheduling */
    cron: string
  }
}

// ============================================================================
// BranchConfig - Conditional Branching Configuration
// ============================================================================

/**
 * Branch configuration for conditional routing
 * Enables workflow to take different paths based on conditions
 */
export interface BranchConfig {
  /** Array of conditional branches */
  conditions: Array<{
    /** Human-readable label for this branch */
    label: string
    /** Expression to evaluate (e.g., "${variable} > 10") */
    expression: string
    /** Target node ID to execute when condition is met */
    targetNode: string
  }>
  /** Default branch node ID when no condition is met */
  defaultBranch: string
}

// ============================================================================
// LoopConfig - Iteration Configuration
// ============================================================================

/**
 * Loop configuration for iterating over collections
 * Enables repeated execution of a set of nodes
 */
export interface LoopConfig {
  /** Number of iterations to perform */
  iterations: number
  /** Array of node IDs to execute in each iteration */
  bodyNodes: string[]
}

// ============================================================================
// ParallelConfig - Parallel Execution Configuration
// ============================================================================

/**
 * Parallel configuration for concurrent execution
 * Enables multiple workflow branches to execute simultaneously
 */
export interface ParallelConfig {
  /** Array of node IDs to execute in parallel */
  parallelNodes: string[]
}

// ============================================================================
// EndConfig - Terminal Node Configuration
// ============================================================================

/**
 * End configuration for workflow termination
 * Defines the final output of the workflow
 */
export interface EndConfig {
  /** Output value to return when workflow ends */
  outputValue?: unknown
}
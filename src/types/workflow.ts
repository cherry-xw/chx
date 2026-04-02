/**
 * Workflow Editor Core Type Definitions
 *
 * This file defines the core data structures for the workflow editor system.
 * These types are used across the entire workflow module.
 */

// ============================================================================
// Trigger Configuration (Placeholder - will be fully defined in Task 2)
// ============================================================================

/**
 * Trigger configuration for workflow execution
 * @see Task 2 for full implementation
 */
export interface TriggerConfig {
  type: string
}

// ============================================================================
// Workflow - Main Interface
// ============================================================================

/**
 * Represents a complete workflow definition
 */
export interface Workflow {
  /** Unique identifier for the workflow */
  id: string
  /** Human-readable name of the workflow */
  name: string
  /** Array of nodes in the workflow */
  nodes: WorkflowNode[]
  /** Array of edges connecting nodes */
  edges: WorkflowEdge[]
  /** Trigger configuration for workflow execution */
  trigger: TriggerConfig
  /** Workflow-level variables */
  variables: Record<string, any>
  /** Version of the workflow schema */
  version: string
  /** Current status of the workflow */
  status: 'draft' | 'published' | 'archived'
  /** ISO timestamp of workflow creation */
  createdAt: string
  /** ISO timestamp of last update */
  updatedAt: string
}

// ============================================================================
// WorkflowNode - Node Definition
// ============================================================================

/**
 * Represents a single node in the workflow
 */
export interface WorkflowNode {
  /** Unique identifier for the node */
  id: string
  /**
   * Type of the node
   * - 'trigger': Start node that triggers workflow execution
   * - 'branch': Conditional branching node
   * - 'loop': Iteration over collections
   * - 'parallel': Parallel execution paths
   * - 'end': Terminal node
   * - `plugin:${string}`: Custom plugin node type
   */
  type: 'trigger' | 'branch' | 'loop' | 'parallel' | 'end' | `plugin:${string}`
  /** Position of the node in the canvas */
  position: { x: number; y: number }
  /** Node data including configuration and ports */
  data: {
    /** Human-readable label for the node */
    label: string
    /** Node-specific configuration */
    config: NodeConfig
    /** Input port definitions */
    inputs: PortDefinition[]
    /** Output port definitions */
    outputs: PortDefinition[]
    /** Optional extensions attached to this node */
    extensions?: ExtensionConfig[]
  }
}

/**
 * Node configuration object
 * Structure varies based on node type
 */
export interface NodeConfig {
  [key: string]: any
}

/**
 * Defines a port (input/output) on a node
 */
export interface PortDefinition {
  /** Internal name/identifier of the port */
  name: string
  /** Type of the port */
  type: 'data' | 'trigger' | 'condition'
  /** Human-readable label for the port */
  label: string
  /** Whether this port is required for the node to function */
  required?: boolean
  /** Whether multiple connections can be made to this port */
  multiple?: boolean
}

// ============================================================================
// ExtensionConfig - Node Extension Mechanism
// ============================================================================

/**
 * Configuration for node extensions
 */
export interface ExtensionConfig {
  /** Type of extension */
  type: 'retry' | 'monitor' | 'timeout' | 'error-handler'
  /** Extension-specific configuration parameters */
  config: ExtensionConfigParams
}

/**
 * Parameters for extension configuration
 * Different extensions use different subsets of these parameters
 */
export interface ExtensionConfigParams {
  // Retry extension parameters
  /** Maximum number of retry attempts */
  maxRetries?: number
  /** Delay between retries in milliseconds */
  delay?: number
  /** Backoff strategy for retries */
  backoff?: 'fixed' | 'exponential'

  // Monitor extension parameters
  /** Logging level for monitoring */
  logLevel?: 'info' | 'warn' | 'error'
  /** Metrics to collect */
  metrics?: Array<'duration' | 'memory' | 'cpu'>

  // Timeout extension parameters
  /** Timeout duration in milliseconds */
  duration?: number

  // Error Handler extension parameters
  /** Fallback value when error occurs */
  fallback?: any
  /** Whether to continue workflow execution on error */
  continueOnError?: boolean
}

// ============================================================================
// WorkflowEdge - Connection Definition
// ============================================================================

/**
 * Represents a connection between two nodes
 */
export interface WorkflowEdge {
  /** Unique identifier for the edge */
  id: string
  /** Source node ID */
  source: string
  /** Target node ID */
  target: string
  /** Specific output handle on the source node */
  sourceHandle?: string
  /** Specific input handle on the target node */
  targetHandle?: string
  /** Type of edge connection */
  type: 'default' | 'condition'
  /** Additional edge data */
  data?: {
    /** Condition expression for conditional edges */
    condition?: string
    /** Human-readable label for the edge */
    label?: string
  }
}

// ============================================================================
// JSONSchema - JSON Schema Definition
// ============================================================================

/**
 * JSON Schema definition for workflow validation
 */
export interface JSONSchema {
  /** Schema type (always 'object' for root) */
  type: 'object'
  /** Property definitions */
  properties: Record<
    string,
    {
      /** Type of the property */
      type: string
      /** Human-readable title */
      title: string
      /** Description of the property */
      description?: string
      /** Default value */
      default?: any
      /** Enum values if applicable */
      enum?: any[]
      /** Whether this property is required */
      required?: boolean
      /** Items schema for array types */
      items?: any
    }
  >
}
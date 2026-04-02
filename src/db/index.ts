import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'

/**
 * IndexedDB Schema for CheryWorkflow Editor
 * Stores workflows, executions, plugins, and extension configurations
 */
interface WorkflowDatabase extends DBSchema {
  workflows: {
    key: string
    value: {
      id: string
      name: string
      nodes: any[]
      edges: any[]
      trigger: any
      variables: Record<string, any>
      version: string
      status: 'draft' | 'published' | 'archived'
      createdAt: string
      updatedAt: string
    }
    indexes: {
      'by-status': string
      'by-createdAt': string
      'by-updatedAt': string
    }
  }

  executions: {
    key: string
    value: {
      id: string
      workflowId: string
      status: 'running' | 'completed' | 'failed' | 'cancelled'
      startTime: string
      endTime?: string
      logs: any[]
      context: any
    }
    indexes: {
      'by-workflowId': string
      'by-status': string
      'by-createdAt': string
    }
  }

  plugins: {
    key: string
    value: {
      id: string
      name: string
      version: string
      category: string
      description: string
      capabilities: any
      paramsSchema: any
      inputs: any[]
      outputs: any[]
      execute: string
    }
    indexes: {
      'by-category': string
      'by-version': string
    }
  }

  extensionConfig: {
    key: string
    value: any
  }
}

const DB_NAME = 'CheryWorkflowDB'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<WorkflowDatabase> | null = null

/**
 * Initialize the IndexedDB database
 * Creates object stores and indexes if they don't exist
 * @returns Promise<IDBPDatabase<WorkflowDatabase>>
 */
export async function initDB(): Promise<IDBPDatabase<WorkflowDatabase>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<WorkflowDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // workflows store
      if (!db.objectStoreNames.contains('workflows')) {
        const workflowStore = db.createObjectStore('workflows', { keyPath: 'id' })
        workflowStore.createIndex('by-status', 'status')
        workflowStore.createIndex('by-createdAt', 'createdAt')
        workflowStore.createIndex('by-updatedAt', 'updatedAt')
      }

      // executions store
      if (!db.objectStoreNames.contains('executions')) {
        const executionStore = db.createObjectStore('executions', { keyPath: 'id' })
        executionStore.createIndex('by-workflowId', 'workflowId')
        executionStore.createIndex('by-status', 'status')
        executionStore.createIndex('by-createdAt', 'startTime')
      }

      // plugins store
      if (!db.objectStoreNames.contains('plugins')) {
        const pluginStore = db.createObjectStore('plugins', { keyPath: 'id' })
        pluginStore.createIndex('by-category', 'category')
        pluginStore.createIndex('by-version', 'version')
      }

      // extensionConfig store
      if (!db.objectStoreNames.contains('extensionConfig')) {
        db.createObjectStore('extensionConfig', { keyPath: 'key' })
      }
    }
  })

  return dbInstance
}

/**
 * Get the initialized database instance
 * @throws Error if database not initialized
 * @returns IDBPDatabase<WorkflowDatabase>
 */
export function getDB(): IDBPDatabase<WorkflowDatabase> {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDB() first.')
  }
  return dbInstance
}

/**
 * Close the database connection
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

export type { WorkflowDatabase }
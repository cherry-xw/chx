import { getDB } from './index'
import type { Workflow } from '@/types/workflow'

export class WorkflowDB {
  async create(workflow: Workflow): Promise<void> {
    const db = getDB()
    workflow.createdAt = new Date().toISOString()
    workflow.updatedAt = new Date().toISOString()
    await db.put('workflows', workflow)
  }

  async get(id: string): Promise<Workflow | undefined> {
    const db = getDB()
    return await db.get('workflows', id)
  }

  async update(workflow: Workflow): Promise<void> {
    const db = getDB()
    workflow.updatedAt = new Date().toISOString()
    await db.put('workflows', workflow)
  }

  async delete(id: string): Promise<void> {
    const db = getDB()
    await db.delete('workflows', id)
  }

  async list(filter?: { status?: string }): Promise<Workflow[]> {
    const db = getDB()

    if (filter?.status) {
      return await db.getAllFromIndex('workflows', 'by-status', filter.status)
    }

    return await db.getAll('workflows')
  }

  async getAll(): Promise<Workflow[]> {
    const db = getDB()
    return await db.getAll('workflows')
  }
}

export const workflowDB = new WorkflowDB()
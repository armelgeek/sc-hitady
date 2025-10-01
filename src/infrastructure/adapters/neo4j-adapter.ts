import { auth, driver, type Driver, type Session } from 'neo4j-driver'

import type { DatabaseAdapter } from '@/infrastructure/adapters/database-adapter'

export class Neo4jAdapter implements DatabaseAdapter {
  private readonly driverAdapter: Driver
  private session: Session | null = null

  constructor() {
    this.driverAdapter = driver(
      Bun.env.NEO4J_URI || '',
      auth.basic(Bun.env.NEO4J_USER || '', Bun.env.NEO4J_PASSWORD || '')
    )
  }

  async connect(): Promise<void> {
    const session = this.driverAdapter.session({
      defaultAccessMode: 'WRITE'
    })
    try {
      await session.run('RETURN 1 AS test')
    } finally {
      await session.close()
    }
  }

  async disconnect(): Promise<void> {
    if (this.session) {
      await this.session.close()
      this.session = null
    }
    await this.driverAdapter.close()
  }

  async executeQuery(query: string, params: { [key: string]: any }) {
    const session = this.driverAdapter.session({
      defaultAccessMode: 'WRITE'
    })

    try {
      return await session.run(query, params)
    } finally {
      await session.close()
    }
  }

  getSession(): Session {
    return this.driverAdapter.session({
      defaultAccessMode: 'WRITE'
    })
  }
}

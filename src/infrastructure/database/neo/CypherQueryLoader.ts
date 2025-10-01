import fs from 'node:fs'
import path from 'node:path'
import { Neo4jAdapter } from '@/infrastructure/adapters/neo4j-adapter'

export interface QueryResult {
  records: any[]
  summary: any
}

export class CypherQueryLoader {
  private readonly queries = new Map<string, string>()
  private readonly neo4jAdapter: Neo4jAdapter
  private readonly cypherBasePath: string

  constructor(cypherBasePath?: string) {
    this.neo4jAdapter = new Neo4jAdapter()
    this.cypherBasePath = cypherBasePath || path.join(__dirname, 'neo4j', 'cypher')
  }

  private loadQuery(entity: string, queryName: string): string {
    const cacheKey = `${entity}:${queryName}`

    if (this.queries.has(cacheKey)) {
      return this.queries.get(cacheKey)!
    }

    const filePath = path.join(this.cypherBasePath, entity, `${queryName}.cypher`)

    if (!fs.existsSync(filePath)) {
      throw new Error(`Fichier de requête non trouvé: ${filePath}`)
    }

    try {
      const queryContent = fs.readFileSync(filePath, 'utf-8').trim()

      if (!queryContent) {
        throw new Error(`Le fichier de requête est vide: ${filePath}`)
      }

      this.queries.set(cacheKey, queryContent)
      return queryContent
    } catch (error) {
      throw new Error(`Erreur lors du chargement de la requête ${filePath}: ${error}`)
    }
  }

  async run(entity: string, queryName: string, params: Record<string, any> = {}): Promise<QueryResult> {
    try {
      const query = this.loadQuery(entity, queryName)
      console.log(`📊 Exécution de la requête: ${entity}:${queryName}`, { params })

      return await this.neo4jAdapter.executeQuery(query, params)
    } catch (error) {
      console.error(`❌ Erreur lors de l'exécution de ${entity}:${queryName}:`, error)
      throw error
    }
  }

  clearCache(): void {
    this.queries.clear()
    console.log('🗑️ Cache des requêtes vidé')
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.queries.size,
      keys: Array.from(this.queries.keys())
    }
  }
}

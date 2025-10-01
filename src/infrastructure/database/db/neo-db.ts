import neo4j, { type Driver } from 'neo4j-driver'

export function createNeo4jDriver(): Driver {
  const uri = Bun.env.NEO4J_URI || 'bolt://localhost:7687'
  const user = Bun.env.NEO4J_USER || 'neo4j'
  const password = Bun.env.NEO4J_PASSWORD || 'password'

  return neo4j.driver(uri, neo4j.auth.basic(user, password))
}

export interface DatabaseAdapter {
  connect: () => any
  disconnect: () => Promise<void>
  executeQuery: (query: string, params: { [key: string]: any }) => any
  getSession: () => any
}

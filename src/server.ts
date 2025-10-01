import { App } from './app'
import { UserController } from './infrastructure/controllers'

const app = new App([new UserController()]).getApp()

// eslint-disable-next-line node/prefer-global/process
const PORT = process.env.PORT || 3000

console.info(`
\u001B[34m╔══════════════════════════════════════════════════════╗
║               \u001B[1mSC API\u001B[0m\u001B[34m                ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  \u001B[0m🚀 Server started successfully                   \u001B[34m║
║  \u001B[0m📡 Listening on: \u001B[36mhttp://localhost:${PORT}\u001B[34m        ║
║  \u001B[0m📚 API Docs: \u001B[36mhttp://localhost:${PORT}/docs\u001B[34m    ║
║  \u001B[0m📚 Auth Docs: \u001B[36mhttp://localhost:${PORT}/api/auth/reference\u001B[34m  ║
║                                                      ║
╚══════════════════════════════════════════════════════╝\u001B[0m
`)

export default app

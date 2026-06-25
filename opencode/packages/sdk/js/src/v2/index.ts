export * from "./client.js"
export * from "./server.js"

import { createXpengagentClient } from "./client.js"
import { createXpengagentServer } from "./server.js"
import type { ServerOptions } from "./server.js"

export * as data from "./data.js"

export async function createXpengagent(options?: ServerOptions) {
  const server = await createXpengagentServer({
    ...options,
  })

  const client = createXpengagentClient({
    baseUrl: server.url,
  })

  return {
    client,
    server,
  }
}

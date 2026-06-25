// @ts-nocheck

import { XPENGagent } from "@xpengagent/core"
import { ReadTool } from "@xpengagent/core/tools"

const xpengagent = XPENGagent.make({})

xpengagent.tool.add(ReadTool)

xpengagent.tool.add({
  name: "bash",
  schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to run.",
      },
    },
    required: ["command"],
  },
  execute(input, ctx) {},
})

xpengagent.auth.add({
  provider: "openai",
  type: "api",
  value: process.env.OPENAI_API_KEY,
})

xpengagent.agent.add({
  name: "build",
  permissions: [],
  model: {
    id: "gpt-5-5",
    provider: "openai",
    variant: "xhigh",
  },
})

const sessionID = await xpengagent.session.create({
  agent: "build",
})

xpengagent.subscribe((event) => {
  console.log(event)
})

await xpengagent.session.prompt({
  sessionID,
  text: "hey what is up",
})

await xpengagent.session.prompt({
  sessionID,
  text: "what is up with this",
  files: [
    {
      mime: "image/png",
      uri: "data:image/png;base64,xxxx",
    },
  ],
})

await xpengagent.session.wait()

console.log(await xpengagent.session.messages(sessionID))

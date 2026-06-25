import { $ } from "bun"

await $`bun ./scripts/copy-icons.ts ${process.env.XPENGAGENT_CHANNEL ?? "dev"}`

await $`cd ../xpengagent && bun script/build-node.ts`

import type { WslXpengagentCheck, WslServerRuntime } from "./types"

export const wslRuntimeRetryable = (runtime: WslServerRuntime) =>
  runtime.kind === "failed" || runtime.kind === "stopped"

export async function enterWslXpengagentStep(
  distro: string,
  probe: (distro: string) => Promise<unknown>,
  select: (step: "xpengagent") => void,
) {
  await probe(distro)
  select("xpengagent")
}

export function wslXpengagentAction(check?: WslXpengagentCheck) {
  if (!check) return
  if (!check.resolvedPath) return "Install XPENGagent"
  if (check.matchesDesktop === false) return "Update XPENGagent"
}

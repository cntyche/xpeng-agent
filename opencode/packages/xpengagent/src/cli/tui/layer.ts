import { run as runTui, type TuiInput } from "@xpengagent/tui"
import { Global } from "@xpengagent/core/global"
import { Effect } from "effect"

export function run(input: TuiInput) {
  return runTui(input).pipe(Effect.provide(Global.defaultLayer))
}

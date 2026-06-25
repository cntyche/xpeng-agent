import { Context } from "effect"
import type { InstanceContext } from "@/project/instance-context"
import type { WorkspaceV2 } from "@xpengagent/core/workspace"

export const InstanceRef = Context.Reference<InstanceContext | undefined>("~xpengagent/InstanceRef", {
  defaultValue: () => undefined,
})

export const WorkspaceRef = Context.Reference<WorkspaceV2.ID | undefined>("~xpengagent/WorkspaceRef", {
  defaultValue: () => undefined,
})

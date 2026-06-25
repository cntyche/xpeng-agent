import { Config, ConfigProvider, Context, Effect, Layer, Option } from "effect"
import { ConfigService } from "@/effect/config-service"

const bool = (name: string) => Config.boolean(name).pipe(Config.withDefault(false))
const positiveInteger = (name: string) =>
  Config.number(name).pipe(
    Config.map((value) => (Number.isInteger(value) && value > 0 ? value : undefined)),
    Config.orElse(() => Config.succeed(undefined)),
  )
const experimental = bool("XPENGAGENT_EXPERIMENTAL")
const enabledByExperimental = (name: string) =>
  Config.all({ experimental, enabled: Config.boolean(name).pipe(Config.option) }).pipe(
    Config.map((flags) => Option.getOrElse(flags.enabled, () => flags.experimental)),
  )

export class Service extends ConfigService.Service<Service>()("@xpengagent/RuntimeFlags", {
  autoShare: bool("XPENGAGENT_AUTO_SHARE"),
  pure: bool("XPENGAGENT_PURE"),
  disableDefaultPlugins: bool("XPENGAGENT_DISABLE_DEFAULT_PLUGINS"),
  disableEmbeddedWebUi: bool("XPENGAGENT_DISABLE_EMBEDDED_WEB_UI"),
  disableExternalSkills: bool("XPENGAGENT_DISABLE_EXTERNAL_SKILLS"),
  disableLspDownload: bool("XPENGAGENT_DISABLE_LSP_DOWNLOAD"),
  disableClaudeCodePrompt: Config.all({
    broad: bool("XPENGAGENT_DISABLE_CLAUDE_CODE"),
    direct: bool("XPENGAGENT_DISABLE_CLAUDE_CODE_PROMPT"),
  }).pipe(Config.map((flags) => flags.broad || flags.direct)),
  disableClaudeCodeSkills: Config.all({
    broad: bool("XPENGAGENT_DISABLE_CLAUDE_CODE"),
    direct: bool("XPENGAGENT_DISABLE_CLAUDE_CODE_SKILLS"),
  }).pipe(Config.map((flags) => flags.broad || flags.direct)),
  enableExa: Config.all({
    experimental,
    enabled: bool("XPENGAGENT_ENABLE_EXA"),
    legacy: bool("XPENGAGENT_EXPERIMENTAL_EXA"),
  }).pipe(Config.map((flags) => flags.experimental || flags.enabled || flags.legacy)),
  enableParallel: Config.all({
    enabled: bool("XPENGAGENT_ENABLE_PARALLEL"),
    legacy: bool("XPENGAGENT_EXPERIMENTAL_PARALLEL"),
  }).pipe(Config.map((flags) => flags.enabled || flags.legacy)),
  enableExperimentalModels: bool("XPENGAGENT_ENABLE_EXPERIMENTAL_MODELS"),
  enableQuestionTool: bool("XPENGAGENT_ENABLE_QUESTION_TOOL"),
  experimentalReferences: enabledByExperimental("XPENGAGENT_EXPERIMENTAL_REFERENCES"),
  experimentalBackgroundSubagents: enabledByExperimental("XPENGAGENT_EXPERIMENTAL_BACKGROUND_SUBAGENTS"),
  experimentalLspTy: bool("XPENGAGENT_EXPERIMENTAL_LSP_TY"),
  experimentalLspTool: enabledByExperimental("XPENGAGENT_EXPERIMENTAL_LSP_TOOL"),
  experimentalOxfmt: enabledByExperimental("XPENGAGENT_EXPERIMENTAL_OXFMT"),
  experimentalPlanMode: enabledByExperimental("XPENGAGENT_EXPERIMENTAL_PLAN_MODE"),
  experimentalEventSystem: enabledByExperimental("XPENGAGENT_EXPERIMENTAL_EVENT_SYSTEM"),
  experimentalWorkspaces: enabledByExperimental("XPENGAGENT_EXPERIMENTAL_WORKSPACES"),
  experimentalIconDiscovery: enabledByExperimental("XPENGAGENT_EXPERIMENTAL_ICON_DISCOVERY"),
  outputTokenMax: positiveInteger("XPENGAGENT_EXPERIMENTAL_OUTPUT_TOKEN_MAX"),
  bashDefaultTimeoutMs: positiveInteger("XPENGAGENT_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS"),
  experimentalNativeLlm: bool("XPENGAGENT_EXPERIMENTAL_NATIVE_LLM"),
  experimentalWebSockets: bool("XPENGAGENT_EXPERIMENTAL_WEBSOCKETS"),
  client: Config.string("XPENGAGENT_CLIENT").pipe(Config.withDefault("cli")),
}) {}

export type Info = Context.Service.Shape<typeof Service>

const emptyConfigLayer = Service.defaultLayer.pipe(
  Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({}))),
  Layer.orDie,
)

export const layer = (overrides: Partial<Info> = {}) =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const flags = yield* Service
      return Service.of({ ...flags, ...overrides })
    }),
  ).pipe(Layer.provide(emptyConfigLayer))

export const defaultLayer = Service.defaultLayer.pipe(Layer.orDie)

export const node = LayerNode.make(defaultLayer, [])

export * as RuntimeFlags from "./runtime-flags"
import { LayerNode } from "@xpengagent/core/effect/layer-node"

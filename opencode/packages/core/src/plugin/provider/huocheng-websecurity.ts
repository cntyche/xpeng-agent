import { Effect } from "effect"
import { ModelV2 } from "../../model"
import { PluginV2 } from "../../plugin"
import { ProviderV2 } from "../../provider"

const BASE_URL = "https://api.iamhc.cn/v1"

const MODELS: Record<string, { name: string; context: number }> = {
  "deepseek-chat": { name: "DeepSeek V3", context: 65536 },
  "deepseek-reasoner": { name: "DeepSeek R1", context: 65536 },
  "qwen-plus": { name: "Qwen Plus", context: 131072 },
  "qwen-turbo": { name: "Qwen Turbo", context: 131072 },
  "glm-4-flash": { name: "GLM-4 Flash", context: 128000 },
  "hunyuan-turbo": { name: "Hunyuan Turbo", context: 32768 },
}

export const HuochengWebsecurityPlugin = PluginV2.define({
  id: PluginV2.ID.make("huocheng-websecurity"),
  effect: Effect.gen(function* () {
    return {
      "catalog.transform": Effect.fn(function* (evt) {
        const providerID = ProviderV2.ID.make("huocheng-websecurity")
        evt.provider.update(providerID, (provider) => {
          provider.name = "\u5e7b\u57ce\u7f51\u5b89"
          provider.api = {
            type: "aisdk",
            package: "@ai-sdk/openai-compatible",
            url: BASE_URL,
          }
        })
        for (const [modelID, model] of Object.entries(MODELS)) {
          const mid = ModelV2.ID.make(modelID)
          evt.model.update(providerID, mid, (draft) => {
            draft.name = model.name
            draft.family = ModelV2.Family.make("openai-compatible")
            draft.capabilities = {
              tools: true,
              input: ["text"],
              output: ["text"],
            }
            draft.enabled = true
            draft.limit = {
              context: model.context,
              output: 16384,
            }
            draft.status = "active"
          })
        }
      }),
    }
  }),
})

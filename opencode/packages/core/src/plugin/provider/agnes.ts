import { Effect } from "effect"
import { ModelV2 } from "../../model"
import { PluginV2 } from "../../plugin"
import { ProviderV2 } from "../../provider"

const BASE_URL = "https://apihub.agnes-ai.com/v1"

const MODELS: Record<string, { name: string; context: number }> = {
  "agnes-2.0-flash": { name: "Agnes 2.0 Flash", context: 131072 },
}

export const AgnesPlugin = PluginV2.define({
  id: PluginV2.ID.make("agnes"),
  effect: Effect.gen(function* () {
    return {
      "catalog.transform": Effect.fn(function* (evt) {
        const providerID = ProviderV2.ID.make("agnes")
        evt.provider.update(providerID, (provider) => {
          provider.name = "Agnes"
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

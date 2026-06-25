import { describe, expect } from "bun:test"
import { DateTime, Effect, Layer, Option } from "effect"
import { Catalog } from "@xpengagent/core/catalog"
import { Credential } from "@xpengagent/core/credential"
import { EventV2 } from "@xpengagent/core/event"
import { Integration } from "@xpengagent/core/integration"
import { Location } from "@xpengagent/core/location"
import { ModelV2 } from "@xpengagent/core/model"
import { PluginV2 } from "@xpengagent/core/plugin"
import { XpengagentPlugin } from "@xpengagent/core/plugin/provider/xpengagent"
import { ProviderV2 } from "@xpengagent/core/provider"
import { AbsolutePath } from "@xpengagent/core/schema"
import { location } from "../fixture/location"
import { it, model, provider, withEnv } from "./provider-helper"

const cost = (input: number, output = 0) => [{ input, output, cache: { read: 0, write: 0 } }]
const locationLayer = Layer.succeed(
  Location.Service,
  Location.Service.of(location({ directory: AbsolutePath.make("test") })),
)

const pluginWithIntegrations = (integrations: Integration.Interface) => ({
  ...XpengagentPlugin,
  effect: XpengagentPlugin.effect.pipe(Effect.provideService(Integration.Service, integrations)),
})

describe("XpengagentPlugin", () => {
  it.effect("uses a public key and disables paid models without credentials", () =>
    withEnv({ XPENGAGENT_API_KEY: undefined }, () =>
      Effect.gen(function* () {
        const plugin = yield* PluginV2.Service
        const catalog = yield* Catalog.Service
        yield* plugin.add(pluginWithIntegrations(yield* Integration.Service))
        const transform = yield* catalog.transform()
        yield* transform((catalog) => {
          const item = provider("xpengagent")
          catalog.provider.update(item.id, () => {})
          const paid = model("xpengagent", "paid", { cost: cost(1) })
          catalog.model.update(item.id, paid.id, (draft) => {
            draft.cost = [...paid.cost]
          })
        })
        expect((yield* catalog.provider.get(ProviderV2.ID.xpengagent)).request.body.apiKey).toBe("public")
        expect((yield* catalog.model.get(ProviderV2.ID.xpengagent, ModelV2.ID.make("paid"))).enabled).toBe(false)
      }),
    ),
  )

  it.effect("keeps free models without credentials", () =>
    withEnv({ XPENGAGENT_API_KEY: undefined }, () =>
      Effect.gen(function* () {
        const plugin = yield* PluginV2.Service
        const catalog = yield* Catalog.Service
        yield* plugin.add(pluginWithIntegrations(yield* Integration.Service))
        const transform = yield* catalog.transform()
        yield* transform((catalog) => {
          const item = provider("xpengagent")
          catalog.provider.update(item.id, () => {})
          const free = model("xpengagent", "free", { cost: cost(0) })
          catalog.model.update(item.id, free.id, (draft) => {
            draft.cost = [...free.cost]
          })
        })
        expect((yield* catalog.provider.get(ProviderV2.ID.xpengagent)).request.body.apiKey).toBe("public")
        expect((yield* catalog.model.get(ProviderV2.ID.xpengagent, ModelV2.ID.make("free"))).enabled).toBe(true)
      }),
    ),
  )

  it.effect("treats output-only cost as free without credentials", () =>
    withEnv({ XPENGAGENT_API_KEY: undefined }, () =>
      Effect.gen(function* () {
        const plugin = yield* PluginV2.Service
        const catalog = yield* Catalog.Service
        yield* plugin.add(pluginWithIntegrations(yield* Integration.Service))
        const transform = yield* catalog.transform()
        yield* transform((catalog) => {
          const item = provider("xpengagent")
          catalog.provider.update(item.id, () => {})
          const outputOnly = model("xpengagent", "output-only", { cost: cost(0, 1) })
          catalog.model.update(item.id, outputOnly.id, (draft) => {
            draft.cost = [...outputOnly.cost]
          })
        })
        expect((yield* catalog.provider.get(ProviderV2.ID.xpengagent)).request.body.apiKey).toBe("public")
        expect((yield* catalog.model.get(ProviderV2.ID.xpengagent, ModelV2.ID.make("output-only"))).enabled).toBe(true)
      }),
    ),
  )

  it.effect("uses XPENGAGENT_API_KEY as credentials", () =>
    withEnv({ XPENGAGENT_API_KEY: "secret" }, () =>
      Effect.gen(function* () {
        const plugin = yield* PluginV2.Service
        const catalog = yield* Catalog.Service
        yield* plugin.add(pluginWithIntegrations(yield* Integration.Service))
        const transform = yield* catalog.transform()
        yield* transform((catalog) => {
          const item = provider("xpengagent")
          catalog.provider.update(item.id, () => {})
          const paid = model("xpengagent", "paid", { cost: cost(1) })
          catalog.model.update(item.id, paid.id, (draft) => {
            draft.cost = [...paid.cost]
          })
        })
        expect((yield* catalog.provider.get(ProviderV2.ID.xpengagent)).request.body.apiKey).toBeUndefined()
        expect((yield* catalog.model.get(ProviderV2.ID.xpengagent, ModelV2.ID.make("paid"))).enabled).toBe(true)
      }),
    ),
  )

  it.effect("uses configured provider env vars as credentials", () =>
    withEnv({ XPENGAGENT_API_KEY: undefined, CUSTOM_XPENGAGENT_API_KEY: "secret" }, () =>
      Effect.gen(function* () {
        const plugin = yield* PluginV2.Service
        const catalog = yield* Catalog.Service
        const integrations = yield* Integration.Service
        yield* plugin.add(pluginWithIntegrations(integrations))
        yield* integrations.update((editor) => {
          editor.method.update({
            integrationID: Integration.ID.make("xpengagent"),
            method: { type: "env", names: ["CUSTOM_XPENGAGENT_API_KEY"] },
          })
        })
        const transform = yield* catalog.transform()
        yield* transform((catalog) => {
          const item = provider("xpengagent")
          catalog.provider.update(item.id, () => {})
          const paid = model("xpengagent", "paid", { cost: cost(1) })
          catalog.model.update(item.id, paid.id, (draft) => {
            draft.cost = [...paid.cost]
          })
        })
        expect((yield* catalog.provider.get(ProviderV2.ID.xpengagent)).request.body.apiKey).toBeUndefined()
        expect((yield* catalog.model.get(ProviderV2.ID.xpengagent, ModelV2.ID.make("paid"))).enabled).toBe(true)
      }),
    ),
  )

  it.effect("uses configured apiKey as credentials", () =>
    withEnv({ XPENGAGENT_API_KEY: undefined }, () =>
      Effect.gen(function* () {
        const plugin = yield* PluginV2.Service
        const catalog = yield* Catalog.Service
        yield* plugin.add(pluginWithIntegrations(yield* Integration.Service))
        const transform = yield* catalog.transform()
        yield* transform((catalog) => {
          const item = provider("xpengagent", {
            request: {
              headers: {},
              body: { apiKey: "configured" },
            },
          })
          catalog.provider.update(item.id, (draft) => {
            draft.request = item.request
          })
          const paid = model("xpengagent", "paid", { cost: cost(1) })
          catalog.model.update(item.id, paid.id, (draft) => {
            draft.cost = [...paid.cost]
          })
        })
        expect((yield* catalog.provider.get(ProviderV2.ID.xpengagent)).request.body.apiKey).toBe("configured")
        expect((yield* catalog.model.get(ProviderV2.ID.xpengagent, ModelV2.ID.make("paid"))).enabled).toBe(true)
      }),
    ),
  )

  it.effect("ignores non-xpengagent providers and models", () =>
    withEnv({ XPENGAGENT_API_KEY: undefined }, () =>
      Effect.gen(function* () {
        const plugin = yield* PluginV2.Service
        const catalog = yield* Catalog.Service
        yield* plugin.add(pluginWithIntegrations(yield* Integration.Service))
        const transform = yield* catalog.transform()
        yield* transform((catalog) => {
          const item = provider("openai")
          catalog.provider.update(item.id, () => {})
          const paid = model("openai", "paid", { cost: cost(1) })
          catalog.model.update(item.id, paid.id, (draft) => {
            draft.cost = [...paid.cost]
          })
        })
        expect((yield* catalog.provider.get(ProviderV2.ID.openai)).request.body.apiKey).toBeUndefined()
        expect((yield* catalog.model.get(ProviderV2.ID.openai, ModelV2.ID.make("paid"))).enabled).toBe(true)
      }),
    ),
  )

  it.effect("prefers gpt-5-nano as the xpengagent small model", () =>
    Effect.gen(function* () {
      const catalog = yield* Catalog.Service
      const providerID = ProviderV2.ID.xpengagent

      const transform = yield* catalog.transform()
      yield* transform((catalog) => {
        catalog.provider.update(providerID, () => {})
        catalog.model.update(providerID, ModelV2.ID.make("cheap-mini"), (model) => {
          model.capabilities.input = ["text"]
          model.capabilities.output = ["text"]
          model.cost = [...cost(1, 1)]
          model.time.released = DateTime.makeUnsafe(Date.now())
        })
        catalog.model.update(providerID, ModelV2.ID.make("gpt-5-nano"), (model) => {
          model.capabilities.input = ["text"]
          model.capabilities.output = ["text"]
          model.cost = [...cost(10, 10)]
          model.time.released = DateTime.makeUnsafe(Date.now())
        })
      })

      const selected = yield* catalog.model.small(providerID)

      expect(Option.getOrUndefined(selected)?.id).toBe(ModelV2.ID.make("gpt-5-nano"))
    }).pipe(
      Effect.provide(Catalog.locationLayer.pipe(Layer.provide(EventV2.defaultLayer), Layer.provide(locationLayer))),
    ),
  )
})

# Tool Registry Analysis

> Quadrant: **Tool Registry** (`packages/core/src/tool/registry.ts` + `packages/opencode/src/tool/registry.ts`)
> Phase 0 baseline — read this before Phase 1 modifications.
> Status: Analysis is based on `opencode-dev.zip` snapshot from 2026-06-20.

---

## Two-Layer Architecture

Tool registration is split across two distinct registries **on purpose**:

| Aspect | Core (`packages/core/src/tool/`) | Opencode (`packages/opencode/src/tool/`) |
|--------|----------------------------------|------------------------------------------|
| Tool representation | Canonical `Tool.make({ description, input, output, execute, toModelOutput })` (`tool.ts`); opaque value | `Tool.Def` with Effect-typed execute, jsonSchema, parameters |
| Process-scope registration | `ApplicationTools.Service.register(...)` (process-global) | n/a — uses `Plugin.Service.list()` and filesystem glob |
| Location-scope registration | `Tools.Service.register({ [name]: tool })` (Location-scoped) | n/a — `InstanceState` carries `custom[]` |
| Authorization / execution | `settle(registration.tool, call, ctx)` | n/a — go through `pluginBridge.ask` for permission |
| Model definition export | `materialize(permissions)` → `definitions + settle` (used by V2 runner) | `tools(model)` → `Tool.Def[]` (used by V1 prompt loop) |

The two registries **don't import each other**, but the opencode registry instantiates `Agent.Service` and `Plugin.Service` for `fromPlugin` (`registry.ts:88-89, 108-109, 188`).

---

## Core Layer (Canonical) — `packages/core/src/tool/registry.ts`

**139 LOC.** Pure Effect service.

- **Types**:
  - `ExecuteInput` (`registry.ts:15-20`) — `{ sessionID, agent, assistantMessageID, call: ToolCall }`
- **Service interface** at `registry.ts:22-26`:
  - `materialize(permissions?): Effect.Effect<Materialization>`
  - `register(tools): Effect.Effect<void, RegistrationError, Scope.Scope>` — scoped
- `Materialization` (`registry.ts:28-31`) → `{ definitions: ReadonlyArray<ToolDefinition>; settle: (input) => Effect<Settlement, ToolOutputStore.Error> }`
- `Settlement` (`registry.ts:33-37`) → `{ result: ToolResultValue; output?; outputPaths? }`
- `ToolRegistry.Service` at `registry.ts:39` — tagged `"@opencode/v2/ToolRegistry"`
- `ToolRegistry.layer` (`registry.ts:41-124`) and `defaultLayer` (`registry.ts:136-139`)

Helpers used by the canonical tool factory (`tool.ts`): `definition`, `permission`, `settle`, `validateName`, `AnyTool`, `RegistrationError`.

---

## Opencode Layer (Application) — `packages/opencode/src/tool/registry.ts`

**440 LOC.** Application-layer facade that adds Effect-typed model definitions, plugin bridging, and filesystem auto-loading.

- `webSearchEnabled(providerID, flags)` (`registry.ts:56-58`)
- **Service interface** (`registry.ts:70-79`):
  - `ids(): Effect.Effect<string[]>`
  - `all(): Effect.Effect<Tool.Def[]>`
  - `named(): Effect.Effect<{ task, read }>`
  - `tools({ providerID, modelID, agent: Agent.Info }): Effect.Effect<Tool.Def[]>`
- `Service` tagged `"@opencode/ToolRegistry"` (`registry.ts:81`)
- `TaskDef`, `ReadDef` are inferred via `Tool.InferDef<...>` (`registry.ts:60-61`)
- Each instance carries `State = { custom, builtin, task, read }` (`registry.ts:63-68`)
- `layer` (`registry.ts:83-316`), `defaultLayer` (`registry.ts:318-340`), `node` (`registry.ts:418-438`)

`Tool.Def` shape (from `packages/opencode/src/tool/tool.ts`):

- `id: string`
- `parameters: Schema.Schema` (Effect Schema)
- `jsonSchema: JSONSchema7`
- `description?: string`
- `execute: (args, ctx) => Effect<{ output, metadata, title, attachments? }, ...>`

`Tool.Context` (`ctx` arg to `execute`) carries `sessionID, messageID, callID?, agent` (assembled inside `fromPlugin` adapter `registry.ts:132-168`).

---

## External Plugin / Tool Loading Today

The opencode registry **already supports** dynamic plugin and filesystem tools:

- **Filesystem auto-load** at `registry.ts:172-186`:
  1. Scans each config directory for `{tool,tools}/*.{js,ts}` via `Glob.scanSync(...)` with `{ absolute: true, dot, symlink }`.
  2. Awaits `config.waitForDependencies()` if any matches.
  3. `import(pathToFileURL(match).href)`.
  4. Treats modules as either `{ default: def }` (rename with path basename) or `{ named }` exports (`registry.ts:182-185`).
- **Plugin boot** at `registry.ts:188-193`: iterates `plugin.list()` and collects `p.tool ?? {}` entries.
- **Permission bridge** at `registry.ts:138-139`: hosts Effect `ask()` is bridged into a Promise via `EffectBridge.make()` so plugin callbacks can re-enter.
- **Truncation/wrap** at `registry.ts:147-158`: each tool executes through `Truncate.output`, returns `{ title, output, attachments, metadata }` with truncated marker + `outputPath`.
- **Span instrumentation** wraps each execute (`registry.ts:160-167`).
- **Built-in tool listing** at `registry.ts:198-215` is a manual list gated by feature flags (`questionEnabled`, `experimentalLspTool`, `experimentalPlanMode && client === "cli"`).
- **Post-process hook** at `registry.ts:289-293` fires `plugin.trigger("tool.definition", { toolID }, output)` per tool — mutates description / parameters / jsonSchema before adapter-visible.

---

## Permission Declarations on Tools

| Layer | Behavior |
|-------|----------|
| Core (`core/registry.ts:111-112`) | Filters tools by deriving `permission(registration.tool, name)`, then dropping entries matching `*` + `deny` (`whollyDisabled` at `core/registry.ts:131-134`). Definition-level filter (catalog visibility) only — settlement still executes captured leaves. |
| Opencode (`opencode`) | Does not filter on permission here; `tools()` delegates permission handling to `Permission` (V1) gating further downstream in `prompt.ts:113-1118` and during tool-execute in `SessionTools.resolve(...)` (`prompt.ts:1279-1293`). |

> **Critical Note (AGENTS.md-aligned)**: "Definition filtering is catalog visibility, not execution authorization." This means a private tool denied in the permission ruleset will not be advertised to the model — but if it somehow appears in a model's tool call, settlement will still execute. Our adapter therefore needs to do its own reflective deny handling at execution time, not just rely on the catalog filter.

---

## Extension Seams

For our Phase 1 adapter (the **private-tool-loader**), here are the readable places:

1. **Filesystem auto-load** at `opencode/src/tool/registry.ts:172-186` — the closest precedent for "manifest-shaped discovery". Currently scans user config dirs only. Plan: add a sibling scan for `private-agent/tools/*.ts`, push results into the same `custom` array (`registry.ts:218`).
2. **`custom` accumulator** at `opencode/src/tool/registry.ts:112, 184, 191, 218` — every new tool gets pushed here, so a manifest adapter just appends.
3. **`plugin.trigger("tool.definition", ...)` hook** at `opencode/src/tool/registry.ts:289` — the post-process injection point that mutates per-tool descriptions / schemas before being sent to the model.
4. **Core layer** at `core/tool/tools.ts` — `Tools.Service.register({ [name]: tool })` is the canonical registration seam if we want plugin-style scoping rather than filesystem-based.
5. **V2 registry** at `core/registry.ts:84-104` (`register`) and `:105-121` (`materialize`) — for a dual-write to V2, wrap our tools with the canonical `Tool.make(...)` shape and call `Tools.Service.register({ [name]: tool })`.
6. **`ApplicationTools.Service.register(...)`** is exposed publicly as `opencode.tools.register(...)` — alternate seam for runtime tools.
7. **Conditional enablement** by `webSearchEnabled` (`registry.ts:56-58`) and `usePatch` gating (`registry.ts:273-276`) — pattern to gate a private-manifest tool on environment / model.

---

## Phase 1 Plan (Brief)

1. Create **two** adapter files:
   - `opencode/packages/opencode/src/tool/private-tool-loader.ts` — Effect service that loads `private-agent/tools/tool-manifest.yaml`, scans each `entry:` for a runtime implementation file, and pushes tools into the opencode registry's `custom` list. Reuses the existing `Glob.scanSync` pattern at `registry.ts:172-186`.
   - `opencode/packages/core/src/tool/private-tool-bridge.ts` — V2 equivalent that wraps each loaded tool in canonical `Tool.make(...)` and registers via `Tools.Service.register(...)` for visibility to `materialize(...)`.
2. Create `private-agent/tools/tool-manifest.yaml` (initial empty list) + per-tool stub directories (`rag-search/`, `ppt-render/`, `markdown-export/`, `file-ingest/`, `memory-read/`, `memory-write/`, `slide-json-validator/`, `diagram-render/`).
3. Inject the loaders into existing layer composition: the opencode loader hooks into `registry.ts` (`InstanceState.make`); the core loader hooks into the `ToolRegistry.layer` factory.
4. Capture changes in `patches/tool-registry.patch`.

### Verification Checklist for Phase 1 PR

- [ ] `bun run typecheck` (both `packages/core` and `packages/opencode`) passes.
- [ ] `bun run build` produces all platform binaries.
- [ ] `bun test` shows **no new failures** vs Phase 0 baseline (1026 pass / 10 fail).
- [ ] Loading empty `tool-manifest.yaml` is a no-op (no bootstrap errors).
- [ ] Loading a stub tool with invalid schema produces a clear error message that names the failing entry.
- [ ] `patches/tool-registry.patch` applies cleanly with `git apply --3way` on `dev`.

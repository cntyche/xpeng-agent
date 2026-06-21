# Session Context Analysis

> Quadrant: **Session Context** (`packages/core/src/system-context/` + V2 runner + V1 prompt loader)
> Phase 0 baseline — read this before Phase 1 modifications.
> Status: Analysis is based on `opencode-dev.zip` snapshot from 2026-06-20.

---

## Anchor Files

| File | Approx LOC | Role |
|------|-----------:|------|
| `opencode/packages/core/src/system-context/index.ts` | 316 | SystemContext algebra |
| `opencode/packages/core/src/system-context/registry.ts` | 46 | SystemContextRegistry (Service) |
| `opencode/packages/core/src/system-context/builtins.ts` | 47 | Built-in compound source (`core/builtins`) |
| `opencode/packages/core/src/session/runner/llm.ts` | 404 | V2 Runner that consumes `loadSystemContext` |
| `opencode/packages/opencode/src/session/prompt.ts` | 1704 | V1 Session Prompt (see also [prompt-loader.md](./prompt-loader.md)) |
| `opencode/packages/opencode/src/session/system.ts` | — | V1 `SystemPrompt.Service` (used until V1 adopts the registry) |

---

## SystemContext Algebra (Core / `index.ts`)

The abstraction layer:

- **`Key`** (`index.ts:22-25`) — `Schema.String` matching `^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._/-]*$` and branded `SystemContext.Key`. Format: `<namespace>/<source>`.
- **`unavailable`** sentinel (`index.ts:28-29`) — "couldn't observe, but keep the prior snapshot".
- **`Source<A>`** interface (`index.ts:32-39`):
  ```
  { key: Key
  ; codec: Schema.Codec<A, Json, never, never>
  ; load: Effect.Effect<A | Unavailable>
  ; baseline: (current: A) => string
  ; update:   (previous: A, current: A) => string
  ; removed?: (previous: A) => string
  }
  ```
  `baseline` is the first-prompt text; `update` is the diff text when `current` ≠ `previous` (per `Schema.toEquivalence(source.codec)`); `removed` is the diff text when this source disappears from the active context.
- **`SystemContext`** opaque type (`index.ts:44-46`) — carries `ReadonlyArray<PackedSource>` (key + `load: Effect<Loaded | Unavailable>`).
- **`SourceSnapshot` / `Snapshot`** (`index.ts:49-57`) — durable, JSON-serializable per-source / per-generation comparison state.
- **`Generation`** (`index.ts:59-62`) → `{ baseline: string; snapshot: Snapshot }`.
- **`ReplacementResult`** etc. (`index.ts:64-79`) — algebraic results of reconcile/replace.
- **Errors**: `InitializationBlocked` (returns the array of unavailable keys, can fail), `DuplicateKeyError` (`index.ts:82-93`).

**Functions**:
- `make<A>(source)` (`index.ts:131-169`) — closes a typed source into `SystemContext`, normalizing `load` into `{baseline, compare}` closures with schema-driven encoding/decoding/equivalence.
- `combine(values)` (`index.ts:172-176`) — merges, hard-requiring unique keys (throws `DuplicateKeyError`).
- `initialize(value)` (`index.ts:194-202`) — observes all sources once; returns `Generation` on success or `InitializationBlocked` if any are unavailable.
- `reconcile(value, previous)` (`index.ts:214-276`) — emits `Unchanged | Updated | ReplacementReady | ReplacementBlocked`.
- `replace(value, previous)` (`index.ts:279-287`) — produces a complete replacement generation or blocks until prior admitted sources come back online.
- `empty = context([])` (`index.ts:128`) — identity sink.

> Design intent from the doc-comment header (`index.ts:5-19`): **"Models privileged system context as independently refreshable typed sources."**

---

## SystemContextRegistry (Core / `registry.ts`)

- **`Interface`** (`registry.ts:11-14`):
  - `register(entry): Effect.Effect<void, never, Scope.Scope>` — `acquireRelease`d, entries are removed from `Ref` on scope close.
  - `load(): Effect.Effect<SystemContext>` — sorted-deterministic `combine` of all registered entries.
- **`Entry`** (`registry.ts:6-9`) — `{ key: Key; load: Effect<SystemContext> }` (each entry can itself be a compound that contributes multiple sources).
- **`Service`** (`registry.ts:16`) tagged `"@opencode/v2/SystemContextRegistry"`.
- **Implementation** (`registry.ts:21-43`) holds `Ref.make<ReadonlyArray<Entry>>([])`; `register` checks uniqueness and dies on duplicate keys; `load` sorts by key, fetches each in `concurrency: "unbounded"`, then `combine`s.

---

## Built-in Sources (Core / `builtins.ts`)

Registers a single compound entry `"core/builtins"` that contains two `SystemContext.make(...)` sources (`builtins.ts:21-37`):

- **`core/environment`** (`builtins.ts:23-29`) — static `<env>...</env>` block summarizing working directory / workspace root / VCS / platform. `load: Effect.succeed(environment)` — never unavailable. Renders via `baseline`/`update`.
- **`core/date`** (`builtins.ts:31-36`) — `DateTime.nowAsDate.toDateString()` formatted as e.g. `"Sun Jun 21 2026"`. `load` does an Effectful date fetch; render messages: "Today's date: …" / "Today's date is now: …".

Combined `context` is fed into the registry as `{ key: "core/builtins", load: Effect.succeed(context) }` (`builtins.ts:39`). The layer is `Layer.mergeAll(builtIns, InstructionContext.layer).pipe(Layer.provideMerge(SystemContextRegistry.layer))` (`builtins.ts:43-45`).

> Note: `InstructionContext` is a separate sibling module under `packages/core/src/instruction-context/` that registers its own `Entry`, included implicitly through `Layer.mergeAll`.

---

## V2 Runner's Use of `loadSystemContext`

`runner/llm.ts:170-173`:

```ts
const loadSystemContext = (agent: AgentV2.Selection) =>
  Effect.all([systemContext.load(), skillGuidance.load(agent), referenceGuidance.load()], {
    concurrency: "unbounded",
  }).pipe(Effect.map(SystemContext.combine))
```

This is invoked **twice per turn** (`llm.ts:184-190` and `llm.ts:201-210`) by `SessionContextEpoch.initialize(db, loadSystemContext(agent), ...)` and `SessionContextEpoch.prepare(db, events, loadSystemContext(agent), ...)`. It produces a single combined `SystemContext`, which is then observed by `SessionContextEpoch` and rendered into `system.baseline` (the string used at `llm.ts:222-224`):

```ts
system: [agent.info?.system, system.baseline]
  .filter((part): part is string => part !== undefined && part.length > 0)
  .map(SystemPart.make)
```

The runner is the only consumer in `core/` today — V1 (`packages/opencode/src/session/prompt.ts`) still synthesizes equivalent env/skills blocks directly via `SystemPrompt.Service` (`packages/opencode/src/session/system.ts`) and does NOT yet consume `SystemContextRegistry`.

---

## V1 Path Today (`opencode/packages/opencode/src/session/system.ts`)

`SystemPrompt.Service` exposes:
- `environment(model)` — returns the env block (similar in spirit to `core/environment`, but V1-shape).
- `skills(agent)` — returns the skills block (similar to `SkillGuidance`).

`prompt.ts:1309-1311` consumes both via `Effect.all([sys.skills(agent), sys.environment(model), ...])`. The V1 system prompt is the **V1 equivalent** of what V2 builds up via `loadSystemContext`. **V1 does not route through `SystemContextRegistry`** — `SystemPrompt` is its own service.

> **Implication for Phase 1**: a private context source component needs to be visible to both engines for it to actually be seen by every `prompt()` call. We have two options:
> 1. **(Preferred)** Mirror the composer's output into both engines — register a `SystemContext.Source` for V2 *and* a `SystemPrompt` extension for V1 (see [prompt-loader.md §"Extension Seams"](./prompt-loader.md#extension-seams--where-to-insert-the-private-prompt-composer)).
> 2. Toggle which engine takes effect — track `@opencode/session-engine` config flag. Too invasive for Phase 1.

---

## Extension Seams — Where to Add a Private Context Source

Phase 1 plan adds a **single** private context source component (call it `PrivateSessionContext`):

### 1. Registry `.register(entry)` at `core/system-context/registry.ts:24-37`

The canonical Phase-1 entry point. A new layer yields the service and calls:

```ts
yield* SystemContextRegistry.Service.register({
  key: Key.make("xpeng/private-context"),
  load: Effect.succeed(privateContext),
})
```

…and it's auto-cleaned on layer teardown.

### 2. `SystemContext.make<A>({...})` at `core/system-context/index.ts:131-169`

Builds a single typed source. Takes an Effect schema for codec / equivalence. Use `Schema.toCodecJson(SomeShape)` for stable JSON-comparable shapes — that's what `builtins.ts:24, 32` does.

### 3. Built-ins layering pattern at `core/system-context/builtins.ts:9-41`

Show how multiple sources can be bundled under one registry entry. Phase 1 can either:
- (Preferred) Register a **separate** Entry under a new key (`"xpeng/private-context"`), so it doesn't share a compound effect with `core/builtins`.
- Or piggyback on `core/builtins` for fewer YAML files but tighter coupling.

### 4. `loadSystemContext` composition at `runner/llm.ts:170-173`

Currently hard-codes `[systemContext.load(), skillGuidance.load(agent), referenceGuidance.load()]`. **Do NOT modify this directly for Phase 1.** Instead, register via the registry — `loadSystemContext` enumerates entries, doesn't enumerate sources.

### 5. `SessionContextEpoch.initialize`/`prepare` at `runner/llm.ts:184-210`

The durable generation boundary — whatever `loadSystemContext(agent)` returned becomes the per-epoch baseline and snapshot.

### 6. `systemPart` line at `runner/llm.ts:222-224`

Final visible system prompt list (alongside `agent.info?.system`).

### 7. V1 retrofit at `opencode/packages/opencode/src/session/system.ts`

Needed if we want V1 visibility **before** V1 adopts the registry. Either:
- Add a private `xpengEnvironment` helper that SystemPrompt yields alongside `environment()`.
- Or subscribe to `plugin.trigger("experimental.chat.system.transform", {}, ...)`.
- Or (preferred for Phase 1) wire directly into the composition step in `prompt.ts` (see [prompt-loader.md §"Extension Seams"](./prompt-loader.md#extension-seams--where-to-insert-the-private-prompt-composer)) — minimal diff in V1.

---

## Phase 1 Plan (Brief)

1. Create `opencode/packages/core/src/session/private-context-source.ts`:
   - Implements `SystemContext.Source` for our private session state (user profile, project memory, workflow state).
   - Key: `Key.make("xpeng/private-context")` (regex-compliant).
   - Codec: `Schema.toCodecJson(Schema.Struct({ ... }))`.
   - `load`: `Effect.gen` reading from `private-agent/memory/*.json`.
   - `baseline`/`update`/`removed`: render to LLM-visible text.
2. Create `opencode/packages/core/src/session/private-session-context-layer.ts` exporting a Layer that yields `SystemContextRegistry.Service` and registers the private source. **Wrap into `core/llm.ts` import chain.**
3. V1 mirror at `opencode/packages/opencode/src/session/private-session-context.ts`:
   - `Effect.fn("PrivateSessionContext.compose")(function* () { ... })`
   - Reads the same memory files, yields strings intended for the prompt composer hook in [prompt-loader.md](./prompt-loader.md).
4. Storage surface at `workspace/sessions/` (gitignored by root `.gitignore`):
   - `current-session.json`
   - `session-history/<sessionID>.json`
   - `workflow-state/<workflowID>.json`
5. Capture changes in `patches/session-context.patch`.

### Verification Checklist for Phase 1 PR

- [ ] `bun run typecheck` (both `packages/core` and `packages/opencode`) passes.
- [ ] `bun run build` produces all platform binaries.
- [ ] `bun test` shows **no new failures** vs Phase 0 baseline.
- [ ] With no `private-agent/memory/*.json` content, the registry returns the union of built-ins only (no behavior change).
- [ ] After seeding a memory file, the `core/builtins` snapshot now also includes the diff text from `xpeng/private-context`.
- [ ] `patches/session-context.patch` applies cleanly with `git apply --3way` on `dev`.

---

## Notes for Phase 1

- Adding a Phase-1 system context source **only** requires writing one new layer (or small effect block) that yields `SystemContextRegistry.Service` and calls `register`. The runner pulls it transparently.
- **Schema codec matters**: `Source.codec` is the comparison axis for `update` vs `baseline`. Stable equivalence is required. Use `Schema.toCodecJson(SomeShape)`.
- **Avoid `unavailable` unless intentional**: returning `unavailable` keeps the prior snapshot but contributes no text on refresh; returning a definite value triggers rendering. A private manifest that should always be present at first initialization should `Effect.succeed(value)`.
- **V1 path doesn't yet honor the registry** — V1's `SystemPrompt.Service.environment/skills` is its own service. The Phase 1 private-context composer can either replicate in V1 (`private-session-context.ts`) or wait for V1 to be retrofitted to the same registry. **Phase 1** explicitly does the former (mirror) to ship faster.

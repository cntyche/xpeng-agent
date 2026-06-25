# Agent Runtime Analysis

> Quadrant: **Agent Runtime** (`packages/opencode/src/agent/`)
> Phase 0 baseline — read this before Phase 1 modifications.
> Status: Analysis is based on `opencode-dev.zip` snapshot from 2026-06-20 (`opencode-dev v1.17.8`).

---

## Anchor Files

| File | Approx LOC | Role |
|------|-----------:|------|
| `opencode/packages/opencode/src/agent/agent.ts` | ~459 | Agent Service + Schema + built-ins + generator |
| `opencode/packages/opencode/src/agent/subagent-permissions.ts` | 27 | Subagent permission derivation |
| `opencode/packages/opencode/src/agent/generate.txt` | — | Static prompt template (agent creator) |
| `opencode/packages/opencode/src/agent/prompt/{compaction,explore,summary,title}.txt` | — | Embedded system-prompt assets per agent |

> Line numbers below reference the canonical upstream files; verify locally before each Phase 1 PR — they shift when patches are stacked.

---

## Public API

The file exports a namespace projection `export * as Agent from "./agent"` (agent.ts:459) following the self-reexport pattern required for `src/config`.

- **`Agent.info` (Service interface)** at `agent.ts:64-80`
  - `get(agent: string): Effect.Effect<Info>`
  - `list(): Effect.Effect<Info[]>`
  - `defaultInfo(): Effect.Effect<Info>`
  - `defaultAgent(): Effect.Effect<string>`
  - `generate({ description, model? }): Effect.Effect<{ identifier, whenToUse, systemPrompt }, Provider.DefaultModelError>` — LLM-backed agent creator
- **`Agent.Info` (Schema)** at `agent.ts:35-56` — branded schema annotated `"Agent"`
- **`Agent.Service`** at `agent.ts:84` — `Context.Service<Service, Interface>()("@opencode/Agent")`
- **`Agent.use`** at `agent.ts:86`
- **`Agent.layer`** at `agent.ts:88`
- **`Agent.defaultLayer`** at `agent.ts:439-446`
- **`Agent.node`** at `agent.ts:450-457`

`subagent-permissions.ts` exports `deriveSubagentSessionPermission({ parentSessionPermission, subagent }): PermissionV1.Ruleset` (subagent-permissions.ts:14-27).

---

## Agent.Info Schema

Record-level fields at `agent.ts:35-56`:

| Field | Type | Notes |
|-------|------|-------|
| `name` | `string` | Required |
| `description?` | `string` | Optional |
| `mode` | `"subagent" \| "primary" \| "all"` | Used for listing visibility |
| `native?` | `boolean` | Built-in marker — all seven shipped agents set `native: true` |
| `hidden?` | `boolean` | Hides from `list()` |
| `topP?`, `temperature?`, `color?` | numbers / string | UX-only |
| `permission` | `PermissionV1.Ruleset` | **Required**, defaults merged at construction |
| `model?` | `{ providerID: ProviderV2.ID; modelID: ModelV2.ID }` | Default-model binding |
| `variant?` | `string` | Provider-level variant override |
| `prompt?` | `string` | Embedded text (often `import FOO from "./prompt/foo.txt"`) |
| `options` | `Record<string, unknown>` | Forwarded to provider |
| `steps?` | `number` | Consumed downstream as `maxSteps = agent.steps ?? Infinity` at `prompt.ts:1231` |

---

## Architecture / Pattern Notes

- **Instance-scoped state**: registry `agents: Record<string, Info>` lives inside an `InstanceState.make<State>(...)` closure (`agent.ts:98`), keyed per directory. Methods (`get`, `list`, `defaultInfo`, `defaultAgent`) are `Effect.fnUntraced` private helpers exposed through `InstanceState.useEffect` accessors (`agent.ts:354-365`).
- **Built-in agent table** is hard-coded literal `agents` object (`agent.ts:138-263`) containing seven built-ins: `build`, `plan`, `general`, `explore`, `compaction`, `title`, `summary`:
  - `build`, `plan` — `mode: "primary"`
  - `general`, `explore` — `mode: "subagent"`
  - `compaction`, `title`, `summary` — hidden `mode: "primary"` helpers
  - All have `native: true`
- **Defaults pipeline** at `agent.ts:117-134` produces a baseline `Permission.fromConfig` (with project-default ruleset including `doom_loop: "ask"`, `question: "deny"`, `plan_enter: "deny"`, `plan_exit: "deny"`, env-file read-asks, and a whitelist of `Truncate.GLOB` + skills + reference paths for `external_directory`).
- **User-config merge** at `agent.ts:265-292`:
  1. Iterates `cfg.agent`
  2. `disable: true` deletes the agent
  3. Otherwise `Permission.merge` composes three layers (defaults → user per-agent → parent session ruleset)
  4. `options` shallow-merged via `mergeDeep` from `remeda`
- **Truncate.GLOB post-condition** at `agent.ts:294-308`: every agent gets `external_directory: { [Truncate.GLOB]: "allow" }` unless the user explicitly denied it.
- **`defaultInfo` priority** at `agent.ts:326-338`:
  1. `cfg.default_agent`
  2. First visible `!subagent && !hidden` (typically `build`)
- **Subagent permission derivation** lives in a separate sibling file (`subagent-permissions.ts`) rather than being inlined — copies only `external_directory` rules + `deny` actions from parent, plus adds `task`/`todowrite` denies unless the subagent already granted them.

---

## Extension Seams

- **Built-ins slot**: literal `agents` object at `agent.ts:138-263`. Adding new built-in agents = adding entries here.
- **User-config loop** at `agent.ts:265-292` is the precedent for surface-based overrides; a Phase 1 adapter could insert a pre-merge contribution here.
- **Permission construction** by `Permission.fromConfig` + `Permission.merge` (used at `agent.ts:117-150, 158-176, 183-188, 223-229, 254-262`) — any adapter that emits deny/allow rules keyed by tool action names will compose cleanly through `Permission.merge` at construction time.
- **Embedded prompt assets** at `agent/agent.ts:13-16` — `import PROMPT_* from "./prompt/*.txt"` is the only place literal `prompt` strings are injected.
- **`steps` / `options` / `variant` / `model`** all surface fields on `Info` — consumed downstream at `prompt.ts:1231` (steps) and `prompt.ts:654-661` (model/variant).
- **`subagent-permissions.ts`** is the precedent for self-contained extension files (the same pattern applies to `private-agent/agents/<X>/`).

---

## Phase 1 Plan (Brief)

1. Create `opencode/packages/opencode/src/agent/private-agent-bridge.ts` exposing:
   - `registerPrivateAgent(info: Agent.Info): Effect<...>` — appends an agent entry to the per-instance registry.
   - `registerRouterAgent()` — adds the Router Agent.
2. Add the bridge initialization to the `Agent.layer` factory (or to a sibling layer imported into `defaultLayer`) so the bridge runs as part of standard XPENGagent startup.
3. Bridge emits additional `Permission.Rule[]` allowing `xpeng.*` and the private tool actions. The bridge consumes `private-agent/config/agents.yaml` (Phase 3.1) for fleet definitions.
4. Patch `agent.ts` minimally: a single injection at the start of the `InstanceState.make<State>(...)` block to call into the bridge.
5. Capture the change in `patches/agent-runtime.patch`.

### Verification Checklist for Phase 1 PR

- [ ] `bun run typecheck` (from `packages/opencode`) passes.
- [ ] `bun run build` still produces all platform binaries.
- [ ] `bun test` from `packages/opencode` shows **no new failures** vs baseline (1026 pass / 10 fail from Phase 0).
- [ ] `bun --cwd packages/opencode --conditions=browser src/index.ts --help` runs without errors (no runtime wiring break).
- [ ] `patches/agent-runtime.patch` is a clean diff of the upstream tree, reapplied cleanly on `dev` with `git apply --3way`.

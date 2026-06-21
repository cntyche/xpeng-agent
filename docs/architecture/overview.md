# Architecture Overview

> Phase 0 baseline. Updated as phases ship.
> Design references: [`../../XPENG-Agent.md`](../../XPENG-Agent.md), [`../../Task Tree.md`](../../Task%20Tree.md).

---

## System Diagram

```
                                          ┌─────────────────────────┐
                                          │      workspace/         │
                                          │  ─────────────────────  │
                                          │  uploads/               │
                                          │  knowledge-base/        │
                                          │  projects/              │
                                          │  outputs/               │
                                          │  sessions/              │
                                          └────────────┬────────────┘
                                                       │ read/write (file)
                                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ private-agent/                                  (capability layer)          │
│ ─────────────────────────────────────────────────────────────────────────── │
│ agents/      router / solution / ppt / designer / knowledge / critic / mem  │
│ prompts/     system / agents / skills / output-format / style               │
│ tools/       rag-search / ppt-render / markdown-export / file-ingest / ...  │
│ rag/         parser / chunker / embedding / vector-store / index / retrieve │
│ memory/      user-profile / preferences / project-memory / writing-style    │
│ ppt/         templates / themes / layouts / renderer                         │
│ workflows/   make-solution / make-ppt / full-consulting-flow (YAML)         │
│ config/      private-agent.yaml / agents.yaml / rag.yaml / ppt.yaml / mem... │
└────────────┬──────────────────────────────────────────┬─────────────────────┘
             │ Effect.Layer (private-agent/index.ts)    │
             │                                          │
             ▼                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ opencode/  (upstream control-layer extensions — patches-only)               │
│ ─────────────────────────────────────────────────────────────────────────── │
│  packages/core/src/system-context/registry.ts   ←── private-context-source  │
│  packages/core/src/session/runner/llm.ts        ←── loadSystemContext(agent) │
│  packages/core/src/tool/registry.ts             ←── private-tool-bridge (V2)│
│  packages/opencode/src/tool/registry.ts         ←── private-tool-loader     │
│  packages/opencode/src/session/prompt.ts        ←── private-prompt-composer │
│  packages/opencode/src/session/system.ts        ←── private-session-context │
│  packages/opencode/src/agent/agent.ts           ←── private-agent-bridge    │
└────────────┬───────────────────┬────────────────┬───────────────────────────┘
             │ Effect services   │ Session events │ LLM provider calls
             ▼                   ▼                ▼
            Model Provider Layer (upstream, untouched)
```

---

## Layered Responsibilities

1. **`workspace/`** — user data plane. Gitignored where sensitive.
2. **`private-agent/`** — all business capabilities live here (Agents, Tools, RAG, Memory, PPT, Workflows).
3. **`opencode/`** — control-layer extensions only.

The two adapters (private-tool-loader / private-tool-bridge) are the only files in `opencode/` that depend on `private-agent/`. Everything else stays in `private-agent/`.

---

## Control-Flow Phases

| Phase | Trigger | Path |
|-------|---------|------|
| **Phase 1** | OpenCode startup resolves `opencode/ToolRegistry.layer` | Loads `private-agent/tools/tool-manifest.yaml` → registers tools into `custom[]` (V1) and `Tools.Service` (V2) |
| **Phase 1** | `prompt()` initializes system array | `prompt.ts:1309` calls `PrivatePromptComposer.compose(...)` → appends to `system` |
| **Phase 1** | V2 Runner initializes a session epoch | `loadSystemContext()` enumerates registry → returns the union (incl. **`xpeng/private-context`**) |
| **Phase 1** | `agents.list()` called | The bridge has appended a `xpeng` Agent record to the per-instance registry |
| **Phase 2** | User invokes XPENG Agent | Router Agent routes to Solution / Knowledge / Critic; outputs structured Markdown |
| **Phase 3** | User invokes PPT flow | PPT Agent produces Slide JSON → Designer Agent beautifies → Renderer emits `.pptx` |
| **Phase 4** | File uploaded | File ingest tool: parse → chunk → embed → write to vector store |
| **Phase 5** | Memory writeback | Memory Agent produces `{ preferences, project-memory, ... }` file updates; next session reads them via registry |
| **Phase 6** | Full consulting flow | Single workflow spans Router → Memory → Knowledge → Solution → Critic → Refine → PPT → Critic → Render → Memory |

---

## Why "Four-Quadrant Deep-Modify" + "External Capability"

This combination is what makes the project **remerge-friendly** with upstream:

- We only patch four quadrants of `opencode/`. The other 30+ packages (sdk, llm, tui, ui, app, desktop, plugin, etc.) stay untouched.
- Each quadrant adds **dependencies**, not behavior: the loaders/composer pass-through to `private-agent/` so we can fork upstream with minimal merge conflicts.
- Each change produces a `.patch` file. Upstream updates become `git apply` operations, not interactive rebases.

---

## Branch Topology

```
dev (was private/base)              ← runtime baseline; merges upstream/dev
│
├── private-core                    ← holding for the four-quadrant patches
│   ├── patches/tool-registry.patch
│   ├── patches/prompt-loader.patch
│   ├── patches/session-context.patch
│   └── patches/agent-runtime.patch
│
└── private-agent                   ← capability additions
    └──  private-agent/**           ← isolated from upstream code
```

Branch names follow `AGENTS.md` (no slashes, no `feat/` prefixes). Both `private-core` and `private-agent` are created off `dev`. New Phase PRs target one of these branches.

---

## Module Boundary Contracts

| Boundary | Contract | Pinning |
|----------|----------|---------|
| `opencode/` ↔ `private-agent/` | A single typed service `PrivateAgentBridge.Service` resolves private agents | Phase 1 only |
| `private-agent/` ↔ `workspace/` | JSON files for memory / sessions / outputs; binary files for `outputs/*.pptx` | Gitignored |
| `opencode/` ↔ upstream | Patches only; never direct edits | `patches/*.patch` |
| `private-agent/agents/*` ↔ LLM providers | Use upstream `Provider.Service`, `ModelV2`, and `streamObject` / `generateObject` | Untouched |

---

## Phase 0 Documentation Map

- [`opencode-analysis/agent-runtime.md`](./opencode-analysis/agent-runtime.md) — Agent layer deep dive
- [`opencode-analysis/tool-registry.md`](./opencode-analysis/tool-registry.md) — Tool registry two-layer architecture
- [`opencode-analysis/prompt-loader.md`](./opencode-analysis/prompt-loader.md) — V1 `prompt.ts` composition step
- [`opencode-analysis/session-context.md`](./opencode-analysis/session-context.md) — SystemContext algebra + V2 runner

Phase 1+ documentation will be added as `docs/architecture/<topic>.md` files, referenced from each phase PR.

# xPeng-Agent — Personal Professional Agent Workbench

> Convert the upstream XPENGagent dev tree (`opencode-dev`) into a private professional Agent workbench that delivers consulting-grade solution design, PPT generation, RAG knowledge assistance, long-term memory and multi-agent workflows — all without rewriting the upstream runtime.

This repository wraps upstream XPENGagent inside a sibling `private-agent/` capability layer. We only **moderately extend** four control surfaces of upstream XPENGagent (Agent Runtime, Tool Registry, Prompt Loader, Session Context); every professional capability lives in `private-agent/`.

The full execution plan lives in [`Task Tree.md`](../Task%20Tree.md) at the repo root. The high‑level design lives in [`XPENG-Agent.md`](../XPENG-Agent.md). Per‑phase technical notes live under [`docs/`](./docs).

---

## Repository Layout (V1)

```
V1/                                  ← this repo (workbench root)
├── opencode/                         ← upstream XPENGagent fork (only control-layer changes go here)
│   ├── packages/core/                ← Effect-TS service layer, session/runner V2, system-context, tool V2
│   ├── packages/opencode/            ← Upper-layer business: agent/, session/prompt.ts (V1), tool/registry.ts
│   └── ...                           (sdk, llm, tui, ui, app, desktop are untouched)
│
├── private-agent/                    ← all private capabilities LIVE HERE (no business logic in opencode/)
│   ├── agents/         (router, solution, ppt, designer, knowledge, critic, memory)
│   ├── prompts/        (system/, agents/, skills/, output-format/, style/)
│   ├── tools/          (rag-search, ppt-render, markdown-export, file-ingest, memory-read/write, slide-json-validator)
│   ├── rag/            (parser/, chunker/, embedding/, vector-store/, index/, retriever/)
│   ├── memory/         (user-profile, preferences, project-memory, writing-style)
│   ├── ppt/            (templates/, themes/, layouts/, renderer/)
│   ├── workflows/      (YAML-defined multi-agent flows)
│   └── config/         (private-agent.yaml, agents.yaml, rag.yaml, ppt.yaml, memory.yaml)
│
├── workspace/                        ← user data (gitignored where appropriate)
│   ├── uploads/         (raw incoming files: pdf/pptx/docx/md/txt)
│   ├── knowledge-base/  (raw/, parsed/, embeddings/, index/, metadata/)
│   ├── projects/        (per-project working areas)
│   ├── outputs/         (rendered solutions, slide-json, pptx files)
│   └── sessions/        (current-session, session-history, workflow-state)
│
├── patches/                          ← every upstream control-layer change saved as .patch
│
├── docs/
│   ├── architecture/                 ← end-to-end design notes
│   ├── opencode-analysis/            ← detailed code map of upstream four quadrants
│   └── update-notes/                 ← upstream sync reports & analysis
│
├── scripts/                          ← bootstrap, apply-patches, sync-upstream, save-patch, analyze-diff
│
└── README.md                         ← you are here
```

---

## Philosophical Boundaries (Re-stated)

We **never**:

1. Rewrite the upstream XPENGagent runtime.
2. Delete an official capability.
3. Break the original coding-agent behaviors.
4. Modify a module outside of the four allowed quadrants.
5. Put business logic into the upstream packages — capabilities only register through adapters.

The four allowed deep‑modify quadrants are:

| Quadrant | Files (canonical) | Strategy |
|----------|-------------------|----------|
| **Agent Runtime** | `opencode/packages/opencode/src/agent/*` | Add `private-agent-bridge.ts` next to the Agent service. Register a `--kind=private` Agent and route requests through a Router Agent. |
| **Tool Registry** | `opencode/packages/opencode/src/tool/registry.ts` (440 LOC) + `opencode/packages/core/src/tool/registry.ts` (139 LOC) | Add `private-tool-loader.ts` that scans `private-agent/tools/tool-manifest.yaml`. Reuse the existing `Glob.scanSync` + dynamic import mechanism. |
| **Prompt Loader** | `opencode/packages/opencode/src/session/prompt.ts` (1704 LOC, V1) | Add `private-prompt-composer.ts` invoked at the end of the `prompt()` method. Compose `XPENGagent base + private-assistant + agent prompt + skill + memory + RAG + output format`. |
| **Session Context** | V2: `opencode/packages/core/src/session/runner/llm.ts` (`loadSystemContext`) · V1: `opencode/packages/opencode/src/session/prompt.ts` | V2: implement a `SystemContext.Source` and register it via `system-context/registry`. V1: inject context during prompt assembly. |

Every change in those quadrants is captured as a patch under `patches/` so that upstream merges stay reproducible.

---

## Phased Plan

See [`Task Tree.md`](../Task%20Tree.md). Summary:

- **Phase 0** — Project init, baseline build/typecheck/test, skeleton dirs, README, upstream analysis docs. *(you are here ✅)*
- **Phase 1** — Minimal control-layer injection: tool-manifest loader, private-prompt composer, private-session-context source, agent bridge. (all four quadrants get a `.patch`.)
- **Phase 2** — Base capability: Router Agent, Solution Agent, Knowledge Agent, Critic Agent, `make-solution` workflow.
- **Phase 3** — PPT: PPT Agent, Designer Agent, slide validator, pptx renderer, themes/layouts/templates, `make-ppt` workflow.
- **Phase 4** — RAG pipeline (parser → chunker → embedding → vector store → retriever) + `rag-search` / `file-ingest` tools.
- **Phase 5** — Memory: Memory Agent, persistent memory JSON store, memory read/write tools.
- **Phase 6** — End‑to‑end `full-consulting-flow` + integration tests + acceptance verification.

Each phase is **independently shippable** and ends with a commit on its dedicated feature branch:

| Branch | Purpose |
|--------|---------|
| `dev` (default) | Stable running baseline that mirrors upstream `dev`. (Was `private/base` in the original Task Tree; renamed because the repository default per AGENTS.md is `dev`, and slash‑prefix branches are forbidden.) |
| `private-core` | Control-layer patches accumulated across phases. |
| `private-agent` | `private-agent/` capability work in isolation. |

---

## Day-to-Day Commands

Run from `opencode/packages/<name>` (the root-level test/typecheck commands exit early per AGENTS.md).

```bash
# One-time setup
./scripts/bootstrap.sh

# Install deps (must run inside opencode/)
cd opencode && bun install --ignore-scripts

# Type-check the two most relevant packages
cd opencode/packages/core     && bun run typecheck
cd opencode/packages/opencode && bun run typecheck

# Build
cd opencode/packages/opencode && bun run build

# Run unit tests (offline-friendly subset)
cd opencode/packages/core     && bun test --timeout 5000 --only-failures
cd opencode/packages/opencode && bun test --timeout 5000 --only-failures

# Save a patch after editing opencode/*
./scripts/save-patch.sh <tool-registry|prompt-loader|session-context|agent-runtime>

# Apply saved patches (e.g., after switching branches)
./scripts/apply-patches.sh                # all
./scripts/apply-patches.sh tool-registry  # one

# Sync upstream and capture a diff
UPSTREAM_REMOTE=origin UPSTREAM_BRANCH=dev ./scripts/sync-upstream.sh
./scripts/analyze-upstream-diff.sh
```

---

## Phase 0 Status (this commit)

- ✅ `opencode-dev.zip` unpacked into `opencode/`.
- ✅ Git repo initialized at `V1/` on branch `dev` (matches AGENTS.md guidance).
- ✅ `.gitignore` extended for `private-agent/`, `workspace/`, sandbox dirs.
- ✅ Bun installed (`v1.3.14`) via `npm i -g bun` (sandbox has no `apt`/`sudo`).
- ✅ `bun install --ignore-scripts` succeeds (2842 packages). The `--ignore-scripts` flag is required because the upstream tree tries to compile native packages like `tree-sitter-powershell` and no C++ compiler is available in this sandbox.
- ✅ `packages/core` `bun run typecheck` — passes.
- ✅ `packages/opencode` `bun run typecheck` — passes.
- ✅ `packages/opencode` `bun run build` — produces `dist/opencode-{linux,darwin,windows}-*/bin/opencode` (smoke test pass).
- ✅ Tests run: `packages/core` — **1026 pass / 10 fail / 1036 tests / 131 files** in ~42 s. Failures are environmental (sandbox proxy / missing env-backed provider tokens / a stale drizzle migration check). No failures caused by Phase 0 edits.
- ✅ Project skeleton directories created: `private-agent/{agents,prompts/{system,agents,skills,output-format,style},tools,memory,ppt/{templates,themes,layouts,renderer},workflows,config,templates}`, `workspace/{uploads,knowledge-base/{raw,parsed,embeddings,index,metadata},projects,outputs,sessions}`, `docs/{architecture,opencode-analysis,update-notes}`, `scripts/`, `patches/`.
- ✅ Helper scripts added: `bootstrap.sh`, `apply-patches.sh`, `save-patch.sh`, `sync-upstream.sh`, `analyze-upstream-diff.sh`.
- ✅ Upstream analysis docs scaffolded in `docs/opencode-analysis/`.

### Phase 0 Known Caveats

- **No C++ compiler in sandbox**: `bun install` requires `--ignore-scripts`. This skips compilation of `tree-sitter-powershell`, `@opentui/core`, `@parcel/watcher`, `@ff-labs/fff-bun`, etc. Build still succeeds because the upstream `build` script re-runs install with scripts to grab prebuilt artifacts.
- **No outbound network for LLM providers**: tests that hit `api.openai.com` / `api.x.ai` / oauth-idp endpoints fail with 502/timeout. They are *not* regressions; they are environmental.
- **Tests cannot be run from repo root**: confirmed — `bun test` at `V1/` errors per `AGENTS.md` (`do-not-run-tests-from-root`). Always `cd` into `opencode/packages/<name>` for tests.

### Next Step

→ **Phase 1**: `opencode/packages/{core,opencode}/src/{tool,prompts,session,agent}/` gets adapter files; `patches/{tool-registry,prompt-loader,session-context,agent-runtime}.patch` are emitted; `private-agent/{config,tools/tool-manifest.yaml,prompts/,agents/router-agent/index.ts,session-context/}` skeleton ships in the same PR for legibility.

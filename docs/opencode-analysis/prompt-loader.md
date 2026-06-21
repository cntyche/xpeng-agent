# Session Prompt Loader Analysis

> Quadrant: **Prompt Loader** (`packages/opencode/src/session/prompt.ts`)
> Phase 0 baseline — read this before Phase 1 modifications.
> Status: Analysis is based on `opencode-dev.zip` snapshot from 2026-06-20.

---

## Anchor Files

| File | Approx LOC | Role |
|------|-----------:|------|
| `opencode/packages/opencode/src/session/prompt.ts` | 1704 | V1 Session Prompt monolith |
| `opencode/packages/opencode/src/session/processor.ts` | — | Invoked as `handle.process(...)` at `prompt.ts:1318` |
| `opencode/packages/opencode/src/session/tools.ts` | — | Invoked as `SessionTools.resolve(...)` at `prompt.ts:1279` |
| `opencode/packages/opencode/src/session/system.ts` | — | Provides `sys.skills(agent)` / `sys.environment(model)` |
| `opencode/packages/core/src/session/runner/llm.ts` | 404 | V2 Runner — uses `loadSystemContext` (see [session-context.md](./session-context.md)) |

---

## Top-Level Structure (`prompt.ts`)

**Exports**:
- `SessionPrompt.Service` at `prompt.ts:95` — tagged `"@opencode/SessionPrompt"`
- `Interface` at `prompt.ts:86-93`: `{ cancel, prompt, loop, shell, command, resolvePromptParts }`
- `Service` body at `prompt.ts:1526-1533` returning the same interface
- `layer` at `prompt.ts:97`, `defaultLayer` at `prompt.ts:1537-1570`, `node` at `prompt.ts:1675-1702`

**Schemas**: `PromptInput` (`prompt.ts:1576-1598`), `LoopInput` (`prompt.ts:1600-1602`), `ShellInput` (`prompt.ts:1604-1611`), `CommandInput` (`prompt.ts:1613-1639`).

**Internal closures** (`Effect.fn("SessionPrompt.*")`):
- `ops` (line 128) — TaskPromptOps bag for Task tool
- `cancel` (136), `resolvePromptParts` (141), `title`/`ensureTitle` (177)
- `handleSubtask` (239) — subagent dispatch
- `shellImpl` (435), `getModel` (595), `createUserMessage` (636)
- `resolvePart`/`resolveUserPart` (713)
- `prompt` (1105), `lastAssistant` (1126), `runLoop` (1134), `loop` (1386), `shell` (1392), `command` (1399)

> This file imports `SessionV1`, `PermissionV1` directly (`prompt.ts:2-4`). It is V1-shape end-to-end and **does not** carry `// TODO(v2)` markers (the V2 mirror writes go through `EventV2Bridge` from `processor.ts`).

---

## The `prompt()` Entry Point (V1 coordinator)

`prompt.ts:1105-1124`:

```ts
const prompt: (input: PromptInput) => Effect.Effect<SessionV1.WithParts, Image.Error> =
  Effect.fn("SessionPrompt.prompt")(function* (input: PromptInput) {
    const session = yield* sessions.get(input.sessionID).pipe(Effect.orDie)
    yield* revert.cleanup(session)
    const message = yield* createUserMessage(input)
    yield* sessions.touch(input.sessionID)
    const permissions: PermissionV1.Rule[] = []
    for (const [t, enabled] of Object.entries(input.tools ?? {})) {
      permissions.push({ permission: t, action: enabled ? "allow" : "deny", pattern: "*" })
    }
    if (permissions.length > 0) {
      session.permission = permissions
      yield* sessions.setPermission({ sessionID: session.id, permission: permissions })
    }
    if (input.noReply === true) return message
    return yield* loop({ sessionID: input.sessionID })
  })
```

**Responsibilities**:
1. Resolve session
2. Revert any orphaned / interrupted tool parts
3. Persist user message via `createUserMessage`
4. Translate legacy `input.tools` allow/deny map → `PermissionV1.Rule[]` (marked deprecated at `PromptInput.tools` schema `prompt.ts:1582-1585`)
5. Persist session permission overrides if any
6. Either return `message` (when `noReply` is `true`) or hand off to `loop()`

**Real LLM work happens later**: in `runLoop` (`prompt.ts:1134`) → `handle.process(...)` (`prompt.ts:1318`) via the `SessionProcessor`. `prompt()` is a thin coordinator.

---

## Where Messages Are Assembled

### `runLoop()` returns

`yield* lastAssistant(sessionID)` at `prompt.ts:1382` (with `compaction.prune` forked).

### `loop()` returns

`state.ensureRunning(input.sessionID, lastAssistant(input.sessionID), runLoop(input.sessionID))` at `prompt.ts:1389`.

### `shell()` returns

`state.startShell(input.sessionID, lastAssistant(input.sessionID), shellImpl(input, ready), ready)` at `prompt.ts:1396`.

### `command()` returns

`prompt({ sessionID: input.sessionID, ..., parts })` result at `prompt.ts:1509-1523`.

All return shapes are V1 — `SessionV1.WithParts` etc.

---

## V1 vs V2 Markers

- **Pure V1**: imports `SessionV1`, `PermissionV1` directly; structural types like `SessionV1.User`, `SessionV1.Assistant`, `SessionV1.TextPart`.
- **Dual-write markers**: most V2 mirror writes go through `EventV2Bridge` (heavily used inside `processor.ts` with `// TODO(v2): Temporary dual-write while migrating session messages to v2 events` comments). `prompt.ts` does NOT carry these markers itself, but uses `events.publish(SessionEvent.AgentSwitched|ModelSwitched)` (`prompt.ts:680, 692`) to project V2 events at session/message creation.
- **V2 runner separation** (per upstream `AGENTS.md`): *"Keep... one explicit `llm.stream(request)` call per provider turn... Do not bridge through legacy `SessionPrompt.loop(...)` or delegate orchestration to an in-memory tool loop."* V2 logic lives in `packages/core/src/session/runner/llm.ts`.
- V2 assembly at `runner/llm.ts:170-173` uses `systemContext.load()` + `SkillGuidance.load(agent)` + `ReferenceGuidance.load()` — **not** the same `sys.skills`/`sys.environment` calls V1 uses. Our prompt composer therefore has **two parallel extension points**, depending on which engine path is active for a given turn.

---

## The Composition Step — The Central Seam

`prompt.ts:1309-1330`:

```ts
const [skills, env, instructions, modelMsgs] = yield* Effect.all([
  sys.skills(agent),                                     // SystemPrompt.skills
  sys.environment(model),                                // SystemPrompt.environment
  instruction.system().pipe(Effect.orDie),               // session/instruction system paths
  MessageV2.toModelMessagesEffect(msgs, model),
])
const system = [...env, ...instructions, ...(skills ? [skills] : [])]
const format = lastUser.format ?? { type: "text" as const }
if (format.type === "json_schema") system.push(STRUCTURED_OUTPUT_SYSTEM_PROMPT)

const result = yield* handle.process({
  user: lastUser,
  agent,
  permission: session.permission,
  sessionID,
  parentSessionID: session.parentID,
  system,
  messages: [...modelMsgs, ...(isLastStep ? [{ role: "assistant", content: MAX_STEPS }] : [])],
  tools,
  model,
  toolChoice: format.type === "json_schema" ? "required" : undefined,
})
```

This is the central seam: `[skills, env, instructions]` are combined into a single `system` array; tools are gathered from `SessionTools.resolve({...})` (`prompt.ts:1279-1293`); `handle.process(...)` (`prompt.ts:1318`) is a `SessionProcessor` that drives the LLM stream and tool settlement.

---

## Existing Transform Hooks (Precedent for Plugin-Driven Transforms)

- `plugin.trigger("experimental.chat.messages.transform", {}, { messages: msgs })` at `prompt.ts:1307`. Already lets plugins mutate the assembled `modelMsgs`.
- `experimental.chat.system.transform` invoked inside `Agent.generate` at `agent.ts:379`.

---

## Extension Seams — Where to Insert the Private Prompt Composer

There are three candidate seams along this pipeline; Phase 1 should implement **all three** so both V1 and V2 paths compose our composer:

### 1. V1 pre-composition — `prompt.ts:1310` (before `Effect.all([...])`)

A service that yields strings (or a generator) and appends to `system` after `Effect.all([...])` completes. Idiomatic in this codebase because the service-yielding block at `prompt.ts:97-127` already imports ~25 services. **Recommended primary seam for V1**.

### 2. V1 post-composition — `prompt.ts:1315-1317` (after `system = [...env, ...instructions, ...skills]`)

A service that mutates the `system` array (e.g., appends private manifest text). Functionally identical to subscribing to `plugin.trigger("experimental.chat.messages.transform", {}, ...)`. Less invasive than #1.

### 3. V2 — `runner/llm.ts:170-173` (the `loadSystemContext` call)

A Phase 1 prompt composer can register a `SystemContext.Source` keyed `"xpeng/<name>"` via `SystemContextRegistry.Service.register` (see [session-context.md](./session-context.md) §"Extension Seams").

### 4. Tool-injection — `prompt.ts:1279-1293` (inside `SessionTools.resolve`)

Extend the resolver by adding entries to the `plugins`/`mcp`/`custom` arrays. Subscribing to the `plugin.trigger("tool.definition", ...)` post-process hook (`registry.ts:289`) is the lower-friction alternative.

---

## Notes for Phase 1

- `prompt()` is a thin coordinator: it only creates a user message, applies legacy `tools → permission` mapping (now deprecated), and forwards to `loop()`. **A Phase 1 adapter does not need to touch `prompt()` itself**, only the system-prompt composition step at `prompt.ts:1309-1330`.
- The V1 path emits two `plugin.trigger(...)` hooks (mentioned above) — modeled precedent shows the community pattern is to extend existing transform hooks rather than add new ones; we can either subscribe or compose system text inside a new `Effect.all` phase ahead of line 1315.
- V2 separation is upstream-enforced. `packages/core/src/session/runner/llm.ts:170` (`loadSystemContext`) is the canonical seam; if our Phase 1 prompt composer is implemented as a `SystemContext.Source`, it works on both code paths.
- `SessionV1.WithParts` return shape is the V1 contract. Anything we add should not require a new shape — keep composition additive and string-level.
- **Important: the V2 `loadSystemContext` doesn't enumerate keys**. Our registration via `SystemContextRegistry` is transparent to the runner.

---

## Phase 1 Deliverables for the Prompt Composer

1. **`opencode/packages/opencode/src/prompts/private-prompt-composer.ts`**:
   - `Effect.fn("PrivatePromptComposer.compose")` — receives `{ skills, env, instructions, agent, sessionID }`
   - Returns **either** a `string` to append to `system` **or** `undefined` to be a no-op.
   - Pulls from `private-agent/prompts/{system,agents,skills}/<X>.md` based on the current agent name.
2. **Wiring in `prompt.ts` at the composition step**: yield `PrivatePromptComposer.Service` alongside `sys` / `instruction`, then call `composer.compose({...})` and push its result onto `system`.
3. **`opencode/packages/core/src/session/private-context-source.ts`** (V2 mirror): registers a `SystemContext.Source` for the same composer output.
4. **Prompt templates** at `private-agent/prompts/`:
   - `system/private-assistant.md`
   - `agents/{router-agent,solution-agent,ppt-agent,designer-agent,knowledge-agent,critic-agent,memory-agent}.md`
   - `skills/{solution-design,ppt-outline,ppt-beautify,knowledge-query}.md`
   - `output-format/{markdown-solution,slide-json,review-report}.md`
   - `style/{consulting,product,architecture}.md`
5. Capture changes in `patches/prompt-loader.patch`.

### Verification Checklist for Phase 1 PR

- [ ] `bun run typecheck` (both `packages/core` and `packages/opencode`) passes.
- [ ] `bun run build` produces all platform binaries.
- [ ] `bun test` shows **no new failures** vs Phase 0 baseline (1026 pass / 10 fail).
- [ ] With no `private-agent/prompts/` content present, the composer is a no-op and behaves exactly like upstream.
- [ ] With `system/private-assistant.md` present, a single-turn session picks up the appended system string (verified via TUI / log inspection).
- [ ] `patches/prompt-loader.patch` applies cleanly with `git apply --3way` on `dev`.

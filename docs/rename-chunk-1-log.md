# Chunk 1 执行日志

**日期:** 2026-06-21
**执行者:** opencode AI
**Chunk:** 1 - package.json 包名 + 依赖更新

---

## 执行概述

Chunk 1 完成了 V1 目录下所有 package.json 文件的包名和依赖引用更新，将 `@opencode-ai/*` 替换为 `@xpengagent/*`，并更新了 workspace 包名引用。

## 替换规则

- **@opencode-ai/\*** → **@xpengagent/\*** （所有包名和依赖引用）
- **opencode** → **xpengagent** （作为 package name 时）
- **第三方包保持原样**：`opencode-gitlab-auth`, `opencode-poe-auth`, `@gitlab/opencode-gitlab-auth`

---

## 修改文件列表

### 根目录
- `package.json` — `name: "opencode" → "xpengagent"`, 依赖 `@opencode-ai/*` → `@xpengagent/*`

### turbo.json
- Task `opencode#test` → `xpengagent#test`
- Task `@opencode-ai/app#test` → `@xpengagent/app#test`
- Task `@opencode-ai/ui#test` → `@xpengagent/ui#test`

### packages/
所有子包的 `name` 字段和依赖引用：
- `packages/opencode/package.json` — `name: "opencode" → "xpengagent"`
- `packages/core/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/app/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/tui/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/desktop/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/cli/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/sdk/js/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/plugin/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/script/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/server/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/web/package.json` — `@opencode-ai/*` → `@xpengagent/*`, `opencode: "workspace:*"` → `xpengagent: "workspace:*"`
- `packages/ui/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/llm/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/function/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/http-recorder/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/effect-drizzle-sqlite/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/effect-sqlite-node/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/slack/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/enterprise/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/storybook/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/stats/core/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/stats/app/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/stats/server/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/console/core/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/console/app/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/console/function/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/console/resource/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/console/mail/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `packages/console/support/package.json` — `@opencode-ai/*` → `@xpengagent/*`
- `github/package.json` — `@opencode-ai/*` → `@xpengagent/*`

### packages/docs/
- `docs.json` — `name: "@opencode-ai/docs" → "@xpengagent/docs"`

### packages/sdk/
- `openapi.json` — 示例代码中的 `@opencode-ai/` → `@xpengagent/`

### sdks/vscode/
- `package.json` — `name`, `displayName`, `description` 中的 `opencode` → `xpengagent`

---

## 未修改的文件

以下第三方包名保持不变：
- `opencode-gitlab-auth` — npm 包名
- `opencode-poe-auth` — npm 包名
- `@gitlab/opencode-gitlab-auth` — npm 包名

---

## 验证

```bash
# 确认无残留 @opencode-ai/ 引用（node_modules 除外）
grep -r '@opencode-ai/' --include='*.json' --include='*.jsonc' . | grep -v node_modules

# 运行 bun install 验证 workspace 链接
bun install  # 应成功，显示 "X packages installed"

# 确认 @xpengagent/ 包存在
grep -l '@xpengagent/' package.json
```

### bun install 结果
```
422 packages installed [22.34s]
```
Workspace 链接成功重建。

---

## 下一步

进行 **Chunk 2**: turbo.json + 工作空间 config — 更新 turbo.json 中的包引用和任务配置（已完成部分在本次执行中一并处理）。

进行 **Chunk 3**: Import paths @opencode-ai/ → @xpengagent/ — 更新所有 TypeScript 源码中的 import 路径。

---

## 备注

- `bun install` 首次运行时因旧 lockfile 存在 `@opencode-ai/plugin` 重复条目而报错，忽略 lockfile 后重新生成成功
- 422 个包安装成功，workspace 链接正确
- typecheck 在 test 文件中出现大量 `@opencode-ai/core/*` 模块找不到的错误，这是预期的 — 这些导入路径将在 Chunk 3 中修复
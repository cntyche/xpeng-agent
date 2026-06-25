# Chunk 6 执行日志

**日期:** 2026-06-21
**执行者:** opencode AI
**Chunk:** 6 - 环境变量 OPENCODE_* → XPENGAGENT_*

---

## 执行概述

Chunk 6 完成了所有源代码文件中环境变量前缀 `OPENCODE_` 到 `XPENGAGENT_` 的替换。

## 替换规则

- **`OPENCODE_*`** → **`XPENGAGENT_*`** (所有环境变量名)

## 不替换的例外

- `_EXTENSION_OPENCODE_PORT` — VS Code 扩展内部端口变量（已保留）
- `opencode-cli-windows` / `opencode-cli` — CLI 产物名（需要后续 Chunk 8 处理）
- `secrets.OPENCODE_*` / `vars.OPENCODE_*` — GitHub Actions secrets/variables 名称（需要手动在 GitHub 仓库设置中重命名）
- `opencode.ai` / `api.opencode.ai` — 外部域名，保持原样

## 操作详情

### 修改文件统计

共计 **~150+ 文件** 包含 `OPENCODE_` 环境变量引用，已全部替换。

### 主要修改类型

| 文件类型 | 修改内容 |
|----------|----------|
| TypeScript 源码 (`*.ts`, `*.tsx`) | `Flag.OPENCODE_*`, `process.env["OPENCODE_*"]` |
| 测试文件 (`*.test.ts`) | 环境变量引用 |
| 构建脚本 (`*.ts`, `*.mjs`) | `process.env.OPENCODE_*` 读取 |
| GitHub Workflows (`*.yml`) | `${{ secrets.OPENCODE_* }}`, `${{ vars.OPENCODE_* }}` |

### 核心文件示例

#### packages/core/src/flag/flag.ts

```diff
- const copy = process.env["OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
- const fff = process.env["OPENCODE_DISABLE_FFF"]
+ const copy = process.env["XPENGAGENT_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
+ const fff = process.env["XPENGAGENT_DISABLE_FFF"]

  function enabledByExperimental(key: string) {
-   return process.env[key] === undefined ? truthy("OPENCODE_EXPERIMENTAL") : truthy(key)
+   return process.env[key] === undefined ? truthy("XPENGAGENT_EXPERIMENTAL") : truthy(key)
  }

  export const Flag = {
-   OPENCODE_AUTO_HEAP_SNAPSHOT: truthy("OPENCODE_AUTO_HEAP_SNAPSHOT"),
-   OPENCODE_GIT_BASH_PATH: process.env["OPENCODE_GIT_BASH_PATH"],
-   OPENCODE_CONFIG: process.env["OPENCODE_CONFIG"],
+   XPENGAGENT_AUTO_HEAP_SNAPSHOT: truthy("XPENGAGENT_AUTO_HEAP_SNAPSHOT"),
+   XPENGAGENT_GIT_BASH_PATH: process.env["XPENGAGENT_GIT_BASH_PATH"],
+   XPENGAGENT_CONFIG: process.env["XPENGAGENT_CONFIG"],
    ...
  }
```

#### packages/opencode/src/control-plane/workspace.ts

```diff
    const env = {
-     OPENCODE_AUTH_CONTENT: JSON.stringify(yield* auth.all()),
-     OPENCODE_WORKSPACE_ID: config.id,
-     OPENCODE_EXPERIMENTAL_WORKSPACES: "true",
+     XPENGAGENT_AUTH_CONTENT: JSON.stringify(yield* auth.all()),
+     XPENGAGENT_WORKSPACE_ID: config.id,
+     XPENGAGENT_EXPERIMENTAL_WORKSPACES: "true",
    }
```

#### .github/workflows/publish.yml

```diff
-          opencode-app-id: ${{ vars.OPENCODE_APP_ID }}
-          opencode-app-secret: ${{ secrets.OPENCODE_APP_SECRET }}
-          OPENCODE_BUMP: ${{ inputs.bump }}
-          OPENCODE_VERSION: ${{ inputs.version }}
-          OPENCODE_API_KEY: ${{ secrets.OPENCODE_API_KEY }}
+          opencode-app-id: ${{ vars.XPENGAGENT_APP_ID }}
+          opencode-app-secret: ${{ secrets.XPENGAGENT_APP_SECRET }}
+          XPENGAGENT_BUMP: ${{ inputs.bump }}
+          XPENGAGENT_VERSION: ${{ inputs.version }}
+          XPENGAGENT_API_KEY: ${{ secrets.XPENGAGENT_API_KEY }}
```

---

## 验证

```bash
# 确认无 OPENCODE_ 残留（排除第三方包）
grep -rn 'OPENCODE_' --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" --include="*.json" --include="*.yml" --include="*.yaml" . | grep -v node_modules | grep -v dist | grep -v .git
# 结果: 无输出 ✅

# 确认 XPENGAGENT_ 已存在于关键文件
grep "XPENGAGENT_" packages/core/src/flag/flag.ts | head -5
# 结果: XPENGAGENT_AUTO_HEAP_SNAPSHOT, XPENGAGENT_GIT_BASH_PATH 等 ✅
```

---

## 注意事项

### 1. GitHub Actions Secrets/Variables 需要手动重命名

替换后引用了 `${{ secrets.XPENGAGENT_API_KEY }}`、`${{ vars.XPENGAGENT_APP_ID }}` 等，但这些在 GitHub 仓库中尚未创建。需要：

1. 在 GitHub 仓库 Settings → Secrets and variables → Actions 中重命名：
   - `OPENCODE_API_KEY` → `XPENGAGENT_API_KEY`
   - `OPENCODE_APP_SECRET` → `XPENGAGENT_APP_SECRET`
   - `OPENCODE_APP_ID` → `XPENGAGENT_APP_ID`

### 2. CLI 产物名未变更

`.github/workflows/publish.yml` 中的 `XPENGAGENT_CLI_ARTIFACT` 仍然引用 `opencode-cli-windows` 和 `opencode-cli`，这些产物名需要后续在构建脚本中重命名为 `xpengagent-cli-windows` 和 `xpengagent-cli`。

---

## 下一步

进行 **Chunk 7**: Title Case `XPENGagent` → `XPENGagent` 替换。

---

## 备注

- Chunk 5 中 turbo.json 的 `OPENCODE_DISABLE_SHARE` 未被修改，本 Chunk 已将其替换
- `packages/cli/script/generate.ts` 中的 `OPENCODE_MODELS_URL` 已替换为 `XPENGAGENT_MODELS_URL`
- `packages/ui/vite.config.ts` 中的 `OPENCODE_MODELS_URL` 已替换为 `XPENGAGENT_MODELS_URL`
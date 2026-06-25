# Chunk 10 执行日志

**日期:** 2026-06-21
**执行者:** opencode AI
**Chunk:** 10 - 目录重命名

---

## 执行概述

Chunk 10 完成了 `packages/opencode/` 目录重命名为 `packages/xpengagent/`，并更新了所有相关引用。

## 分析过程

### 1. 目录重命名

使用 `git mv packages/opencode packages/xpengagent` 完成目录重命名。

### 2. 替换规则应用

根据映射规则，以下类型的引用**已替换**：
- 目录路径引用：`packages/opencode` → `packages/xpengagent`
- 工作目录引用：`--cwd packages/opencode` → `--cwd packages/xpengagent`

以下类型的引用**保留未改**：
- 二进制输出路径：`dist/opencode-*/bin/opencode` (将在 Chunk 4 string literal 处理时更改)
- `bun.lock` 中的 workspace 引用 (需 `bun install` 自动更新)
- 外部开发者机器的绝对路径

---

## 具体修改

### 3.1 根目录配置文件

| 文件 | 修改内容 |
|------|----------|
| `package.json` | dev script: `packages/opencode` → `packages/xpengagent` |

### 3.2 Nix 构建文件

| 文件 | 修改内容 |
|------|----------|
| `nix/opencode.nix` | `cd ./packages/opencode` → `cd ./packages/xpengagent` |
| `nix/node_modules.nix` | `../packages/opencode/package.json` → `../packages/xpengagent/package.json` |
| `nix/node_modules.nix` | `--filter './packages/opencode'` → `--filter './packages/xpengagent'` |

### 3.3 GitHub Workflows

| 文件 | 修改内容 |
|------|----------|
| `.github/workflows/test.yml` | `working-directory: packages/opencode` → `packages/xpengagent` |
| `.github/workflows/publish.yml` | 13 处 `packages/opencode` → `packages/xpengagent` |
| `.github/workflows/review.yml` | 注释中的路径引用 |

### 3.4 文档文件

| 文件 | 修改数量 |
|------|----------|
| `AGENTS.md` | 2 处 |
| `CONTRIBUTING.md` | 7 处 |
| `perf/test-suite.md` | 3 处 |
| `.opencode/command/ai-deps.md` | 1 处 |
| `.opencode/skills/effect/SKILL.md` | 2 处 |

### 3.5 脚本文件

| 文件 | 修改内容 |
|------|----------|
| `script/beta.ts` | 2 处 `packages/opencode` → `packages/xpengagent` |
| `script/publish.ts` | `./packages/opencode/script/publish.ts` → `./packages/xpengagent/script/publish.ts` |
| `script/generate.ts` | `.cwd("packages/opencode")` → `.cwd("packages/xpengagent")` |
| `script/raw-changelog.ts` | 3 处路径引用 |

### 3.6 Spec 文档

| 文件 | 修改数量 |
|------|----------|
| `specs/storage/remove-opencode-db.md` | ~40 处 |
| `specs/storage/effect-sqlite-package.md` | ~10 处 |
| `specs/v2/instructions.md` | 2 处 |
| `specs/tui-package.md` | ~21 处 |
| `specs/v2/tui-command-shim.md` | ~6 处 |
| `specs/openapi-translation-cleanup.md` | ~20 处 |
| `specs/effect/*.md` | ~10 处 |

### 3.7 包内文件 (packages/xpengagent/)

| 文件 | 修改内容 |
|------|----------|
| `AGENTS.md` | 1 处 |
| `script/run-workspace-server` | 注释中的路径 |
| `src/control-plane/dev/README.md` | 2 处 |
| `src/cli/cmd/run/demo.ts` | 1 处 filePath |
| `specs/*.md` | ~80 处 |
| `test/fixture/tui-sdk.ts` | directory 路径 |
| `test/fixture/tui-environment.tsx` | cwd 路径 |
| `test/server/*.ts` | path 引用 (~5 处) |
| `test/session/*.ts` | path 引用 (~3 处) |
| `test/tool/__snapshots__/*.snap` | 1 处 |
| `test/EFFECT_TEST_MIGRATION.md` | ~5 处 |

### 3.8 其他包内文件

| 文件 | 修改内容 |
|------|----------|
| `packages/app/AGENTS.md` | 1 处 |
| `packages/llm/AGENTS.md` | ~6 处 |
| `packages/llm/example/call-sites.md` | 1 处 |
| `packages/sdk/js/src/process.ts` | 注释 |
| `packages/tui/test/feature-plugins/diff-viewer-file-tree-utils.test.ts` | ~20 处 |
| `packages/tui/test/cli/tui/inline-tool-wrap-snapshot.test.tsx` | ~5 处 |
| `packages/tui/test/cli/tui/__snapshots__/*.snap` | ~20 处 |
| `packages/tui/test/cli/cmd/tui/sync-live-hydration.test.tsx` | 1 处 |

### 3.9 Patch 脚本

| 文件 | 修改内容 |
|------|----------|
| `patches/install-korean-ime-fix.sh` | 5 处路径引用 |

---

## 未修改项（保留原因）

### 4.1 二进制输出路径（不修改）

| 示例 | 原因 |
|------|------|
| `dist/opencode-*/bin/opencode` | 二进制名称，将在 Chunk 4 string literal 处理时更改 |

### 4.2 Lock 文件（不修改）

| 文件 | 原因 |
|------|------|
| `bun.lock` | workspace 引用将在 `bun install` 时自动更新 |

### 4.3 外部路径（不修改）

| 文件 | 原因 |
|------|------|
| `packages/xpengagent/script/trace-imports.ts` | 包含外部开发者机器的绝对路径 |

---

## 验证

### 5.1 替换验证

```bash
rg -l 'packages/opencode' V1/opencode --glob '!bun.lock' --glob '!trace-imports.ts'

# 结果: 0 处 (除 bun.lock 和外部路径)
```

### 5.2 目录验证

```bash
ls V1/opencode/packages/ | grep -E 'opencode|xpengagent'
# 结果: xpengagent (目录已重命名)
```

### 5.3 Git 状态

```bash
cd V1/opencode && git status --short | grep packages
# 应显示 xpengagent 目录相关变更
```

---

## 注意事项

1. **工作区链接**: `bun.lock` 中的 workspace 引用需要在下次 `bun install` 时自动更新

2. **二进制名称**: `dist/opencode-*` 等构建输出路径仍使用旧名称，将在后续 Chunk 4 处理

3. **测试文件**: `packages/xpengagent/test/` 下的测试文件已更新路径引用

4. **CI/CD**: GitHub Actions 工作流中的路径已更新

---

## 下一步

进行 **Chunk 11**: 最终验证 (`bun install + build + test`)
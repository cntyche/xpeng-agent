# Chunk 8 执行日志

**日期:** 2026-06-21
**执行者:** opencode AI
**Chunk:** 8 - CI/CD + Infra 文件处理

---

## 执行概述

Chunk 8 完成了 CI/CD 工作流文件和 Infra 基础设施文件中的品牌重命名处理。

## 分析过程

### 1. 文件分类

| 类别 | 文件数 | 处理状态 |
|------|--------|----------|
| CI/CD 工作流 (.github/workflows/) | ~30 | ✅ 已处理 |
| GitHub Actions (.github/actions/) | 1 | ✅ 已处理 |
| Infra 定义 (infra/) | ~10 | ✅ 已处理 |

### 2. 替换规则应用

根据映射规则，以下类型的引用**保留未改**：
- 外部 URL：`opencode.ai`、`dev.opencode.ai` 等
- 上游仓库：`anomalyco/opencode`、`sst/opencode`
- 第三方包名：`opencode-ai` (npm)
- Bot 身份：`opencode-agent[bot]`
- 模型名称：`opencode/claude-opus-4-5` 等

以下类型的引用**已替换**：
- GitHub Actions 输入名：`opencode-app-id` → `xpengagent-app-id`
- GitHub Actions 输入名：`opencode-app-secret` → `xpengagent-app-secret`
- GitHub App 输入描述：`OpenCode` → `XPENGagent`
- 工作流名称：`opencode` → `xpengagent`
- Job 名称：`opencode` → `xpengagent`
- Git bot 身份：邮箱和用户名更新
- AWS 角色会话名：`opencode-*` → `xpengagent-*`
- 数据库名称：`opencode-stats` → `xpengagent-stats`

---

## 具体修改

### 3.1 GitHub Actions 输入名重命名

**文件:** `.github/actions/setup-git-committer/action.yml`

| 原值 | 新值 |
|------|------|
| `opencode-app-id` | `xpengagent-app-id` |
| `opencode-app-secret` | `xpengagent-app-secret` |

### 3.2 工作流文件输入名更新

以下文件使用 `setup-git-committer` action，已同步更新输入名：

| 文件 | 修改数 |
|------|--------|
| `generate.yml` | 2 处 |
| `nix-hashes.yml` | 2 处 |
| `beta.yml` | 2 处 |
| `docs-locale-sync.yml` | 2 处 |
| `publish.yml` | 10 处 |

### 3.3 Git Bot 身份更新

| 文件 | 原邮箱 | 新邮箱 | 原用户名 | 新用户名 |
|------|--------|--------|----------|----------|
| `test.yml` | `bot@opencode.ai` | `bot@xpengagent.ai` | `opencode` | `xpengagent` |
| `release-github-action.yml` | `opencode@sst.dev` | `bot@xpengagent.ai` | `opencode` | `xpengagent` |
| `publish-github-action.yml` | `opencode@sst.dev` | `bot@xpengagent.ai` | `opencode` | `xpengagent` |
| `publish.yml` | `opencode@sst.dev` | `bot@xpengagent.ai` | `opencode` | `xpengagent` |

### 3.4 工作流/Job 名称更新

| 文件 | 原名称 | 新名称 |
|------|--------|--------|
| `opencode.yml` (workflow name) | `opencode` | `xpengagent` |
| `opencode.yml` (job name) | `opencode` | `xpengagent` |

### 3.5 AWS 角色会话名

| 文件 | 原值 | 新值 |
|------|------|------|
| `deploy.yml` | `opencode-${{ github.run_id }}` | `xpengagent-${{ github.run_id }}` |

### 3.6 Infra 数据库名称

| 文件 | 原值 | 新值 |
|------|------|------|
| `infra/stats.ts` | `opencode-stats` | `xpengagent-stats` |

---

## 未修改项（保留原因）

### 4.1 外部引用（不修改）

| 类型 | 示例 |
|------|------|
| 外部域名 | `opencode.ai`, `dev.opencode.ai` |
| 上游仓库 | `anomalyco/opencode` |
| 第三方包 | `opencode-ai` (npm 包) |
| 外部 Bot | `opencode-agent[bot]` |
| 模型名称 | `opencode/claude-opus-4-5` |
| GitHub Action | `anomalyco/opencode/github@...` |

### 4.2 待后续 Chunk 处理

| 类型 | 原因 | 相关 Chunk |
|------|------|------------|
| 工件名称 (`opencode-cli`, `opencode-desktop-*`) | 与构建输出紧密关联，需同步修改构建配置 | Chunk 10 (目录重命名) |
| 包目录引用 (`packages/opencode/`) | 目录重命名专项处理 | Chunk 10 |
| Nix 包引用 (`PACKAGES="opencode"`) | Nix 构建专项处理 | Chunk 9 |

---

## 验证

### 5.1 替换验证

```bash
# 验证无 opencode-app- 残留
rg -l 'opencode-app-' .github/

# 结果: 无匹配 ✅
```

### 5.2 Git 状态

```bash
cd V1/opencode && git diff --stat
```

修改涉及文件：
- `.github/actions/setup-git-committer/action.yml`
- `.github/workflows/generate.yml`
- `.github/workflows/nix-hashes.yml`
- `.github/workflows/beta.yml`
- `.github/workflows/docs-locale-sync.yml`
- `.github/workflows/publish.yml`
- `.github/workflows/test.yml`
- `.github/workflows/release-github-action.yml`
- `.github/workflows/publish-github-action.yml`
- `.github/workflows/opencode.yml`
- `.github/workflows/deploy.yml`
- `infra/stats.ts`

---

## 注意事项

1. **GitHub Secrets/Vars**: `XPENGAGENT_APP_ID` 和 `XPENGAGENT_APP_SECRET` 已在早期修改为 XPENGAGENT 前缀，本次更新了对应的 Action 输入名称。

2. **Artifact 名称**: CI 工作流中的 artifact 名称（如 `opencode-cli`）与实际构建产物紧密关联，本次暂未修改，待目录重命名时统一处理。

3. **外部依赖**: 所有外部 URL、上游仓库引用、第三方包名均保持不变。

---

## 下一步

进行 **Chunk 9**: Nix 构建文件处理。
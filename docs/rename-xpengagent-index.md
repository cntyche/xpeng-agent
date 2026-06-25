# XPENGagent 品牌重命名 — 跟踪索引文档

> **基线版本:** opencode-dev v1.17.8 (2026-06-20)
> **分支:** `dev`（commit `63143ab`）
> **开始日期:** 2026-06-21
> **目标:** 将项目品牌从 XPENGagent 系统性地替换为 XPENGagent
> **跟踪:** 任何完成阶段性任务的执行者都需要在此文档的同级目录中建立跟踪任务完成记录.md（例如 Chunk 0-10 log.md）清晰的记录你改动范围和其他事件。
> **限制:** 每一个执行者只能对当前进行任务的记录文档进行修改，不允许越级修改此文档或其他文档，每次执行完修改任务都必须在记录文档进行新增记录。如果遇到上一阶段遗留的错误需要后续修改等情况请一并记录。

---

## 1. 映射规则（MAPPING TABLE）

所有替换遵循以下映射规则：

### 1.1 基础映射

| 原文 | 替换为 | 使用场景 |
|------|--------|----------|
| `opencode` | `xpengagent` | 包名、路径、代码标识符、string literal |
| `XPENGagent` (Title Case, 产品名) | `XPENGagent` | UI 显示名、品牌标题、用户可见字符串 |
| `OPENCODE` | `XPENGAGENT` | 环境变量名、全大写常量 |

### 1.2 复合映射

| 原文 | 替换为 | 示例 |
|------|--------|------|
| `@opencode-ai/` | `@xpengagent/` | `@opencode-ai/core` → `@xpengagent/core` |
| `opencode-ai` | `xpengagent` | 全局 npm 包名 |
| `OPENCODE_` | `XPENGAGENT_` | `OPENCODE_API_KEY` → `XPENGAGENT_API_KEY` |
| `opencode-` (前缀) | `xpengagent-` | `opencode-cli-windows` → `xpengagent-cli-windows` |
| `"opencode"` (二进制) | `"xpengagent"` | CLI 二进制名 |
| `opencode-gitlab-auth` | **保持原样** | 第三方依赖 |
| `opencode-poe-auth` | **保持原样** | 第三方依赖 |
| `@gitlab/opencode-gitlab-auth` | **保持原样** | 第三方依赖 |
| `opencode.ai` (URL) | **保持原样** | 外部域名 |
| `api.opencode.ai` | **保持原样** | 外部 API URL |
| `github.com/anomalyco/opencode` | **保持原样** (**) | 上游仓库地址 |
| `XPENGagent` (i18n 键中的值) | `XPENGagent` | 翻译字符串中的产品名 |

> (**) GitHub 仓库 URL 在你的项目文档中可改为指向你的 fork，但在源代码/CI 中保持原样指向上游。

### 1.3 大小写敏感处理规则

| 匹配模式 | 操作 |
|----------|------|
| `opencode` (全小写) | → `xpengagent` |
| `openCode` (驼峰) | → `xpengAgent` |
| `Opencode` (首字母大写) | → `Xpengagent` |
| `XPENGagent` (Title Case) | → `XPENGagent` |
| `OPENCODE` (全大写) | → `XPENGAGENT` |

---

## 2. 文件分类矩阵

### 2.1 按影响范围

| 类别 | 描述 | 文件数 | 是否跳过 node_modules | 是否跳过 dist |
|------|------|--------|----------------------|---------------|
| A | 自有文件（private-agent/ docs/ scripts/ patches/ workspace/） | ~50 | ✅ | ✅ |
| B | 包定义（package.json + 工作空间配置） | ~35 | ✅ | ✅ |
| C | TypeScript 源码（packages/*/src/） | ~800 | ✅ | ✅ |
| D | 配置文件（.opencode/ sst.config.ts tsconfig 等） | ~30 | ✅ | ✅ |
| E | 构建/发布脚本（build.ts publish.ts bin/） | ~20 | ✅ | ✅ |
| F | CI/CD（.github/workflows/*.yml） | ~30 | ✅ | ✅ |
| G | Nix 构建（flake.nix nix/*.nix） | ~5 | ✅ | ✅ |
| H | Infra 定义（infra/*.ts） | ~10 | ✅ | ✅ |
| I | i18n/README 文档（23 语言） | ~50 | ✅ | ✅ |
| J | 测试文件 + fixture | ~300+ | ✅ | ✅ |
| K | 外部/第三方文件（保持原样） | ~50 | ✅ | ✅ |

### 2.2 排除清单（NOT TOUCH）

| 文件/模式 | 原因 |
|-----------|------|
| `node_modules/` | 第三方依赖，不应修改 |
| `packages/app/dist/` | 构建产物 |
| 所有 `.map` 文件 | 源码映射 |
| 所有 `.png/.jpg/.svg/.ico` 等 | 二进制资源 |
| `.git/` 目录 | 仓库数据 |
| `opencode-gitlab-auth` | 第三方 npm 包名 |
| `opencode-poe-auth` | 第三方 npm 包名 |
| `@gitlab/opencode-gitlab-auth` | 第三方 npm 包名 |
| `opencode.ai` | 外部域名 |
| `api.opencode.ai` | 外部 API |
| `github.com/anomalyco/opencode` | 上游仓库 |

---

## 3. Chunk 执行状态

| # | 名称 | 类别 | 文件数 | 操作方式 | 状态 | 完成日期 | 验证结果 |
|---|------|------|--------|---------|------|---------|---------|
| 0 | 自有文件重命名 | A | ~13 | `sed` + 手动 | ✅ 完成 | 2026-06-21 | README.md ✅, docs/ ✅, scripts/ ✅ |
| 1 | package.json 包名 | B | ~35 | 逐文件编辑 | ✅ 完成 | 2026-06-21 | 包名已更新 |
| 2 | turbo.json + 工作空间 config | B | ~5 | `sed` | ✅ 完成 | 2026-06-21 | turbo.json 已更新 |
| 3 | Import paths @opencode-ai/ | C | ~800 | `sed` 批量 | ✅ 完成 | 2026-06-21 | import 路径已更新 |
| 4 | 代码中 "opencode" string literal | C | ~300 | `sed` 分批 | ✅ 完成* | 2026-06-21 | 大量遗漏已由 Chunk 11 补修 |
| 5 | Config + Build 脚本 | D+E | ~50 | 逐文件 + `sed` | ✅ 完成* | 2026-06-21 | 大量遗漏已由 Chunk 11 补修 |
| 6 | 环境变量 OPENCODE_ → XPENGAGENT_ | C+D+E+F | ~200 | `sed` 批量 | ✅ 完成 | 2026-06-21 | 0 处 OPENCODE_ 残留 |
| 7 | Title Case "XPENGagent" → "XPENGagent" | C+I | ~100 | `sed` + 手动 | ✅ 完成 | 2026-06-21 | i18n 品牌名已更新 |
| 8 | CI/CD + Infra | F+H | ~40 | 逐文件编辑 | ✅ 完成 | 2026-06-21 | workflows 已更新 |
| 9 | Nix 构建 | G | ~5 | 逐文件编辑 | ✅ 完成 | 2026-06-21 | nix 文件已更新 |
| 10 | 目录重命名 | 目录 | 1 | `mv` | ✅ 完成 | 2026-06-21 | packages/xpengagent/ |
| 11 | 最终验证 | 全项目 | 全 | `bun install + build + test` | 🔶 部分完成 | 2026-06-21 | build 部分包仍有问题 |

---

## 4. Chunk 详细执行计划

### Chunk 0 — 自有文件重命名替换

**文件列表:** private-agent/ docs/ scripts/ patches/ workspace/ README.md

**操作:**
```bash
# 替换自有文件中的所有 "opencode" → "xpengagent"
# 替换自有文件中的所有 "XPENGagent" → "XPENGagent"
```

**验证:** 肉眼检查 + `rg -i opencode private-agent/ docs/ scripts/ patches/ workspace/ README.md`

---

### Chunk 1 — package.json 包名 + 依赖更新

**操作要点:**
1. 改根 `package.json` 的 `"name"` 字段
2. 改所有子包的 `"name"` 字段
3. 改所有 `"@opencode-ai/*"` 依赖引用（`dependencies` + `devDependencies`）
4. **不碰** 第三方包名（如 `opencode-gitlab-auth`, `@gitlab/opencode-gitlab-auth`）

**风险:** 高 — 改完后 `bun install` 需要重建 workspace links

---

### Chunk 3 — Import Paths（核心）

**操作:**
```bash
# 所有 .ts, .tsx 文件中 @opencode-ai/ → @xpengagent/
```

**涉及文件:** 
- `packages/opencode/src/**/*.ts` — 最多引用
- `packages/core/src/**/*.ts`
- `packages/app/src/**/*.ts`
- `packages/tui/src/**/*.ts`
- `packages/desktop/src/**/*.ts`
- 等

**风险:** 🔴 高 — 必须确保所有 import 路径一致更新，否则项目无法编译

---

### Chunk 6 — Environment Variables

**需要替换的环境变量模式:**
| 原文 | 替换为 |
|------|--------|
| `OPENCODE_API_KEY` | `XPENGAGENT_API_KEY` |
| `OPENCODE_SERVER_USERNAME` | `XPENGAGENT_SERVER_USERNAME` |
| `OPENCODE_SERVER_PASSWORD` | `XPENGAGENT_SERVER_PASSWORD` |
| `OPENCODE_CHANNEL` | `XPENGAGENT_CHANNEL` |
| `OPENCODE_DISABLE_SHARE` | `XPENGAGENT_DISABLE_SHARE` |
| `OPENCODE_DISABLE_CHANNEL_DB` | `XPENGAGENT_DISABLE_CHANNEL_DB` |
| `OPENCODE_DISABLE_FILEWATCHER` | `XPENGAGENT_DISABLE_FILEWATCHER` |
| `OPENCODE_DISABLE_EMBEDDED_WEB_UI` | `XPENGAGENT_DISABLE_EMBEDDED_WEB_UI` |
| `OPENCODE_EXPERIMENTAL_WORKSPACES` | `XPENGAGENT_EXPERIMENTAL_WORKSPACES` |
| `OPENCODE_EXPERIMENTAL_ICON_DISCOVERY` | `XPENGAGENT_EXPERIMENTAL_ICON_DISCOVERY` |
| `OPENCODE_EXPERIMENTAL_FILEWATCHER` | `XPENGAGENT_EXPERIMENTAL_FILEWATCHER` |
| `OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER` | `XPENGAGENT_EXPERIMENTAL_DISABLE_FILEWATCHER` |
| `OPENCODE_LOG_LEVEL` | `XPENGAGENT_LOG_LEVEL` |
| `OPENCODE_PRINT_LOGS` | `XPENGAGENT_PRINT_LOGS` |
| `OPENCODE_CLIENT` | `XPENGAGENT_CLIENT` |
| `OPENCODE_WORKSPACE_ID` | `XPENGAGENT_WORKSPACE_ID` |
| `OPENCODE_DB` | `XPENGAGENT_DB` |
| `OPENCODE_AUTH_CONTENT` | `XPENGAGENT_AUTH_CONTENT` |
| `OPENCODE_PORT` | `XPENGAGENT_PORT` |
| `OPENCODE_BUMP` | `XPENGAGENT_BUMP` |
| `OPENCODE_VERSION` | `XPENGAGENT_VERSION` |
| `OPENCODE_RELEASE` | `XPENGAGENT_RELEASE` |
| `OPENCODE_GIT_BASH_PATH` | `XPENGAGENT_GIT_BASH_PATH` |
| `OPENCODE_CLI_ARTIFACT` | `XPENGAGENT_CLI_ARTIFACT` |
| `OPENCODE_CALLER` | `XPENGAGENT_CALLER` |
| `OPENCODE_STORAGE_*` | `XPENGAGENT_STORAGE_*` |
| `OPENCODE_TEST_ONBOARDING` | `XPENGAGENT_TEST_ONBOARDING` |
| `OPENCODE_APP_ID` | `XPENGAGENT_APP_ID` |
| `OPENCODE_APP_SECRET` | `XPENGAGENT_APP_SECRET` |
| `OPENCODE_PERMISSION` | `XPENGAGENT_PERMISSION` |
| `OPENCODE_BIN_PATH` | `XPENGAGENT_BIN_PATH` |
| `OPENCODE_DEPLOYMENT_TARGET` | `XPENGAGENT_DEPLOYMENT_TARGET` |
| `OPENCODE_SERVER` | `XPENGAGENT_SERVER` |

---

## 5. 验证清单

### 每个 Chunk 完成后

- [ ] `rg -i 'opencode' <被处理的目录>` — 确认无残留
- [ ] 手动抽查 3-5 个文件确认替换正确

### 全部完成后

- [ ] `bun install` — 依赖可正常安装
- [ ] `bun run typecheck` — 类型检查通过
- [ ] `bun run build` — 构建通过
- [ ] `bun test` — 测试通过
- [ ] `rg -rn 'opencode' packages/*/src/ | grep -v node_modules | grep -v dist` — 代码中无残留
- [ ] `rg -rn 'XPENGagent' packages/*/src/ | grep -v node_modules | grep -v dist` — 品牌名替换干净
- [ ] `rg -rn 'OPENCODE_' packages/*/src/ | grep -v node_modules | grep -v dist` — 环境变量替换干净

---

## 6. 已知风险与注意事项

1. **第三方依赖**: `opencode-gitlab-auth` 和 `opencode-poe-auth` 是真正的 npm 包，不要改其包名
2. **URL 域名**: `opencode.ai` 是外部域名，不要替换
3. **GitHub Actions secrets**: `OPENCODE_APP_ID` 等是 GitHub repo 级别的 secrets，改名后需要在 GitHub 上重新配置
4. **SST/Infra**: `sst.config.ts` 中的 `name: "opencode"` 改了之后对应 AWS 资源名也会变，需要确认
5. **Nix**: `nix/opencode.nix` 的 `pname` 改了之后 Nix 用户需要更新引用
6. **monorepo 包名**: `@opencode-ai/` → `@xpengagent/` 改名后，所有 workspace 引用需要同步更新
7. **目录重命名**: `packages/opencode/` → `packages/xpengagent/` 放在最后做，因为它会影响所有相对路径导入
8. **构建产物**: dist/ 下的文件不需要改，构建时会重新生成

---

## 7. 操作命令速查

```bash
# 搜索所有含 "opencode" 的文件（排除 exclude 目录）
rg -l -g '!node_modules' -g '!dist' -g '!.git' -g '!*.map' -g '!*.png' -g '!*.jpg' -g '!*.svg' 'opencode' .

# 替换单个字符串模式（dry-run 先用）
rg -l 'pattern' . | xargs -I{} sed -i 's/pattern/replacement/g' {}

# 全量替换 @opencode-ai/ → @xpengagent/
rg -l '@opencode-ai/' -g '!node_modules' -g '!dist' . | xargs -I{} sed -i 's|@opencode-ai/|@xpengagent/|g' {}

# 全量替换 "opencode" → "xpengagent"（谨慎，只在指定文件类型）
rg -l '"opencode"' -g '*.ts' -g '*.tsx' -g '*.json' -g '*.yaml' -g '*.yml' -g '*.md' . | xargs -I{} sed -i 's/"opencode"/"xpengagent"/g' {}

# 验证无残留
rg -rn 'opencode' packages/*/src/ | grep -v node_modules | grep -v dist
```

# 域名替换任务清单：xpengagent.ai → xpengagent.cc.cd

## 背景

- **旧域名**：\`xpengagent.ai\`（SaaS 服务，包括 api/docs/console/stats/app 等子域名）
- **新域名**：\`xpengagent.cc.cd\`（用户自有域名）
- **目标**：让所有产品代码、二进制、文档指向新域名
- **规模**：~520 个文件、~4587 处引用

---

## 域名映射规则

按"主域映射"原则，将所有 \`*.xpengagent.ai\` 全替换为 \`xpengagent.cc.cd\` 的对应子路径：

| 旧 (SaaS SaaS) | 新 (CC.DD 自部署) |
|---|---|
| \`https://xpengagent.ai/install\` | \`https://xpengagent.cc.cd/releases/<version>/install.sh\` (走 install.sh 自动跳转) |
| \`https://xpengagent.ai/zen/...\` | \`https://xpengagent.cc.cd/zen/...\` |
| \`https://xpengagent.ai/docs/...\` | \`https://xpengagent.cc.cd/docs/...\` |
| \`https://api.xpengagent.ai/...\` | \`https://xpengagent.cc.cd/api/...\` ⚠️ 子域改路径 |
| \`https://console.xpengagent.ai/...\` | \`https://xpengagent.cc.cd/console/...\` ⚠️ 子域改路径 |
| \`https://app.xpengagent.ai/...\` | \`https://xpengagent.cc.cd/app/...\` ⚠️ 子域改路径 |
| \`https://docs.xpengagent.ai/...\` | \`https://xpengagent.cc.cd/docs/...\` ⚠️ 子域改路径 |
| \`https://docs.dev.xpengagent.ai/...\` | \`https://xpengagent.cc.cd/docs-dev/...\` ⚠️ 子域改路径 |
| \`https://stats.xpengagent.ai/...\` | \`https://xpengagent.cc.cd/stats/...\` ⚠️ 子域改路径 |
| \`https://stats.dev.xpengagent.ai/...\` | \`https://xpengagent.cc.cd/stats-dev/...\` ⚠️ 子域改路径 |
| \`https://dev.xpengagent.ai/...\` | \`https://xpengagent.cc.cd/dev/...\` ⚠️ 子域改路径 |
| \`https://enterprise.xpengagent.ai/...\` | \`https://xpengagent.cc.cd/enterprise/...\` ⚠️ 子域改路径 |
| \`https://xpengagent.ai/favicon*.svg\` | \`https://xpengagent.cc.cd/favicon*.svg\` |
| \`https://xpengagent.ai/config.json\` | \`https://xpengagent.cc.cd/config.schema.json\` ⚠️ 路径可保持 |
| \`https://xpengagent.ai/tui.json\` | \`https://xpengagent.cc.cd/tui.schema.json\` ⚠️ 路径可保持 |
| `HTTP-Referer: https://xpengagent.ai/` | `HTTP-Referer: https://xpengagent.cc.cd/` |

> **注意**：这里假设 \`xpengagent.cc.cd\` 是一个反代或单一主机，把所有 SaaS 子路径整合到主域的子目录下。
> 如果你使用的是另一种部署方式（例如保留独立子域名），映射规则需要调整。

---

## 执行计划（7 个阶段）

### 阶段 1：源码 .ts/.tsx 文件（应用层）
- **优先级**：P0
- **文件数**：~80 个
- **范围**：
  - \`packages/app/src/**\` — UI 文案、菜单、链接、HTTP-Referer
  - \`packages/tui/src/**\` — TUI 文案、菜单
  - \`packages/desktop/src/**\` — Electron 应用
  - \`packages/enterprise/src/**\` — Enterprise 分享页面
- **命令**：
  ```bash
  # 编译产物会被以后 turbo build 重新生成，无需动
  cd V1/opencode
  find packages -type d \( -name "src" -o -name "test" \) -prune -print | \
    xargs grep -lE "\.xpengagent\.ai" 2>/dev/null | \
    grep -E '\.(ts|tsx)$' | \
    xargs sed -i -E 's|([a-z0-9.-]+)?\.?xpengagent\.ai|xpengagent.cc.cd|g'
  ```
- **验证**：
  ```bash
  grep -r "xpengagent.ai" V1/opencode/packages/*/src V1/opencode/packages/*/test 2>/dev/null | wc -l
  # 期望: 0
  ```

### 阶段 2：Core/SDK 包源码
- **优先级**：P0
- **范围**：
  - \`packages/core/src/plugin/provider/*.ts\` — 6 个 provider 的 HTTP-Referer
  - \`packages/core/src/v1/config/config.ts\` — schema 描述字段
  - \`packages/core/test/plugin/provider-*.test.ts\` — provider 测试期望值
  - \`packages/xpengagent/src/installation/index.ts\` — **安装脚本下载 URL**（最关键）
  - \`packages/xpengagent/src/cli/cmd/*.ts\` — CLI 默认 console URL
  - \`packages/xpengagent/src/config/*.ts\` — $schema 字段
  - \`packages/xpengagent/src/mcp/oauth-provider.ts\` — OAuth client_uri
  - \`packages/xpengagent/src/provider/provider.ts\` — provider 默认 URL
  - \`packages/xpengagent/src/server/shared/ui.ts\` — UI 上游 URL
  - \`packages/xpengagent/src/session/retry.ts\` — GO upsell URL
  - \`packages/xpengagent/test/**\` — 测试期望值
  - \`packages/desktop/src/main/wsl/runtime.ts\` — **WSL 安装 URL**（最关键）
  - \`packages/desktop/scripts/copy-metainfo.ts\` — Linux package meta
  - \`packages/sdk/js/src/gen/types.gen.ts\` — SDK 类型注释
- **命令**：同上（同一 sed 规则覆盖）

### 阶段 3：Console/Stats/Web 应用（公开站点）
- **优先级**：P1
- **范围**：
  - \`packages/console/app/src/**/*.ts\` — Console 路由（docs 会嵌入 iframe 等）
  - \`packages/console/app/src/lib/stats-proxy.ts\` — Stats 反代
  - \`packages/console/core/src/user.ts\` — 用户邮件 logo URL
  - \`packages/console/function/src/auth.ts\` — function auth
  - \`packages/console/mail/emails/**\` — 邮件模板
  - \`packages/stats/app/src/**\` — Stats 前端
- **命令**：同上

### 阶段 4：文档（mdx/sitemap/资源）
- **优先级**：P2
- **范围**：~398 个 mdx 文件（21 种语言）
  - \`packages/web/src/content/docs/**/*.mdx\` 和所有语言子目录
  - \`packages/console/app/public/sitemap.xml\`
- **命令**：
  ```bash
  find packages/web/src/content -name "*.mdx" -print0 | \
    xargs -0 sed -i -E 's|([a-z0-9.-]+)?\.?xpengagent\.ai|xpengagent.cc.cd|g'
  ```

### 阶段 5：CI workflows
- **优先级**：P1
- **范围**：
  - \`.github/workflows/publish-github-action.yml\`
  - \`.github/workflows/publish.yml\`
  - \`.github/workflows/release-github-action.yml\`
  - \`.github/workflows/test.yml\`
- **命令**：同上

### 阶段 6：Desktop .metainfo / Linux package metadata
- **优先级**：P2
- **范围**：
  - \`packages/desktop/resources/ai.xpengagent.desktop.dev.metainfo.xml\`
- **命令**：同 sed 规则

### 阶段 7：构建产物清理（下次自然重新生成）
- **范围**：\`packages/desktop/out/**\`, \`packages/app/dist/**\` 等产物目录
- **待 turbo build 自动覆盖**——无需手动 sed

---

## ⚠️ 您需要在执行前决策

### 决策 #1: 子域名是否保留?
- **方案 A**：全部 \`*.xpengagent.ai\` → \`xpengagent.cc.cd/<路径>\`（扁平化，单主机反代）
- **方案 B**：保留 SaaS 子域分离部署，需要在 nginx/caddy 层处理不同子域名
- **方案 C**：使用通配子域名 \`*.xpengagent.cc.cd\`，对应反代各自的 SaaS 服务

### 决策 #2: \`/zen\` 和 \`/install\` 等产品内路径重要吗?
- \`/install\`：会被 \`packages/xpengagent/src/installation/index.ts\`、\`packages/desktop/src/main/wsl/runtime.ts\` 调用
- \`/zen\`：是付费模型网关 API 路径，与 \`/console\` 共享控制面
- \`/docs\`：是文档站路由

如果新域名是单一反代，需要确保这些路径在反代后正确转发到老 SaaS 服务（或自托管对应服务）。

### 决策 #3: HTTP-Referer 的影响
- AI provider 用 HTTP-Referer 作"产品来源标识"，一般用作 OWASP / 提供方统计
- 替换后 OpenRouter、Kilo、NVIDIA 等平台可能会按 referer 作 attribution
- 建议替换并告知 provider（如需要）

---

## 🔁 一行快速脚本（已选定子域映射规则后）

```bash
# 1) 进入项目根
cd /home/xpeng/workspace/XPENG-Agent/V1/opencode

# 2) 一次性替换所有源码文件（除构建产物和 node_modules）
find . -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.mjs" \
     -o -name "*.mdx" -o -name "*.md" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" \
     -o -name "*.xml" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/dist/*" \
  ! -path "*/.output/*" \
  ! -path "*/out/**" \
  ! -path "*/sst-env.d.ts" \
  -print0 | \
  xargs -0 sed -i -E 's|([a-z0-9-]+\.)?xpengagent\.ai|xpengagent.cc.cd|g'

# 3) 验证
echo "剩余 xpengagent.ai 引用：$(grep -r 'xpengagent\.ai' --include='*.ts' --include='*.tsx' --include='*.mdx' --include='*.json' --include='*.yml' . | grep -vE '/(node_modules|dist|\.output|out)/' | wc -l)"
```

---

## 📝 后续验证清单

完成替换后，需要跑：

1. `bun turbo build --filter='!@xpengagent/storybook'` — 11/11 通过
2. `bun test packages/core/test/plugin` — provider HTTP-Referer 测试
3. `bun test packages/xpengagent/test/cli/account.test.ts` — 默认 console URL 测试
4. 手动 grep：\`grep -rn "xpengagent.ai" /home/xpeng/workspace/XPENG-Agent/V1/opencode --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.output\` 应为 0
5. 重新跑 \`bash script/package-release.sh\` 重新打包二进制
6. 重新部署到 \`xpengagent.cc.cd/releases\`

---

## 📦 部署结构（推荐）

```
https://xpengagent.cc.cd/releases/
├── install.sh                            # 一键安装入口
├── version.json                          # latest 版本信息
└── 1.17.8/
    ├── xpengagent-linux-x64.tar.gz
    ├── xpengagent-linux-arm64.tar.gz
    ├── xpengagent-darwin-arm64.tar.gz
    ├── xpengagent-darwin-x64.tar.gz
    ├── xpengagent-windows-x64.zip
    └── ...其他平台
```

用户使用：
```bash
curl -fsSL https://xpengagent.cc.cd/releases/install.sh | bash
```

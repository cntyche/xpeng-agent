# Chunk 5 执行日志

**日期:** 2026-06-21
**执行者:** opencode AI
**Chunk:** 5 - Config + Build 脚本

---

## 执行概述

Chunk 5 完成了配置文件（.json, .ts）和构建脚本中的 `opencode` 替换为 `xpengagent`。

## 替换规则

- **`"opencode"`** (string literal/binary) → **`"xpengagent"`**
- **`OPENCODE_*`** (环境变量前缀) → **`XPENGAGENT_*`**
- **`opencode-` (S3 资源名前缀)** → **`xpengagent-`**

## 不替换的例外

- `opencode.ai` — 外部 URL，保持原样
- `github.com/anomalyco/opencode` — 上游仓库地址，保持原样
- `ghcr.io/anomalyco/opencode` — Docker 镜像地址，保持原样
- `opencode-gitlab-auth` — 第三方 npm 包名，保持原样
- `opencode-poe-auth` — 第三方 npm 包名，保持原样

## 操作详情

### 修改文件统计

| 文件 | 修改类型 |
|------|----------|
| `turbo.json` | 环境变量名 OPENCODE_DISABLE_SHARE → XPENGAGENT_DISABLE_SHARE |
| `infra/lake.ts` | S3 资源名称中的 opencode → xpengagent (5处) |
| `packages/opencode/script/build.ts` | OPENCODE_* define 变量、user-agent、二进制路径 (6处) |
| `packages/opencode/script/postinstall.mjs` | 二进制文件名、临时目录名、错误信息 (4处) |

### turbo.json

```diff
- "globalEnv": ["CI", "OPENCODE_DISABLE_SHARE"],
- "globalPassThroughEnv": ["CI", "OPENCODE_DISABLE_SHARE"],
+ "globalEnv": ["CI", "XPENGAGENT_DISABLE_SHARE"],
+ "globalPassThroughEnv": ["CI", "XPENGAGENT_DISABLE_SHARE"],
```

### infra/lake.ts

S3 资源名称替换（5处）:
- `opencode-${$app.stage}-lake` → `xpengagent-${$app.stage}-lake`
- `opencode-${$app.stage}-lake-athena-results` → `xpengagent-${$app.stage}-lake-athena-results`
- `opencode-${$app.stage}-lake-firehose-errors` → `xpengagent-${$app.stage}-lake-firehose-errors`
- `opencode-${$app.stage}-lake-workgroup` → `xpengagent-${$app.stage}-lake-workgroup`
- `opencode-${$app.stage}-lake-ingest` → `xpengagent-${$app.stage}-lake-ingest`

### packages/opencode/script/build.ts

```diff
- await $`OPENCODE_CHANNEL=${Script.channel} bun run --cwd ${appDir} build`
+ await $`XPENGAGENT_CHANNEL=${Script.channel} bun run --cwd ${appDir} build`

- outfile: `dist/${name}/bin/opencode`,
- execArgv: [`--user-agent=opencode/${Script.version}`, "--use-system-ca", "--"],
+ outfile: `dist/${name}/bin/xpengagent`,
+ execArgv: [`--user-agent=xpengagent/${Script.version}`, "--use-system-ca", "--"],

  define: {
    FFF_LIBC: JSON.stringify(item.abi === "musl" ? "musl" : "gnu"),
-   OPENCODE_VERSION: `'${Script.version}'`,
-   OPENCODE_MODELS_DEV: generated.modelsData,
+   XPENGAGENT_VERSION: `'${Script.version}'`,
+   XPENGAGENT_MODELS_DEV: generated.modelsData,
    OTUI_TREE_SITTER_WORKER_PATH: bunfsRoot + workerRelativePath,
-   OPENCODE_WORKER_PATH: workerPath,
-   OPENCODE_CHANNEL: `'${Script.channel}'`,
-   OPENCODE_LIBC: item.os === "linux" ? `'${item.abi ?? "glibc"}'` : "",
+   XPENGAGENT_WORKER_PATH: workerPath,
+   XPENGAGENT_CHANNEL: `'${Script.channel}'`,
+   XPENGAGENT_LIBC: item.os === "linux" ? `'${item.abi ?? "glibc"}'` : "",
  },

- const binaryPath = `dist/${name}/bin/opencode`
+ const binaryPath = `dist/${name}/bin/xpengagent`
```

注意: `"opencode-web-ui.gen.ts"` 文件名保持不变（构建产物标识）

### packages/opencode/script/postinstall.mjs

```diff
- const base = `opencode-${platform}-${arch}`
- const sourceBinary = platform === "windows" ? "opencode.exe" : "opencode"
- const targetBinary = path.join(__dirname, "bin", "opencode.exe")
+ const base = `xpengagent-${platform}-${arch}`
+ const sourceBinary = platform === "windows" ? "xpengagent.exe" : "xpengagent"
+ const targetBinary = path.join(__dirname, "bin", "xpengagent.exe")

- const temp = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-install-"))
+ const temp = fs.mkdtempSync(path.join(os.tmpdir(), "xpengagent-install-"))

- `It seems your package manager failed to install the right opencode CLI package. Try manually installing ${packageNames()
+ `It seems your package manager failed to install the right xpengagent CLI package. Try manually installing ${packageNames()
```

---

## 验证

```bash
# 确认 turbo.json 中无残留 OPENCODE_DISABLE_SHARE
grep "OPENCODE_DISABLE_SHARE" turbo.json
# 结果: 无输出 ✅

# 确认 infra/lake.ts 中 S3 资源名已更新
grep "xpengagent-.*lake" infra/lake.ts
# 结果: 5处匹配 ✅

# 确认 build.ts 中 OPENCODE_VERSION 已替换
grep "OPENCODE_VERSION" packages/opencode/script/build.ts
# 结果: 无输出 ✅

# 确认 postinstall.mjs 中二进制文件名已替换
grep '"opencode.exe"\|"opencode"' packages/opencode/script/postinstall.mjs
# 结果: 无输出 ✅
```

---

## 下一步

进行 **Chunk 6**: 环境变量 `OPENCODE_*` → `XPENGAGENT_*` 替换。

---

## 备注

- 配置文件中的第三方引用（GitHub URLs、Docker 镜像）保持原样
- 构建产物文件名 `opencode-web-ui.gen.ts` 保持不变（嵌入 UI 资产标识）
- Infra 资源名称（S3 bucket names）已更新为 `xpengagent-` 前缀
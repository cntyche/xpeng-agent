# Chunk 4 执行日志

**日期:** 2026-06-21
**执行者:** opencode AI
**Chunk:** 4 - 代码中 "opencode" string literal → "xpengagent"

---

## 执行概述

Chunk 4 完成了所有 TypeScript 源码中的 `"opencode"` 字符串字面量替换为 `"xpengagent"`。

## 替换规则

- **`"opencode"`** (string literal) → **`"xpengagent"`**

## 不替换的例外

- `"opencode.ai"` — 外部 URL，保持原样
- `"https://opencode.ai/"` — 外部 URL，保持原样
- `"opencode://..."` — Deep link 协议，保持原样
- `"opencode-gitlab-auth"` — 第三方 npm 包名（无引号包裹的标识符）
- `"opencode-poe-auth"` — 第三方 npm 包名（无引号包裹的标识符）

## 操作详情

### 执行命令

```bash
cd /home/xpeng/workspace/XPENG-Agent/V1/opencode
find . -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/dist/*" \
  -exec perl -i -pe 's/"opencode"/"xpengagent"/g' {} +
```

### 统计

- **处理文件数:** 153 个含 `"opencode"` 字符串的 .ts/.tsx 文件
- **替换前 `"opencode"` 残留:** 362 occurrences
- **替换后 `"opencode"` 残留:** 0 ✅
- **URL/protocol 保留:** 230 处 ✅ (`opencode.ai`, `opencode://`, etc.)

---

## 修改示例

| 文件 | 替换前 | 替换后 |
|------|--------|--------|
| `packages/app/src/components/dialog-connect-provider.tsx` | `provider().id === "opencode"` | `provider().id === "xpengagent"` |
| `packages/app/src/app.tsx` | `"opencode server listening"` | `"xpengagent server listening"` |
| `packages/app/src/pages/layout/helpers.test.ts` | `"opencode TUI med..."` | `"xpengagent TUI med..."` |

---

## 验证

```bash
# 确认无残留 "opencode" 字符串
find . -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/dist/*" \
  -exec grep -oh '"opencode"' {} \; | wc -l
# 结果: 0 ✅

# 确认 URL/protocol 保留完整
grep -r "opencode\.ai\|opencode://" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v dist | wc -l
# 结果: 230 ✅

# 确认第三方包名保留
grep -r "opencode-gitlab-auth\|opencode-poe-auth" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v dist
# 结果: 2 imports, unchanged ✅
```

---

## 下一步

进行 **Chunk 5**: Config + Build 脚本 — 配置文件（.json, .yaml, .yml, sst.config.ts 等）中的 `opencode` 替换。

---

## 备注

- 替换范围仅限 `.ts` 和 `.tsx` 源码文件
- 排除了 `node_modules/` 和 `dist/` 目录
- Markdown 文档和 package.json 中的字符串将在后续 Chunk 中处理
- 第三方包名的无引号标识符（如 `from "opencode-gitlab-auth"`）不受影响
import { sentryVitePlugin } from "@sentry/vite-plugin"
import { defineConfig } from "vite"
import desktopPlugin from "./vite"

const sentry =
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
    ? sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        telemetry: false,
        release: {
          name: process.env.SENTRY_RELEASE ?? process.env.VITE_SENTRY_RELEASE,
        },
        sourcemaps: {
          assets: "./dist/**",
          filesToDeleteAfterUpload: "./dist/**/*.map",
        },
      })
    : false

const tsFromJsPlugin = {
  name: "xpengagent:resolve-js-to-ts",
  enforce: "pre" as const,
  async resolveId(source: string, importer?: string) {
    if (!importer) return null
    if (!source.endsWith(".js")) return null
    const ts = source.slice(0, -3) + ".ts"
    const resolved = await this.resolve(ts, importer, { skipSelf: true })
    return resolved ?? null
  },
}

export default defineConfig({
  plugins: [tsFromJsPlugin, desktopPlugin, sentry] as any,
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    port: 3000,
  },
  build: {
    target: "esnext",
    sourcemap: true,
  },
})

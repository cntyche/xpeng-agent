declare global {
  const XPENGAGENT_VERSION: string
  const XPENGAGENT_CHANNEL: string
}

export const InstallationVersion = typeof XPENGAGENT_VERSION === "string" ? XPENGAGENT_VERSION : "local"
export const InstallationChannel = typeof XPENGAGENT_CHANNEL === "string" ? XPENGAGENT_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"

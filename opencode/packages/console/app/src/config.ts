/**
 * Application-wide constants and configuration
 */
export const config = {
  // Base URL
  baseUrl: "https://xpengagent.cc.cd",

  // GitHub
  github: {
    repoUrl: "https://github.com/cntyche/xpeng-agent",
    starsFormatted: {
      compact: "160K",
      full: "160,000",
    },
  },

  // Social links
  social: {
    twitter: "https://x.com/xpengagent",
    discord: "https://discord.gg/xpengagent",
  },

  // Static stats (used on landing page)
  stats: {
    contributors: "900",
    commits: "13,000",
    monthlyUsers: "7.5M",
  },
} as const

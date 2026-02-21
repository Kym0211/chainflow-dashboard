// Chainflow validator identity pubkey
// Trillium API keys data by identity pubkey, not vote account
// Vote account: CAf8jfgqhia5VNrEF4A7Y9VLD3numMq9DVSceq7cPhNY
export const CHAINFLOW_PUBKEY =
  process.env.CHAINFLOW_PUBKEY || "2mMGsb5uy1Q4Dvezr8HK2E8SJoChcb2X7b61tJPaVHHd";

// Benchmark IDs used in the benchmark_epochs table
export const BENCHMARKS = {
  SHINOBI_TOP: "shinobi_top",
  NETWORK_AVG: "network_avg",
  NETWORK_MEDIAN: "network_median",
} as const;

// Approximate epochs per year (for annualization calculations)
export const EPOCHS_PER_YEAR = 146;

// Approximate epoch duration in days
export const EPOCH_DURATION_DAYS = 2.5;

// CSV column mappings for different sources
export const CSV_COLUMN_MAPS = {
  jpool: {
    epoch: ["epoch", "Epoch"],
    inflationRewards: ["inflation_rewards", "Inflation Rewards", "inflation_reward"],
    commissionEarned: ["commission_earned", "Commission Earned", "commission"],
    mevCommission: ["mev_commission", "MEV Commission", "mev_commission_earned"],
    blockRewards: ["block_rewards", "Block Rewards"],
    totalIncome: ["total_income", "Total Income", "total"],
    voteCost: ["vote_cost", "Vote Cost", "voting_cost"],
  },
  staking_kiwi: {
    epoch: ["epoch", "Epoch"],
    inflationRewards: ["inflation_rewards", "Inflation Rewards"],
    commissionEarned: ["commission_earned", "Commission Earned"],
    mevCommission: ["mev_commission", "MEV Commission"],
    blockRewards: ["block_rewards", "Block Rewards"],
    totalIncome: ["total_income", "Total Income"],
    voteCost: ["vote_cost", "Vote Cost"],
  },
} as const;

// Chart colors
export const COLORS = {
  primary: "#8b5cf6",
  secondary: "#3b82f6",
  success: "#34d399",
  warning: "#f59e0b",
  danger: "#f87171",
  info: "#06b6d4",
  muted: "#52525b",
  shinobiTop: "#34d399",
  networkAvg: "#71717a",
  inflation: "#f472b6",
} as const;

// Chart axis/grid styling
export const CHART_AXIS = {
  stroke: "hsl(240 5% 40%)",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
} as const;

export const CHART_GRID = {
  strokeDasharray: "3 3",
  stroke: "hsl(240 4% 20%)",
} as const;

export const CHART_TOOLTIP = {
  contentStyle: {
    background: "hsl(240 10% 6% / 0.95)",
    border: "1px solid hsl(263 70% 50% / 0.3)",
    borderRadius: "8px",
    fontSize: "12px",
  },
} as const;
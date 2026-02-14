// Chainflow validator identity pubkey
export const CHAINFLOW_PUBKEY =
  process.env.CHAINFLOW_PUBKEY || "CAf8jfgqhia5VNrEF4A7Y9VLD3numMq9DVSceq7cPhNY";

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
} as const;

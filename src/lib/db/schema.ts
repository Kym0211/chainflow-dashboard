import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  boolean,
} from "drizzle-orm/pg-core";

// Using unconstrained numeric() for all decimal fields to avoid overflow
// from varying Trillium API value sizes (lamports vs SOL, etc.)

// ─── Epoch-level validator data from Trillium API ───────────────────────────
export const validatorEpochs = pgTable(
  "validator_epochs",
  {
    id: serial("id").primaryKey(),
    pubkey: text("pubkey").notNull(),
    epoch: integer("epoch").notNull(),

    // Performance - TVC & Voting
    epochCredits: numeric("epoch_credits"),
    votesCast: integer("votes_cast"),
    skipRate: numeric("skip_rate"),
    leaderSlots: integer("leader_slots"),
    signatures: integer("signatures"),

    // JIP-25 / Rankings
    jip25Rank: integer("jip25_rank"),
    jitoOverallRank: integer("jito_overall_rank"),

    // APY Breakdown
    compoundOverallApy: numeric("compound_overall_apy"),
    totalInflationApy: numeric("total_inflation_apy"),
    totalMevApy: numeric("total_mev_apy"),
    delegatorBlockRewardsApy: numeric("delegator_block_rewards_apy"),
    delegatorCompoundBlockRewardsApy: numeric("delegator_compound_block_rewards_apy"),
    totalCompoundInflationApy: numeric("total_compound_inflation_apy"),
    totalCompoundMevApy: numeric("total_compound_mev_apy"),

    // Rewards & Income (SOL)
    rewards: numeric("rewards"),
    mevEarned: numeric("mev_earned"),
    mevToValidator: numeric("mev_to_validator"),
    mevToStakers: numeric("mev_to_stakers"),
    voteCost: numeric("vote_cost"),

    // Block Rewards Detail
    totalBlockRewardsBeforeBurn: numeric("total_block_rewards_before_burn"),
    totalBlockRewardsAfterBurn: numeric("total_block_rewards_after_burn"),
    validatorSignatureFees: numeric("validator_signature_fees"),
    validatorPriorityFees: numeric("validator_priority_fees"),

    // Priority Fees
    priorityFeeCommission: numeric("priority_fee_commission"),
    priorityFeeTips: numeric("priority_fee_tips"),
    totalPriorityFees: numeric("total_priority_fees"),
    delegatorPriorityFees: numeric("delegator_priority_fees"),

    // Stake
    activeStake: numeric("active_stake"),
    stakePercentage: numeric("stake_percentage"),

    // Slot Duration
    avgSlotDurationMs: numeric("avg_slot_duration_ms"),
    medianSlotDurationMs: numeric("median_slot_duration_ms"),

    // Meta
    commission: integer("commission"),
    mevCommission: integer("mev_commission"),
    clientType: text("client_type"),
    version: text("version"),
    fdSchedulerMode: text("fd_scheduler_mode"),

    // Stake Pools
    totalFromStakePools: numeric("total_from_stake_pools"),
    totalNotFromStakePools: numeric("total_not_from_stake_pools"),

    // Flags
    isDz: boolean("is_dz"),
    isSfdp: boolean("is_sfdp"),

    // IBRL / BAM
    ibrlScore: numeric("ibrl_score"),

    // Raw JSON for any fields we haven't explicitly modeled
    rawData: jsonb("raw_data"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("validator_epochs_pubkey_epoch_idx").on(table.pubkey, table.epoch),
    index("validator_epochs_epoch_idx").on(table.epoch),
  ]
);

// ─── Income data from CSV uploads (JPool / Staking.kiwi) ───────────────────
export const incomeReports = pgTable(
  "income_reports",
  {
    id: serial("id").primaryKey(),
    pubkey: text("pubkey").notNull(),
    epoch: integer("epoch").notNull(),
    source: text("source").notNull(),

    inflationRewards: numeric("inflation_rewards"),
    commissionEarned: numeric("commission_earned"),
    mevCommission: numeric("mev_commission"),
    blockRewards: numeric("block_rewards"),
    priorityFeeIncome: numeric("priority_fee_income"),
    totalIncome: numeric("total_income"),

    voteCost: numeric("vote_cost"),
    serverCost: numeric("server_cost"),

    netIncome: numeric("net_income"),

    rawData: jsonb("raw_data"),
    uploadedAt: timestamp("uploaded_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("income_reports_pubkey_epoch_source_idx").on(
      table.pubkey,
      table.epoch,
      table.source
    ),
    index("income_reports_pubkey_epoch_idx").on(table.pubkey, table.epoch),
  ]
);

// ─── Benchmark data for comparison validators ───────────────────────────────
export const benchmarkEpochs = pgTable(
  "benchmark_epochs",
  {
    id: serial("id").primaryKey(),
    benchmarkId: text("benchmark_id").notNull(),
    benchmarkLabel: text("benchmark_label"),
    pubkey: text("pubkey"),
    epoch: integer("epoch").notNull(),

    epochCredits: numeric("epoch_credits"),
    votesCast: integer("votes_cast"),
    skipRate: numeric("skip_rate"),
    leaderSlots: integer("leader_slots"),

    compoundOverallApy: numeric("compound_overall_apy"),
    totalInflationApy: numeric("total_inflation_apy"),
    totalMevApy: numeric("total_mev_apy"),

    rewards: numeric("rewards"),
    mevEarned: numeric("mev_earned"),

    avgSlotDurationMs: numeric("avg_slot_duration_ms"),

    activeStake: numeric("active_stake"),

    jip25Rank: integer("jip25_rank"),

    rawData: jsonb("raw_data"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("benchmark_epochs_id_epoch_idx").on(table.benchmarkId, table.epoch),
    index("benchmark_epochs_epoch_idx").on(table.epoch),
  ]
);

// ─── SOL price history for USD conversion ───────────────────────────────────
export const solPrices = pgTable(
  "sol_prices",
  {
    id: serial("id").primaryKey(),
    epoch: integer("epoch").notNull(),
    priceUsd: numeric("price_usd"),
    fetchedAt: timestamp("fetched_at").defaultNow(),
  },
  (table) => [uniqueIndex("sol_prices_epoch_idx").on(table.epoch)]
);

// ─── Settings / Config ──────────────────────────────────────────────────────
export const dashboardSettings = pgTable("dashboard_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Type exports ───────────────────────────────────────────────────────────
export type ValidatorEpoch = typeof validatorEpochs.$inferSelect;
export type NewValidatorEpoch = typeof validatorEpochs.$inferInsert;
export type IncomeReport = typeof incomeReports.$inferSelect;
export type NewIncomeReport = typeof incomeReports.$inferInsert;
export type BenchmarkEpoch = typeof benchmarkEpochs.$inferSelect;
export type NewBenchmarkEpoch = typeof benchmarkEpochs.$inferInsert;
export type SolPrice = typeof solPrices.$inferSelect;
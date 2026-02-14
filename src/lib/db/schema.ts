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

// ─── Epoch-level validator data from Trillium API ───────────────────────────
export const validatorEpochs = pgTable(
  "validator_epochs",
  {
    id: serial("id").primaryKey(),
    pubkey: text("pubkey").notNull(),
    epoch: integer("epoch").notNull(),

    // Performance - TVC & Voting
    epochCredits: numeric("epoch_credits", { precision: 12, scale: 0 }),
    votesCast: integer("votes_cast"),
    skipRate: numeric("skip_rate", { precision: 8, scale: 5 }),
    leaderSlots: integer("leader_slots"),
    signatures: integer("signatures"),

    // JIP-25 / Rankings
    jip25Rank: integer("jip25_rank"),
    jitoOverallRank: integer("jito_overall_rank"),

    // APY Breakdown
    compoundOverallApy: numeric("compound_overall_apy", { precision: 10, scale: 6 }),
    totalInflationApy: numeric("total_inflation_apy", { precision: 10, scale: 6 }),
    totalMevApy: numeric("total_mev_apy", { precision: 10, scale: 6 }),
    delegatorBlockRewardsApy: numeric("delegator_block_rewards_apy", { precision: 10, scale: 6 }),
    delegatorCompoundBlockRewardsApy: numeric("delegator_compound_block_rewards_apy", { precision: 10, scale: 6 }),
    totalCompoundInflationApy: numeric("total_compound_inflation_apy", { precision: 10, scale: 6 }),
    totalCompoundMevApy: numeric("total_compound_mev_apy", { precision: 10, scale: 6 }),

    // Rewards & Income (SOL)
    rewards: numeric("rewards", { precision: 20, scale: 9 }),
    mevEarned: numeric("mev_earned", { precision: 20, scale: 9 }),
    mevToValidator: numeric("mev_to_validator", { precision: 20, scale: 9 }),
    mevToStakers: numeric("mev_to_stakers", { precision: 20, scale: 9 }),
    voteCost: numeric("vote_cost", { precision: 20, scale: 9 }),

    // Block Rewards Detail
    totalBlockRewardsBeforeBurn: numeric("total_block_rewards_before_burn", { precision: 20, scale: 9 }),
    totalBlockRewardsAfterBurn: numeric("total_block_rewards_after_burn", { precision: 20, scale: 9 }),
    validatorSignatureFees: numeric("validator_signature_fees", { precision: 20, scale: 9 }),
    validatorPriorityFees: numeric("validator_priority_fees", { precision: 20, scale: 9 }),

    // Priority Fees
    priorityFeeCommission: numeric("priority_fee_commission", { precision: 8, scale: 5 }),
    priorityFeeTips: numeric("priority_fee_tips", { precision: 20, scale: 9 }),
    totalPriorityFees: numeric("total_priority_fees", { precision: 20, scale: 9 }),
    delegatorPriorityFees: numeric("delegator_priority_fees", { precision: 20, scale: 9 }),

    // Stake
    activeStake: numeric("active_stake", { precision: 20, scale: 5 }),
    stakePercentage: numeric("stake_percentage", { precision: 10, scale: 8 }),

    // Slot Duration
    avgSlotDurationMs: numeric("avg_slot_duration_ms", { precision: 10, scale: 3 }),
    medianSlotDurationMs: numeric("median_slot_duration_ms", { precision: 10, scale: 3 }),

    // Meta
    commission: integer("commission"),
    mevCommission: integer("mev_commission"),
    clientType: text("client_type"),
    version: text("version"),
    fdSchedulerMode: text("fd_scheduler_mode"),

    // Stake Pools
    totalFromStakePools: numeric("total_from_stake_pools", { precision: 20, scale: 5 }),
    totalNotFromStakePools: numeric("total_not_from_stake_pools", { precision: 20, scale: 5 }),

    // Flags
    isDz: boolean("is_dz"),
    isSfdp: boolean("is_sfdp"),

    // IBRL / BAM
    ibrlScore: numeric("ibrl_score", { precision: 10, scale: 4 }),

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
    source: text("source").notNull(), // 'jpool' | 'staking_kiwi' | 'manual'

    // Income breakdown (SOL)
    inflationRewards: numeric("inflation_rewards", { precision: 20, scale: 9 }),
    commissionEarned: numeric("commission_earned", { precision: 20, scale: 9 }),
    mevCommission: numeric("mev_commission", { precision: 20, scale: 9 }),
    blockRewards: numeric("block_rewards", { precision: 20, scale: 9 }),
    priorityFeeIncome: numeric("priority_fee_income", { precision: 20, scale: 9 }),
    totalIncome: numeric("total_income", { precision: 20, scale: 9 }),

    // Costs
    voteCost: numeric("vote_cost", { precision: 20, scale: 9 }),
    serverCost: numeric("server_cost", { precision: 20, scale: 9 }), // manual input

    // Net
    netIncome: numeric("net_income", { precision: 20, scale: 9 }),

    // Raw data from CSV
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
    benchmarkId: text("benchmark_id").notNull(), // 'shinobi_top' | 'network_avg' | 'network_median' | specific pubkey
    benchmarkLabel: text("benchmark_label"), // Human readable: "Top Shinobi Performer", "Network Average"
    pubkey: text("pubkey"), // Actual pubkey if tracking a specific validator
    epoch: integer("epoch").notNull(),

    // Performance
    epochCredits: numeric("epoch_credits", { precision: 12, scale: 0 }),
    votesCast: integer("votes_cast"),
    skipRate: numeric("skip_rate", { precision: 8, scale: 5 }),
    leaderSlots: integer("leader_slots"),

    // APY
    compoundOverallApy: numeric("compound_overall_apy", { precision: 10, scale: 6 }),
    totalInflationApy: numeric("total_inflation_apy", { precision: 10, scale: 6 }),
    totalMevApy: numeric("total_mev_apy", { precision: 10, scale: 6 }),

    // Rewards
    rewards: numeric("rewards", { precision: 20, scale: 9 }),
    mevEarned: numeric("mev_earned", { precision: 20, scale: 9 }),

    // Slot Duration
    avgSlotDurationMs: numeric("avg_slot_duration_ms", { precision: 10, scale: 3 }),

    // Stake
    activeStake: numeric("active_stake", { precision: 20, scale: 5 }),

    // JIP-25
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
    priceUsd: numeric("price_usd", { precision: 12, scale: 4 }),
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

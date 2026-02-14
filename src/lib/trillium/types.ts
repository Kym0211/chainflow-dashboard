// Types for the Trillium API response data
// Docs: https://trillium.so/pages/trillium-api-documentation.html

export interface TrilliumValidatorReward {
  identity_pubkey: string;
  vote_account_pubkey: string;
  epoch: number;
  name?: string;

  // Performance
  epoch_credits: number;
  votes_cast: number;
  skip_rate: number;
  leader_slots: number;
  signatures: number;

  // APY
  compound_overall_apy: number;
  total_inflation_apy: number;
  total_compound_inflation_apy: number;
  total_mev_apy: number;
  total_compound_mev_apy: number;
  delegator_block_rewards_apy: number;
  delegator_compound_block_rewards_apy: number;
  total_block_rewards_apy: number;
  total_compound_block_rewards_apy: number;
  total_overall_apy: number;

  // Rewards (SOL)
  rewards: number;
  total_block_rewards_before_burn: number;
  total_block_rewards_after_burn: number;
  validator_signature_fees: number;
  validator_priority_fees: number;

  // MEV
  mev_earned: number;
  mev_to_validator: number;
  mev_to_stakers: number;
  mev_to_jito_block_engine: number;
  mev_to_jito_tip_router: number;
  mev_commission: number;

  // Priority Fees
  priority_fee_commission?: number;
  priority_fee_tips?: number;
  total_priority_fees?: number;
  delegator_priority_fees?: number;
  total_block_reward_priority_fees?: number;

  // Vote Cost
  vote_cost: number;

  // Stake
  active_stake: number;
  stake_percentage: number;
  total_from_stake_pools?: number;
  total_not_from_stake_pools?: number;
  stake_pools?: Record<string, number>;

  // Slot Duration
  avg_slot_duration_ms?: number;
  median_slot_duration_ms?: number;
  slot_duration_is_lagging?: boolean;

  // Meta
  commission: number;
  client_type: string;
  version: string;
  fd_scheduler_mode?: string;

  // Rankings
  jip25_rank?: number;
  ineligible_reason?: string;
  jito_overall_rank?: number;
  jito_passing_eligibility_criteria?: boolean;

  // Flags
  is_dz?: boolean;
  is_sfdp?: boolean;
  sfdp_state?: string;

  // IBRL / BAM
  ibrl_score?: number;
  build_time_score?: number;
  vote_packing_score?: number;
  non_vote_packing_score?: number;

  // Auth keys
  authorized_voter?: string;
  authorized_withdrawer?: string;
  node_pubkey?: string;
}

export interface TrilliumEpochData {
  epoch: number;
  epoch_start_time?: string;
  epoch_end_time?: string;
  total_stake?: number;
  total_validators?: number;
  avg_skip_rate?: number;
  avg_epoch_credits?: number;
  avg_apy?: number;
  [key: string]: unknown;
}

export interface TrilliumSkipAnalysis {
  identity_pubkey: string;
  epoch: number;
  leader_slots: number;
  blocks_produced: number;
  skipped_slots: number;
  skip_rate: number;
  skipped_slot_details?: unknown[];
}

// Parsed & normalized version for our DB
export interface NormalizedValidatorData {
  pubkey: string;
  epoch: number;
  epochCredits: string;
  votesCast: number;
  skipRate: string;
  leaderSlots: number;
  signatures: number;
  jip25Rank: number | null;
  jitoOverallRank: number | null;
  compoundOverallApy: string;
  totalInflationApy: string;
  totalMevApy: string;
  delegatorBlockRewardsApy: string;
  delegatorCompoundBlockRewardsApy: string;
  totalCompoundInflationApy: string;
  totalCompoundMevApy: string;
  rewards: string;
  mevEarned: string;
  mevToValidator: string;
  mevToStakers: string;
  voteCost: string;
  totalBlockRewardsBeforeBurn: string;
  totalBlockRewardsAfterBurn: string;
  validatorSignatureFees: string;
  validatorPriorityFees: string;
  priorityFeeCommission: string | null;
  priorityFeeTips: string | null;
  totalPriorityFees: string | null;
  delegatorPriorityFees: string | null;
  activeStake: string;
  stakePercentage: string;
  avgSlotDurationMs: string | null;
  medianSlotDurationMs: string | null;
  commission: number;
  mevCommission: number;
  clientType: string;
  version: string;
  fdSchedulerMode: string | null;
  totalFromStakePools: string | null;
  totalNotFromStakePools: string | null;
  isDz: boolean;
  isSfdp: boolean;
  ibrlScore: string | null;
  rawData: TrilliumValidatorReward;
}

import type {
  TrilliumValidatorReward,
  TrilliumEpochData,
  TrilliumSkipAnalysis,
  NormalizedValidatorData,
} from "./types";

const BASE_URL = process.env.TRILLIUM_API_BASE || "https://api.trillium.so";

class TrilliumClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // ─── Core Fetch ──────────────────────────────────────────────────────
  private async fetch<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    console.log(`[Trillium] Fetching: ${url}`);

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 }, // Cache for 1 hour in Next.js
    });

    if (!res.ok) {
      throw new Error(`Trillium API error: ${res.status} ${res.statusText} for ${url}`);
    }

    return res.json();
  }

  // ─── Validator Rewards ───────────────────────────────────────────────

  /**
   * Get last 10 epochs of data for a specific validator
   */
  async getValidatorRewards(pubkey: string): Promise<TrilliumValidatorReward[]> {
    return this.fetch<TrilliumValidatorReward[]>(`/validator_rewards/${pubkey}`);
  }

  /**
   * Get all validators for a specific epoch
   */
  async getEpochValidators(epoch: number): Promise<TrilliumValidatorReward[]> {
    return this.fetch<TrilliumValidatorReward[]>(`/validator_rewards/${epoch}`);
  }

  /**
   * Get latest epoch data for all validators
   */
  async getLatestValidatorRewards(): Promise<TrilliumValidatorReward[]> {
    return this.fetch<TrilliumValidatorReward[]>(`/validator_rewards/`);
  }

  /**
   * Get 10-epoch simple average for all validators (or specific one)
   */
  async getTenEpochAverages(pubkey?: string): Promise<TrilliumValidatorReward[]> {
    const path = pubkey
      ? `/ten_epoch_validator_rewards/${pubkey}`
      : `/ten_epoch_validator_rewards`;
    return this.fetch<TrilliumValidatorReward[]>(path);
  }

  /**
   * Get recency-weighted average for all validators (or specific one)
   * Uses Shinobi weighting methodology
   */
  async getWeightedAverages(pubkey?: string): Promise<TrilliumValidatorReward[]> {
    const path = pubkey
      ? `/recency_weighted_average_validator_rewards/${pubkey}`
      : `/recency_weighted_average_validator_rewards`;
    return this.fetch<TrilliumValidatorReward[]>(path);
  }

  // ─── Epoch Data ──────────────────────────────────────────────────────

  /**
   * Get aggregate epoch data for the last 10 epochs
   */
  async getEpochData(): Promise<TrilliumEpochData[]> {
    return this.fetch<TrilliumEpochData[]>(`/epoch_data/`);
  }

  /**
   * Get aggregate epoch data for a specific epoch
   */
  async getEpochDataByNumber(epoch: number): Promise<TrilliumEpochData> {
    return this.fetch<TrilliumEpochData>(`/epoch_data/${epoch}`);
  }

  /**
   * Get recency-weighted epoch averages
   */
  async getTenEpochAggregateData(): Promise<TrilliumEpochData> {
    return this.fetch<TrilliumEpochData>(`/ten_epoch_aggregate_data`);
  }

  // ─── Skip Analysis ──────────────────────────────────────────────────

  /**
   * Get skip analysis for a specific validator (last 10 epochs)
   */
  async getSkipAnalysis(pubkey: string): Promise<TrilliumSkipAnalysis[]> {
    return this.fetch<TrilliumSkipAnalysis[]>(`/skip_analysis/${pubkey}`);
  }

  /**
   * Get skip analysis for all validators in a specific epoch
   */
  async getSkipAnalysisByEpoch(epoch: number): Promise<TrilliumSkipAnalysis[]> {
    return this.fetch<TrilliumSkipAnalysis[]>(`/skip_analysis/${epoch}`);
  }

  // ─── Data Normalization ──────────────────────────────────────────────

  /**
   * Normalize raw Trillium API data into our DB-friendly format
   */
  normalizeValidatorData(raw: TrilliumValidatorReward): NormalizedValidatorData {
    return {
      pubkey: raw.identity_pubkey,
      epoch: raw.epoch,
      epochCredits: String(raw.epoch_credits ?? 0),
      votesCast: raw.votes_cast ?? 0,
      skipRate: String(raw.skip_rate ?? 0),
      leaderSlots: raw.leader_slots ?? 0,
      signatures: raw.signatures ?? 0,
      jip25Rank: raw.jip25_rank ?? null,
      jitoOverallRank: raw.jito_overall_rank ?? null,
      compoundOverallApy: String(raw.compound_overall_apy ?? 0),
      totalInflationApy: String(raw.total_inflation_apy ?? 0),
      totalMevApy: String(raw.total_mev_apy ?? 0),
      delegatorBlockRewardsApy: String(raw.delegator_block_rewards_apy ?? 0),
      delegatorCompoundBlockRewardsApy: String(raw.delegator_compound_block_rewards_apy ?? 0),
      totalCompoundInflationApy: String(raw.total_compound_inflation_apy ?? 0),
      totalCompoundMevApy: String(raw.total_compound_mev_apy ?? 0),
      rewards: String(raw.rewards ?? 0),
      mevEarned: String(raw.mev_earned ?? 0),
      mevToValidator: String(raw.mev_to_validator ?? 0),
      mevToStakers: String(raw.mev_to_stakers ?? 0),
      voteCost: String(raw.vote_cost ?? 0),
      totalBlockRewardsBeforeBurn: String(raw.total_block_rewards_before_burn ?? 0),
      totalBlockRewardsAfterBurn: String(raw.total_block_rewards_after_burn ?? 0),
      validatorSignatureFees: String(raw.validator_signature_fees ?? 0),
      validatorPriorityFees: String(raw.validator_priority_fees ?? 0),
      priorityFeeCommission: raw.priority_fee_commission != null ? String(raw.priority_fee_commission) : null,
      priorityFeeTips: raw.priority_fee_tips != null ? String(raw.priority_fee_tips) : null,
      totalPriorityFees: raw.total_priority_fees != null ? String(raw.total_priority_fees) : null,
      delegatorPriorityFees: raw.delegator_priority_fees != null ? String(raw.delegator_priority_fees) : null,
      activeStake: String(raw.active_stake ?? 0),
      stakePercentage: String(raw.stake_percentage ?? 0),
      avgSlotDurationMs: raw.avg_slot_duration_ms != null ? String(raw.avg_slot_duration_ms) : null,
      medianSlotDurationMs: raw.median_slot_duration_ms != null ? String(raw.median_slot_duration_ms) : null,
      commission: raw.commission ?? 0,
      mevCommission: raw.mev_commission ?? 0,
      clientType: raw.client_type ?? "Unknown",
      version: raw.version ?? "",
      fdSchedulerMode: raw.fd_scheduler_mode ?? null,
      totalFromStakePools: raw.total_from_stake_pools != null ? String(raw.total_from_stake_pools) : null,
      totalNotFromStakePools: raw.total_not_from_stake_pools != null ? String(raw.total_not_from_stake_pools) : null,
      isDz: raw.is_dz ?? false,
      isSfdp: raw.is_sfdp ?? false,
      ibrlScore: raw.ibrl_score != null ? String(raw.ibrl_score) : null,
      rawData: raw,
    };
  }

  // ─── Comparison Helpers ──────────────────────────────────────────────

  /**
   * Find the top performing validator from a list (by compound APY)
   */
  findTopPerformer(
    validators: TrilliumValidatorReward[],
    metric: "compound_overall_apy" | "epoch_credits" = "compound_overall_apy"
  ): TrilliumValidatorReward | null {
    if (!validators.length) return null;

    // Filter out validators with very low stake (likely inactive)
    const active = validators.filter(
      (v) => v.active_stake > 1000 && v.skip_rate < 20 && v.commission <= 10
    );

    if (!active.length) return null;

    return active.reduce((best, v) =>
      (v[metric] ?? 0) > (best[metric] ?? 0) ? v : best
    );
  }

  /**
   * Calculate network averages from a list of validators
   */
  calculateNetworkAverages(
    validators: TrilliumValidatorReward[]
  ): Partial<TrilliumValidatorReward> {
    const active = validators.filter((v) => v.active_stake > 1000);
    const n = active.length || 1;

    return {
      epoch_credits: Math.round(active.reduce((s, v) => s + (v.epoch_credits ?? 0), 0) / n),
      skip_rate: parseFloat((active.reduce((s, v) => s + (v.skip_rate ?? 0), 0) / n).toFixed(4)),
      compound_overall_apy: parseFloat(
        (active.reduce((s, v) => s + (v.compound_overall_apy ?? 0), 0) / n).toFixed(4)
      ),
      total_inflation_apy: parseFloat(
        (active.reduce((s, v) => s + (v.total_inflation_apy ?? 0), 0) / n).toFixed(4)
      ),
      total_mev_apy: parseFloat(
        (active.reduce((s, v) => s + (v.total_mev_apy ?? 0), 0) / n).toFixed(4)
      ),
      rewards: parseFloat(
        (active.reduce((s, v) => s + (v.rewards ?? 0), 0) / n).toFixed(6)
      ),
      mev_earned: parseFloat(
        (active.reduce((s, v) => s + (v.mev_earned ?? 0), 0) / n).toFixed(6)
      ),
      votes_cast: Math.round(active.reduce((s, v) => s + (v.votes_cast ?? 0), 0) / n),
      leader_slots: Math.round(active.reduce((s, v) => s + (v.leader_slots ?? 0), 0) / n),
    };
  }
}

// Singleton
export const trillium = new TrilliumClient();

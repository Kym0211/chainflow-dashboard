"use client";

import { useQuery } from "@tanstack/react-query";
import type { ValidatorEpoch, BenchmarkEpoch, SolPrice } from "@/lib/db/schema";

interface ValidatorDataResponse {
  pubkey: string;
  data: ValidatorEpoch[];
  benchmarks: Record<string, BenchmarkEpoch[]>;
  prices: SolPrice[];
  count: number;
}

export function useValidatorData(
  pubkey: string = "chainflow",
  options?: {
    limit?: number;
    fromEpoch?: number;
    toEpoch?: number;
    benchmarks?: boolean;
  }
) {
  const { limit, fromEpoch, toEpoch, benchmarks = true } = options ?? {};

  return useQuery<ValidatorDataResponse>({
    queryKey: ["validator", pubkey, limit, fromEpoch, toEpoch, benchmarks],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (limit) params.set("limit", String(limit));
      if (fromEpoch) params.set("from_epoch", String(fromEpoch));
      if (toEpoch) params.set("to_epoch", String(toEpoch));
      if (!benchmarks) params.set("benchmarks", "false");

      const res = await fetch(`/api/validators/${pubkey}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch validator data");
      return res.json();
    },
  });
}
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IncomeReport } from "@/lib/db/schema";

interface IncomeDataResponse {
  data: IncomeReport[];
  count: number;
}

export function useIncomeData(options?: { source?: string; limit?: number }) {
  const { source, limit = 50 } = options ?? {};

  return useQuery<IncomeDataResponse>({
    queryKey: ["income", source, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (source) params.set("source", source);

      const res = await fetch(`/api/income?${params}`);
      if (!res.ok) throw new Error("Failed to fetch income data");
      return res.json();
    },
  });
}

interface UploadResult {
  success: boolean;
  source: string;
  inserted: number;
  updated: number;
  errors?: string[];
}

export function useUploadIncome() {
  const queryClient = useQueryClient();

  return useMutation<UploadResult, Error, { source: string; records: Record<string, unknown>[] }>({
    mutationFn: async ({ source, records }) => {
      const res = await fetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, records }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income"] });
    },
  });
}

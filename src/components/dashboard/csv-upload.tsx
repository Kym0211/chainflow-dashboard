"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react";
import { useUploadIncome } from "@/hooks/use-income-data";
import { parseNumeric } from "@/lib/utils";

type CsvSource = "jpool" | "staking_kiwi";

interface ParsedRecord {
  epoch: number;
  inflationRewards?: number;
  commissionEarned?: number;
  mevCommission?: number;
  blockRewards?: number;
  priorityFeeIncome?: number;
  totalIncome?: number;
  voteCost?: number;
  netIncome?: number;
  [key: string]: unknown;
}

export function CsvUpload() {
  const [source, setSource] = useState<CsvSource>("jpool");
  const [parsedData, setParsedData] = useState<ParsedRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadIncome();

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setParsedData(null);

      if (!file.name.match(/\.(csv|tsv|txt|xls|xlsx)$/i)) {
        setError("Please upload a CSV, TSV, or Excel file");
        return;
      }

      try {
        const text = await file.text();
        // Use PapaParse dynamically
        const Papa = (await import("papaparse")).default;

        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              setError(`Parse errors: ${results.errors.map((e) => e.message).join(", ")}`);
              return;
            }

            const records: ParsedRecord[] = [];

            for (const row of results.data as Record<string, unknown>[]) {
              // Try to find the epoch column
              const epoch =
                parseNumeric(row["epoch"]) ??
                parseNumeric(row["Epoch"]) ??
                parseNumeric(row["EPOCH"]);

              if (!epoch) continue;

              records.push({
                epoch,
                inflationRewards:
                  parseNumeric(row["inflation_rewards"]) ??
                  parseNumeric(row["Inflation Rewards"]) ??
                  parseNumeric(row["inflation_reward"]) ??
                  undefined,
                commissionEarned:
                  parseNumeric(row["commission_earned"]) ??
                  parseNumeric(row["Commission Earned"]) ??
                  parseNumeric(row["commission"]) ??
                  parseNumeric(row["Commission"]) ??
                  undefined,
                mevCommission:
                  parseNumeric(row["mev_commission"]) ??
                  parseNumeric(row["MEV Commission"]) ??
                  parseNumeric(row["mev_commission_earned"]) ??
                  undefined,
                blockRewards:
                  parseNumeric(row["block_rewards"]) ??
                  parseNumeric(row["Block Rewards"]) ??
                  undefined,
                priorityFeeIncome:
                  parseNumeric(row["priority_fee_income"]) ??
                  parseNumeric(row["Priority Fee Income"]) ??
                  parseNumeric(row["priority_fees"]) ??
                  undefined,
                totalIncome:
                  parseNumeric(row["total_income"]) ??
                  parseNumeric(row["Total Income"]) ??
                  parseNumeric(row["total"]) ??
                  parseNumeric(row["Total"]) ??
                  undefined,
                voteCost:
                  parseNumeric(row["vote_cost"]) ??
                  parseNumeric(row["Vote Cost"]) ??
                  parseNumeric(row["voting_cost"]) ??
                  undefined,
                ...row, // Keep raw data
              });
            }

            if (records.length === 0) {
              setError("No valid records found. Make sure your CSV has an 'epoch' column.");
              return;
            }

            setParsedData(records);
          },
        });
      } catch (err) {
        setError(`Error reading file: ${err}`);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleSubmit = async () => {
    if (!parsedData) return;
    uploadMutation.mutate({ source, records: parsedData });
  };

  return (
    <div className="glass-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Upload Income Data
        </h3>
        <button
          onClick={() => {
            setParsedData(null);
            setError(null);
          }}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {/* Source selector */}
      <div className="flex gap-2">
        {(["jpool", "staking_kiwi"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              source === s
                ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "jpool" ? "JPool" : "Staking.kiwi"}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      {!parsedData && (
        <div
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            isDragging
              ? "border-primary/50 bg-primary/5"
              : "border-white/10 hover:border-white/20"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <Upload size={28} className="mb-3 text-primary" />
          <p className="text-sm font-semibold text-foreground">
            Drop your {source === "jpool" ? "JPool" : "Staking.kiwi"} CSV here
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Or click to browse. Supports CSV, TSV, XLS, XLSX
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt,.xls,.xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Preview */}
      {parsedData && !uploadMutation.isSuccess && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <FileText size={16} className="text-primary" />
            <span className="font-semibold">{parsedData.length} records</span>
            <span className="text-muted-foreground">
              (Epochs {parsedData[0].epoch} — {parsedData[parsedData.length - 1].epoch})
            </span>
          </div>

          {/* Preview table */}
          <div className="max-h-48 overflow-auto rounded-lg border border-white/5">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-secondary/30">
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Epoch</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Commission</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">MEV</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {parsedData.slice(0, 5).map((r) => (
                  <tr key={r.epoch} className="border-b border-white/[0.02]">
                    <td className="px-3 py-1.5 text-muted-foreground">{r.epoch}</td>
                    <td className="px-3 py-1.5 text-right text-purple-400">
                      {r.commissionEarned?.toFixed(4) ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right text-blue-400">
                      {r.mevCommission?.toFixed(4) ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right text-emerald-400">
                      {r.totalIncome?.toFixed(4) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleSubmit}
            disabled={uploadMutation.isPending}
            className="w-full rounded-lg bg-primary/20 px-4 py-2.5 text-sm font-semibold text-primary ring-1 ring-primary/30 transition-all hover:bg-primary/30 disabled:opacity-50"
          >
            {uploadMutation.isPending
              ? "Uploading..."
              : `Upload ${parsedData.length} records to database`}
          </button>
        </div>
      )}

      {/* Success */}
      {uploadMutation.isSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
          <CheckCircle size={16} />
          Uploaded successfully! {uploadMutation.data.inserted} new,{" "}
          {uploadMutation.data.updated} updated.
        </div>
      )}
    </div>
  );
}

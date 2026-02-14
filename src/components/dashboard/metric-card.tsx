"use client";

import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  accent?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendUp,
  icon: Icon,
  accent = "hsl(var(--primary))",
  className,
}: MetricCardProps) {
  return (
    <div className={cn("glass-card relative overflow-hidden", className)}>
      {/* Glow */}
      <div
        className="absolute -top-5 -right-5 h-20 w-20 rounded-full opacity-15 blur-xl"
        style={{ background: accent }}
      />

      <div className="mb-3 flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `${accent}18` }}
        >
          <Icon size={15} style={{ color: accent }} />
        </div>
      </div>

      <div className="font-mono text-2xl font-extrabold tracking-tight text-foreground">
        {value}
      </div>

      <div className="mt-2 flex items-center justify-between">
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
        {trend && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-semibold",
              trendUp ? "text-emerald-400" : "text-red-400"
            )}
          >
            {trendUp ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

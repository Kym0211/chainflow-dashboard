"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  isBefore,
  isAfter,
  getDay,
  isSameMonth,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { epochToDate, dateToEpoch } from "@/lib/epoch-utils";

type SelectionMode = "preset" | "custom";

interface EpochRangePickerProps {
  /** Currently selected epoch limit (for presets) */
  epochLimit: number;
  /** Latest epoch in the dataset */
  latestEpoch: number | null;
  /** Called when a preset is selected */
  onPresetChange: (limit: number) => void;
  /** Called when a custom epoch range is selected */
  onRangeChange: (fromEpoch: number, toEpoch: number) => void;
}

const PRESETS = [
  { label: "5 Epochs", value: 5 },
  { label: "10 Epochs", value: 10 },
  { label: "20 Epochs", value: 20 },
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function MiniCalendar({
  month,
  rangeStart,
  rangeEnd,
  hoverDate,
  minDate,
  maxDate,
  onDateClick,
  onDateHover,
  onPrevMonth,
  onNextMonth,
  showPrev,
  showNext,
}: {
  month: Date;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  hoverDate: Date | null;
  minDate?: Date;
  maxDate?: Date;
  onDateClick: (d: Date) => void;
  onDateHover: (d: Date | null) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  showPrev?: boolean;
  showNext?: boolean;
}) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = getDay(monthStart); // 0 = Sunday

  // Determine visual range for highlighting
  const effectiveEnd = rangeEnd || hoverDate;

  function isInRange(day: Date) {
    if (!rangeStart || !effectiveEnd) return false;
    const [lo, hi] =
      isBefore(rangeStart, effectiveEnd)
        ? [rangeStart, effectiveEnd]
        : [effectiveEnd, rangeStart];
    return (isAfter(day, lo) || isSameDay(day, lo)) && (isBefore(day, hi) || isSameDay(day, hi));
  }

  function isDisabled(day: Date) {
    if (minDate && isBefore(day, minDate)) return true;
    if (maxDate && isAfter(day, maxDate)) return true;
    return false;
  }

  return (
    <div className="w-[260px]">
      {/* Month header */}
      <div className="mb-2 flex items-center justify-between px-1">
        {showPrev ? (
          <button
            onClick={onPrevMonth}
            className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
          >
            <ChevronLeft size={16} />
          </button>
        ) : (
          <div className="w-6" />
        )}
        <span className="text-sm font-semibold text-zinc-200">
          {format(month, "MMMM yyyy")}
        </span>
        {showNext ? (
          <button
            onClick={onNextMonth}
            className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
          >
            <ChevronRight size={16} />
          </button>
        ) : (
          <div className="w-6" />
        )}
      </div>

      {/* Day names */}
      <div className="mb-1 grid grid-cols-7 gap-0">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-medium uppercase text-zinc-500">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0">
        {/* Empty cells for offset */}
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}

        {days.map((day) => {
          const disabled = isDisabled(day);
          const isStart = rangeStart && isSameDay(day, rangeStart);
          const isEnd = (rangeEnd && isSameDay(day, rangeEnd)) || (!rangeEnd && hoverDate && isSameDay(day, hoverDate) && rangeStart);
          const inRange = isInRange(day);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              disabled={disabled}
              onClick={() => !disabled && onDateClick(day)}
              onMouseEnter={() => !disabled && onDateHover(day)}
              onMouseLeave={() => onDateHover(null)}
              className={`
                relative flex h-8 items-center justify-center text-xs transition-all
                ${disabled ? "cursor-not-allowed text-zinc-700" : "cursor-pointer"}
                ${inRange && !isStart && !isEnd ? "bg-purple-500/15 text-zinc-200" : ""}
                ${isStart ? "rounded-l-md bg-purple-600 font-bold text-white" : ""}
                ${isEnd && !isStart ? "rounded-r-md bg-purple-600 font-bold text-white" : ""}
                ${isStart && isEnd ? "rounded-md" : ""}
                ${!inRange && !isStart && !isEnd && !disabled ? "text-zinc-300 hover:bg-zinc-700/60 hover:text-white" : ""}
                ${isToday && !isStart && !isEnd ? "font-semibold text-purple-400" : ""}
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EpochRangePicker({
  epochLimit,
  latestEpoch,
  onPresetChange,
  onRangeChange,
}: EpochRangePickerProps) {
  const [mode, setMode] = useState<SelectionMode>("preset");
  const [isOpen, setIsOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [leftMonth, setLeftMonth] = useState(() => subMonths(new Date(), 1));
  const popoverRef = useRef<HTMLDivElement>(null);

  // Compute date bounds from available data
  const maxDate = useMemo(() => {
    if (!latestEpoch) return new Date();
    return epochToDate(latestEpoch);
  }, [latestEpoch]);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleDateClick = useCallback(
    (day: Date) => {
      if (!rangeStart || rangeEnd) {
        // Start new selection
        setRangeStart(day);
        setRangeEnd(null);
      } else {
        // Complete the range
        const [from, to] = isBefore(day, rangeStart) ? [day, rangeStart] : [rangeStart, day];
        setRangeStart(from);
        setRangeEnd(to);

        // Convert to epochs and notify parent
        const fromEpoch = dateToEpoch(from);
        const toEpoch = dateToEpoch(to);
        setMode("custom");
        onRangeChange(fromEpoch, toEpoch);
        // Close after small delay so user sees the selection
        setTimeout(() => setIsOpen(false), 300);
      }
    },
    [rangeStart, rangeEnd, onRangeChange]
  );

  const handlePreset = useCallback(
    (value: number) => {
      setMode("preset");
      setRangeStart(null);
      setRangeEnd(null);
      onPresetChange(value);
      setIsOpen(false);
    },
    [onPresetChange]
  );

  // Label for the trigger button
  const triggerLabel = useMemo(() => {
    if (mode === "custom" && rangeStart && rangeEnd) {
      return `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`;
    }
    return `Last ${epochLimit} Epochs`;
  }, [mode, epochLimit, rangeStart, rangeEnd]);

  const rightMonth = addMonths(leftMonth, 1);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-purple-500/50 hover:bg-zinc-800 hover:text-white"
      >
        <CalendarDays size={14} className="text-purple-400" />
        {triggerLabel}
        <ChevronRight
          size={12}
          className={`text-zinc-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full z-[60] mt-2 rounded-xl border border-zinc-700/80 bg-zinc-900/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
          {/* Presets row */}
          <div className="mb-4 flex items-center gap-2">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Quick
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePreset(p.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  mode === "preset" && epochLimit === p.value
                    ? "bg-purple-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Custom Range
            </span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          {/* Calendars side-by-side */}
          <div className="flex gap-4">
            <MiniCalendar
              month={leftMonth}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              hoverDate={hoverDate}
              maxDate={maxDate}
              onDateClick={handleDateClick}
              onDateHover={setHoverDate}
              onPrevMonth={() => setLeftMonth((m) => subMonths(m, 1))}
              showPrev
            />
            <MiniCalendar
              month={rightMonth}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              hoverDate={hoverDate}
              maxDate={maxDate}
              onDateClick={handleDateClick}
              onDateHover={setHoverDate}
              onNextMonth={() => setLeftMonth((m) => addMonths(m, 1))}
              showNext
            />
          </div>

          {/* Range summary */}
          {rangeStart && (
            <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
              <div className="text-xs text-zinc-400">
                {rangeEnd ? (
                  <>
                    <span className="font-mono text-zinc-300">{format(rangeStart, "MMM d")}</span>
                    <span className="mx-1.5 text-zinc-600">→</span>
                    <span className="font-mono text-zinc-300">{format(rangeEnd, "MMM d, yyyy")}</span>
                    <span className="ml-2 text-zinc-500">
                      (≈ E{dateToEpoch(rangeStart)} – E{dateToEpoch(rangeEnd)})
                    </span>
                  </>
                ) : (
                  <span className="text-zinc-500">Select end date…</span>
                )}
              </div>
              {rangeStart && !rangeEnd && (
                <button
                  onClick={() => {
                    setRangeStart(null);
                    setRangeEnd(null);
                  }}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
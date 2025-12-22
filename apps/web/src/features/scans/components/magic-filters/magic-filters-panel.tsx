"use client";

import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFilterStore } from "@/lib/store/filter-store";
import { generateFiltersFromNL } from "@/lib/ai/filter-generator";
import type { Filter } from "@/lib/types/filter.types";

type MagicMode = "append" | "replace";

export function MagicFiltersPanel() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<MagicMode>("append");
  const [generatedFilters, setGeneratedFilters] = useState<Filter[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const { addMagicFilters, clearAllFilters } = useFilterStore();

  // Auto-apply filters when generated
  const handleGenerate = async () => {
    if (!query.trim()) return;

    setIsGenerating(true);
    try {
      // @ts-ignore - types might be mismatching Filter vs FilterNode array but generator stub returns FilterNode[] which is compatible
      const filters = await generateFiltersFromNL(query);

      // Auto-Apply to Store
      addMagicFilters(filters as any, mode);

      // Optional: clear query after success? Or keep it for reference?
      // User might want to edit it. Keeping it is safer for "Replace" workflows.
      // But maybe clear generatedFilters preview state since we applied it.
      setGeneratedFilters([]);

      // Feedback
      // toast.success(`Applied ${filters.length} filters`);
    } catch (error) {
      console.error("Failed to generate filters:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Manual Apply is no longer needed if we auto-apply,
  // but if we want to keep "Preview" functionality we could add a toggle.
  // For now, based on user request "Click Generate -> Create UI", auto-apply is best.

  /* 
  const handleApply = () => {
    if (mode === "replace") {
      clearAllFilters();
    }

    addMagicFilters(generatedFilters, mode);
    setGeneratedFilters([]);
    setQuery("");
  }; 
  */

  // Suggestions Carousel
  const SUGGESTIONS = [
    "RSI 14 above 70",
    "Close crossed above SMA 50",
    "Volume > 1000000 and Close > 50",
    "consecutive 3 green candles",
    "EMA 20 > EMA 50",
    "Close > VWAP",
    "Stoch 14 below 20",
    "High > All Time High",
    "MACD crossed above Signal",
    "RSI 14 > 50 and SMA 20 > SMA 50",
    "Low < Bollinger Lower",
    "ADX 14 > 25",
    "Market Cap > 10000000000" /* Only valid for enriched symbols */,
    "Close > Open and Volume > 500000",
  ];

  const [suggestionIndex, setSuggestionIndex] = useState(0);

  // Rotate suggestions every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex((prev) => (prev + 1) % SUGGESTIONS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const visibleSuggestions = [];
  for (let i = 0; i < 5; i++) {
    visibleSuggestions.push(
      SUGGESTIONS[(suggestionIndex + i) % SUGGESTIONS.length]
    );
  }

  return (
    <div className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 rounded-lg p-6 mb-8 border border-slate-700">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-bold text-white">MAGIC FILTERS</h2>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("append")}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            mode === "append"
              ? "bg-slate-700 text-white"
              : "bg-slate-800 text-slate-400 hover:text-slate-300"
          }`}
        >
          Append
        </button>
        <button
          onClick={() => setMode("replace")}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            mode === "replace"
              ? "bg-slate-700 text-white"
              : "bg-slate-800 text-slate-400 hover:text-slate-300"
          }`}
        >
          Replace
        </button>
      </div>

      {/* Input Area */}
      <div className="flex gap-3 mb-4">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Scan stocks using simple language like 'stocks up by 4% and rising volume'"
          className="flex-1 min-h-[80px] bg-slate-800 text-white border-slate-700 placeholder:text-slate-500 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) {
              handleGenerate();
            }
          }}
        />
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !query.trim()}
          className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 h-fit"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate
            </>
          )}
        </Button>
      </div>

      {/* Dynamic Suggestions Carousel */}
      <div className="flex flex-wrap gap-2 mb-6 transition-all duration-300 ease-in-out">
        {visibleSuggestions.map((prompt, idx) => (
          <button
            key={`${prompt}-${idx}`}
            onClick={() => setQuery(prompt)}
            className="px-3 py-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors animate-in fade-in zoom-in duration-300"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterPreviewPill({
  filter,
  onRemove,
}: {
  filter: Filter;
  onRemove: () => void;
}) {
  const displayText = formatFilterDisplay(filter);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg group transition-colors">
      <span className="text-sm text-white">{displayText}</span>

      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3 text-slate-400 hover:text-red-400" />
      </button>
    </div>
  );
}

function formatFilterDisplay(filter: Filter): string {
  const expr = filter.expression;
  const measure = typeof expr.measure === "string" ? expr.measure : "indicator";
  const operator = expr.operator;

  // Format Value
  let valueStr = "";
  if (expr.valueType === "number") {
    valueStr = String(expr.compareToNumber || 0);
  } else {
    valueStr = `${expr.compareToOffset || "latest"} ${
      typeof expr.compareToMeasure === "string"
        ? expr.compareToMeasure
        : "custom"
    }`;
  }

  // Format Arithmetic
  let arithmetic = "";
  if (expr.arithmeticOperator) {
    arithmetic = ` ${expr.arithmeticOperator} ${expr.arithmeticValue} `;
  }

  return `${
    expr.offset || "latest"
  } ${measure} ${operator} ${arithmetic} ${valueStr}`;
}

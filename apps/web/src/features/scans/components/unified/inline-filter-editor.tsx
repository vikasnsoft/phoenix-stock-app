"use client";

import React, { useState } from "react";
import { X, Copy, Eye, Settings } from "lucide-react";
import { InlineSelect } from "./inline-select";
import { NumberInput } from "./number-input";
import type {
  Filter,
  FilterExpression,
  OffsetType,
  TimeframeType,
  OperatorType,
  StockAttribute,
  ValueType,
} from "@/lib/types/filter.types";

interface InlineFilterEditorProps {
  filter: Filter;
  onUpdate: (filter: Filter) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function InlineFilterEditor({
  filter,
  onUpdate,
  onDelete,
  onDuplicate,
}: InlineFilterEditorProps) {
  const expr = filter.expression;
  const [isHovering, setIsHovering] = useState(false);

  const handleUpdate = (updates: Partial<FilterExpression>) => {
    onUpdate({
      ...filter,
      expression: { ...expr, ...updates },
    });
  };

  const OFFSET_OPTIONS = [
    { value: "latest", label: "Latest" },
    { value: "1d_ago", label: "1 day ago" },
    { value: "2d_ago", label: "2 days ago" },
    { value: "3d_ago", label: "3 days ago" },
    { value: "5d_ago", label: "5 days ago" },
    { value: "10d_ago", label: "10 days ago" },
    { value: "20d_ago", label: "20 days ago" },
    { value: "50d_ago", label: "50 days ago" },
    { value: "100d_ago", label: "100 days ago" },
    { value: "252d_ago", label: "252 days ago (1Y)" },
    { value: "1w_ago", label: "1 week ago" },
    { value: "1m_ago", label: "1 month ago" },
    { value: "3m_ago", label: "3 months ago" },
    { value: "6m_ago", label: "6 months ago" },
  ];

  const TIMEFRAME_OPTIONS = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "15min", label: "15 minute" },
    { value: "5min", label: "5 minute" },
  ];

  const ATTRIBUTE_OPTIONS = [
    // Stock Attributes
    { value: "close", label: "Close", group: "Price" },
    { value: "open", label: "Open", group: "Price" },
    { value: "high", label: "High", group: "Price" },
    { value: "low", label: "Low", group: "Price" },
    { value: "volume", label: "Volume", group: "Volume" },
    // Fundamental Attributes
    { value: "market_cap", label: "Market Cap", group: "Fundamental" },
    { value: "pe_ratio", label: "P/E Ratio", group: "Fundamental" },
    { value: "eps", label: "EPS", group: "Fundamental" },
    { value: "book_value", label: "Book Value", group: "Fundamental" },
    { value: "dividend_yield", label: "Dividend Yield", group: "Fundamental" },
    { value: "roe", label: "ROE", group: "Fundamental" },
    // Moving Averages
    { value: "sma", label: "SMA", group: "Moving Average" },
    { value: "ema", label: "EMA", group: "Moving Average" },
    { value: "wma", label: "WMA", group: "Moving Average" },
    // Momentum Indicators
    { value: "rsi", label: "RSI", group: "Momentum" },
    { value: "macd", label: "MACD", group: "Momentum" },
    { value: "macd_signal", label: "MACD Signal", group: "Momentum" },
    { value: "macd_histogram", label: "MACD Histogram", group: "Momentum" },
    { value: "stochastic_k", label: "Stochastic %K", group: "Momentum" },
    { value: "stochastic_d", label: "Stochastic %D", group: "Momentum" },
    { value: "cci", label: "CCI", group: "Momentum" },
    { value: "roc", label: "Rate of Change", group: "Momentum" },
    { value: "williams_r", label: "Williams %R", group: "Momentum" },
    { value: "mfi", label: "Money Flow Index", group: "Momentum" },
    // Volatility Indicators
    { value: "atr", label: "ATR", group: "Volatility" },
    { value: "bb_upper", label: "Bollinger Upper", group: "Volatility" },
    { value: "bb_middle", label: "Bollinger Middle", group: "Volatility" },
    { value: "bb_lower", label: "Bollinger Lower", group: "Volatility" },
    { value: "bb_width", label: "Bollinger Width", group: "Volatility" },
    // Trend Indicators
    { value: "adx", label: "ADX", group: "Trend" },
    { value: "plus_di", label: "+DI", group: "Trend" },
    { value: "minus_di", label: "-DI", group: "Trend" },
    { value: "supertrend", label: "Supertrend", group: "Trend" },
    { value: "parabolic_sar", label: "Parabolic SAR", group: "Trend" },
    { value: "aroon_up", label: "Aroon Up", group: "Trend" },
    { value: "aroon_down", label: "Aroon Down", group: "Trend" },
    // Volume Indicators
    { value: "obv", label: "OBV", group: "Volume" },
    { value: "vwap", label: "VWAP", group: "Volume" },
    // Functional Filters
    { value: "max", label: "Max (Period)", group: "Function" },
    { value: "min", label: "Min (Period)", group: "Function" },
  ];

  const OPERATOR_OPTIONS = [
    // Comparison Operators
    { value: ">", label: "Greater than" },
    { value: "<", label: "Less than" },
    { value: ">=", label: "Greater or equal" },
    { value: "<=", label: "Less or equal" },
    { value: "==", label: "Equals" },
    { value: "!=", label: "Not equals" },
    // Crossover Operators
    { value: "crosses_above", label: "Crossed above" },
    { value: "crosses_below", label: "Crossed below" },
  ];

  const ARITHMETIC_OPTIONS = [
    { value: "", label: "None" },
    { value: "+", label: "+ Add" },
    { value: "-", label: "− Subtract" },
    { value: "*", label: "× Multiply" },
    { value: "/", label: "÷ Divide" },
  ];

  const isCrossover =
    expr.operator === "crosses_above" || expr.operator === "crosses_below";
  const hasArithmetic =
    expr.arithmeticOperator && expr.arithmeticOperator !== "";

  const VALUE_TYPE_OPTIONS = [
    { value: "number", label: "Number" },
    { value: "measure", label: "Measure" },
  ];

  return (
    <div
      className="group flex items-center gap-2 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex-wrap"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Offset Selector */}
      <InlineSelect
        value={expr.offset || "latest"}
        onChange={(v) => handleUpdate({ offset: v as OffsetType })}
        options={OFFSET_OPTIONS}
        className="text-slate-500"
      />

      {/* Timeframe Selector */}
      <InlineSelect
        value={expr.timeframe || "daily"}
        onChange={(v) => handleUpdate({ timeframe: v as TimeframeType })}
        options={TIMEFRAME_OPTIONS}
        className="text-slate-500"
      />

      {/* Attribute Selector */}
      <InlineSelect
        value={getMeasureValue(expr.measure)}
        onChange={(v) => handleUpdate({ measure: v as StockAttribute })}
        options={ATTRIBUTE_OPTIONS}
        className="font-semibold text-slate-900"
      />

      {/* Arithmetic Operation (optional) */}
      <InlineSelect
        value={expr.arithmeticOperator || ""}
        onChange={(v) =>
          handleUpdate({
            arithmeticOperator: v as "+" | "-" | "*" | "/" | undefined,
          })
        }
        options={ARITHMETIC_OPTIONS}
        className="text-orange-600"
      />

      {/* Arithmetic Value (if arithmetic operator selected) */}
      {hasArithmetic && (
        <NumberInput
          value={expr.arithmeticValue || 1}
          onChange={(v) => handleUpdate({ arithmeticValue: v })}
          className="w-20"
        />
      )}

      {/* Operator Selector */}
      <InlineSelect
        value={expr.operator}
        onChange={(v) => handleUpdate({ operator: v as OperatorType })}
        options={OPERATOR_OPTIONS}
        className="font-semibold text-pink-600"
      />

      {/* Value Type Selector (hidden for crossover - always measure) */}
      {!isCrossover && (
        <InlineSelect
          value={expr.valueType}
          onChange={(v) => handleUpdate({ valueType: v as ValueType })}
          options={VALUE_TYPE_OPTIONS}
          className="text-slate-600"
        />
      )}

      {/* Number Input (for number value type) */}
      {!isCrossover && expr.valueType === "number" && (
        <NumberInput
          value={expr.compareToNumber || 0}
          onChange={(v) => handleUpdate({ compareToNumber: v })}
          className="w-24"
        />
      )}

      {/* Compare to Measure Fields (for measure value type or crossover) */}
      {(isCrossover || expr.valueType === "measure") && (
        <>
          <InlineSelect
            value={expr.compareToOffset || "latest"}
            onChange={(v) => handleUpdate({ compareToOffset: v as OffsetType })}
            options={OFFSET_OPTIONS}
            className="text-slate-500"
          />
          <InlineSelect
            value={getMeasureValue(expr.compareToMeasure || "close")}
            onChange={(v) =>
              handleUpdate({ compareToMeasure: v as StockAttribute })
            }
            options={ATTRIBUTE_OPTIONS}
            className="font-semibold text-slate-900"
          />
        </>
      )}

      {/* Action Buttons */}
      <div
        className={`flex items-center gap-2 ml-auto border-l border-slate-200 pl-2 transition-opacity ${
          isHovering ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          onClick={() => onDuplicate(filter.id)}
          className="p-1.5 hover:bg-slate-200 rounded transition-colors"
          title="Duplicate"
        >
          <Copy className="w-4 h-4 text-slate-600" />
        </button>

        <button
          className="p-1.5 hover:bg-slate-200 rounded transition-colors"
          title="Preview"
        >
          <Eye className="w-4 h-4 text-slate-600" />
        </button>

        <button
          className="p-1.5 hover:bg-slate-200 rounded transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4 text-slate-600" />
        </button>

        <button
          onClick={() => onDelete(filter.id)}
          className="p-1.5 hover:bg-red-100 rounded transition-colors"
          title="Delete"
        >
          <X className="w-4 h-4 text-red-600" />
        </button>
      </div>
    </div>
  );
}

function getMeasureValue(measure: any): string {
  if (typeof measure === "string") return measure;
  if (measure && typeof measure === "object" && measure.type)
    return measure.type;
  return "custom";
}

"use client";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function NumberInput({
  value,
  onChange,
  className = "",
}: NumberInputProps) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={`px-3 py-1 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    />
  );
}

import { useFilterStore } from '@/lib/store/filter-store';
import { InlineSelect } from './scan-inline-select';
import { CardHeader, CardTitle } from '@/components/ui/card';

const BEHAVIOR_OPTIONS = [
  { value: 'passes', label: 'Passes' },
  { value: 'fails', label: 'Fails' },
];

const CONJUNCTION_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'any', label: 'Any' },
];

const SEGMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'futures', label: 'Futures' },
  { value: 'nifty50', label: 'Nifty 50' },
  { value: 'nifty100', label: 'Nifty 100' },
  { value: 'nifty500', label: 'Nifty 500' },
];

export function ScanFilterHeader() {
  const { 
    scanConfig, 
    setScanBehavior, 
    setScanConjunction, 
    setSegment 
  } = useFilterStore();

  return (
    <div className="flex flex-wrap items-center gap-2 text-lg p-4 border-b bg-muted/20">
      <span className="font-medium text-muted-foreground">Stock</span>
      
      <InlineSelect
        value={scanConfig.behavior}
        options={BEHAVIOR_OPTIONS}
        onChange={(val) => setScanBehavior(val as any)}
        className="text-lg font-bold text-foreground bg-background border rounded-md shadow-sm px-3"
      />

      <InlineSelect
        value={scanConfig.conjunction}
        options={CONJUNCTION_OPTIONS}
        onChange={(val) => setScanConjunction(val as any)}
        className="text-lg font-bold text-foreground bg-background border rounded-md shadow-sm px-3"
      />

      <span className="font-medium text-muted-foreground">of the below filters in</span>

      <InlineSelect
        value={scanConfig.segment}
        options={SEGMENT_OPTIONS}
        onChange={(val) => setSegment(val as any)}
        className="text-lg font-bold text-foreground bg-background border rounded-md shadow-sm px-3"
      />
      
      <span className="font-medium text-muted-foreground">segment</span>
    </div>
  );
}

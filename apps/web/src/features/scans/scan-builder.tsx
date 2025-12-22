"use client";

import { useState } from "react";
import { useFilterStore } from "@/lib/store/filter-store";
import { useScansControllerRunCustomScan } from "@/lib/api/generated/scans/scans";
import { useSavedScansControllerCreateSavedScan } from "@/lib/api/generated/saved-scans/saved-scans";
import { symbolsControllerFindAll } from "@/lib/api/generated/symbols/symbols";
import { useScanBuilderStore } from "@/store/scan-builder-store";
import { buildAst } from "./utils/ast-builder";
import { ScanFilterHeader } from "./components/scan-filter-header";
import { ScanFilterGroup } from "./components/scan-filter-group";
import { ScanFilterRow } from "./components/scan-filter-row";
import { MagicFiltersPanel } from "./components/magic-filters/magic-filters-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { columns, ScanResult } from "./scan-columns";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Save, Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  FilterConditionDto,
  RunScanDto,
  CreateSavedScanDto,
} from "@/lib/api/generated/index.schemas";

interface ScanApiResponse {
  data: {
    total_matched: number;
    matched_stocks: ScanResult[];
  };
}

export const ScanBuilder = () => {
  // Store Hooks
  const {
    scanConfig,
    addFilter,
    addFilterGroup, // Optional: if we want to add root group
    isValid,
  } = useFilterStore();

  const { setSymbols, setLastResult } = useScanBuilderStore();

  // Local State
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [scanName, setScanName] = useState("");
  const [scanDescription, setScanDescription] = useState("");
  const [symbolsText, setSymbolsText] = useState("");

  // API Hooks
  const {
    mutate,
    isPending,
    isSuccess,
    data: voidData,
  } = useScansControllerRunCustomScan({
    mutation: {
      onSuccess: () => toast.success("Scan completed"),
      onError: () => toast.error("Scan failed to run"),
    },
  });

  const data = voidData as unknown as ScanApiResponse | undefined;

  const { mutate: saveScan, isPending: isSaving } =
    useSavedScansControllerCreateSavedScan({
      mutation: {
        onSuccess: () => {
          toast.success("Scan saved successfully");
          setIsSaveDialogOpen(false);
          setScanName("");
          setScanDescription("");
        },
        onError: () => toast.error("Failed to save scan"),
      },
    });

  // Action Handlers
  const handleRunScan = async () => {
    if (!isValid()) {
      toast.error("Please add at least one valid filter");
      return;
    }

    const symbols = symbolsText
      ? symbolsText
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

    // Build AST from Store Config (implicitly assumes root is 'AND' of all filters if list)
    // BUT scanConfig has 'conjunction' ('all'/'any').
    // construct a Root Group Node on the fly for AST building?
    // or update buildAst to take ScanConfig?
    // buildAst takes FilterNode.
    // We can wrap scanConfig.filters into a synthetic FilterGroup for buildAst.

    // Build AST from Store Config
    const syntheticRoot = {
      type: "group",
      filters: scanConfig.filters,
      conjunction: scanConfig.conjunction === "all" ? "AND" : "OR",
    } as any;

    let ast = buildAst(syntheticRoot);

    // Handle Behavior: "Fails" means NOT(Conditions)
    if (scanConfig.behavior === "fails") {
      ast = {
        type: "unary",
        operator: "NOT",
        operand: ast,
      };
    }

    // Handle Segment: Filter Symbols
    // If no manual symbols entered, filter based on segment
    // Handle Segment: Filter Symbols
    // If no manual symbols entered, filter based on segment
    if (symbols.length === 0) {
      try {
        if (scanConfig.segment === "cash") {
          // Fetch from API (Assuming Cash = NYSE + NASDAQ or just limited set)
          const res = await symbolsControllerFindAll({ take: 5000 });
          // Note: Backend default is 5000 anyway if symbols empty.
          // So for 'cash' representing 'all', we can leave it empty OR be explicit.
          // If we want to support 'futures', we would need to filter by exchange/type.
          // For now, we will leave it empty if 'cash' (default) to let backend handle it efficiently.
        } else if (
          ["nifty50", "nifty100", "nifty500"].includes(scanConfig.segment)
        ) {
          // Placeholder for Watchlist fetching
          console.warn("Watchlist segment not fully implemented");
        }
      } catch (e) {
        console.error("Failed to fetch symbols for segment", e);
      }
    }

    const filterPayload: FilterConditionDto[] = [
      {
        type: "expression",
        expression: ast,
        field: "expression", // dummy
        operator: "eq", // dummy
        value: 0, // dummy
      } as any,
    ];

    const payload: RunScanDto = {
      symbols,
      filters: filterPayload,
      filterLogic: "AND", // Logic handled inside AST
    };

    setSymbols(symbols);

    mutate(
      { data: payload },
      {
        onSuccess: (result) => {
          const response = result as unknown as ScanApiResponse;
          if (response?.data) {
            setLastResult({
              matchedStocksCount: response.data.total_matched,
              totalScanned: 0,
            });
          }
        },
      }
    );
  };

  const handleSaveScan = () => {
    if (!scanName.trim()) return;

    const syntheticRoot = {
      type: "group",
      filters: scanConfig.filters,
      conjunction: scanConfig.conjunction === "all" ? "AND" : "OR",
    } as any;

    const ast = buildAst(syntheticRoot);

    const filterPayload: FilterConditionDto[] = [
      {
        type: "expression",
        expression: ast,
        field: "expression",
        operator: "eq",
        value: 0,
      } as any,
    ];

    const payload: CreateSavedScanDto = {
      name: scanName,
      description: scanDescription,
      filters: filterPayload,
      filterLogic: "AND",
    };
    saveScan({ data: payload });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-20">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Advanced Screener</h1>
        <p className="text-muted-foreground">
          Build complex technical scans using natural language filters.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="space-y-6">
          {/* Magic Filters Panel */}
          <MagicFiltersPanel />

          {/* Header & Controls */}
          <div className="bg-card rounded-lg border shadow-sm">
            {/* 1. Filter Logic Header */}
            <ScanFilterHeader />

            {/* 2. Filter List */}
            <div className="p-4 bg-background/50 min-h-[100px] flex flex-col gap-2">
              {scanConfig.filters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <p>No filters added yet.</p>
                  <Button variant="link" onClick={addFilter}>
                    Add your first filter
                  </Button>
                </div>
              ) : (
                scanConfig.filters.map((node, index) => (
                  <div key={node.id}>
                    {node.type === "simple" ? (
                      <ScanFilterRow filter={node} index={index} />
                    ) : (
                      <ScanFilterGroup group={node} />
                    )}

                    {/* Root Conjunction Label (if multiple) */}
                    {index < scanConfig.filters.length - 1 && (
                      <div className="px-4 py-1 text-xs font-bold text-muted-foreground ml-8">
                        {scanConfig.conjunction === "all" ? "AND" : "OR"}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* 3. Add Button Footer */}
            <div className="bg-muted/10 p-2 border-t flex justify-center">
              <Button
                onClick={addFilter}
                variant="outline"
                className="text-blue-600 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Filter
              </Button>
            </div>
          </div>

          {/* Scan Universe Input */}
          <div className="bg-card p-4 rounded-lg border shadow-sm flex items-center gap-4">
            <Label className="text-base font-medium whitespace-nowrap">
              Scan Universe:
            </Label>
            <Input
              placeholder="All Stocks (or enter symbols)"
              value={symbolsText}
              onChange={(e) => setSymbolsText(e.target.value)}
              className="font-mono text-sm h-9 max-w-md bg-muted/20"
            />
          </div>

          {/* Actions Footer */}
          <div className="sticky bottom-4 z-10 bg-background/95 backdrop-blur py-4 border-t flex items-center justify-between gap-4 rounded-lg px-4 shadow-lg border">
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" type="button">
                  <Save className="mr-2 h-4 w-4" />
                  Save Scan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Scan Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={scanName}
                      onChange={(e) => setScanName(e.target.value)}
                      placeholder="My Bullish Scan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={scanDescription}
                      onChange={(e) => setScanDescription(e.target.value)}
                      placeholder="Description..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveScan} disabled={isSaving}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              onClick={handleRunScan}
              size="lg"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Scanner
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        {isSuccess && data && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                Scan Results
                <Badge variant="secondary" className="ml-2">
                  {data.data.total_matched} matches
                </Badge>
              </h2>
            </div>

            {data.data.matched_stocks?.length > 0 ? (
              <DataTable columns={columns} data={data.data.matched_stocks} />
            ) : (
              <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-muted/20">
                <p className="text-muted-foreground text-lg">
                  No stocks matched.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

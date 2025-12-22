"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  useWatchlistsControllerListWatchlists, 
  useWatchlistsControllerUpdateWatchlistSymbols,
  useWatchlistsControllerRunWatchlistScan,
  useWatchlistsControllerDeleteWatchlist
} from "@/lib/api/generated/watchlists/watchlists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "@/components/screener/columns";
import { Loader2, Trash2, Plus, Play, ArrowLeft, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function WatchlistDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const queryClient = useQueryClient();
  
  const { data: watchlistsData, isLoading: isLoadingWatchlists } = useWatchlistsControllerListWatchlists();
  
  const [newSymbol, setNewSymbol] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Find the current watchlist
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const watchlist = (watchlistsData as any)?.data?.watchlists?.[id];

  // Mutation to run scan (fetch symbol data)
  const { 
    mutate: runScan, 
    data: scanData, 
    isPending: isScanning 
  } = useWatchlistsControllerRunWatchlistScan();

  // Mutation to update symbols
  const { 
    mutate: updateSymbols, 
    isPending: isUpdating 
  } = useWatchlistsControllerUpdateWatchlistSymbols({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['watchlistsControllerListWatchlists'] });
        setIsAddDialogOpen(false);
        setNewSymbol("");
        toast.success("Watchlist updated");
        // Re-run scan to get updated data
        runScan({ identifier: id, data: { filters: [] } });
      },
      onError: () => {
        toast.error("Failed to update watchlist");
      }
    }
  });

  // Mutation to delete watchlist
  const { 
    mutate: deleteWatchlist, 
    isPending: isDeleting 
  } = useWatchlistsControllerDeleteWatchlist({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['watchlistsControllerListWatchlists'] });
        toast.success("Watchlist deleted");
        router.push("/watchlists");
      }
    }
  });

  // Initial load of symbol data
  useEffect(() => {
    if (id && watchlist) {
      runScan({ identifier: id, data: { filters: [] } });
    }
  }, [id, watchlist, runScan]);

  const handleAddSymbol = () => {
    if (!watchlist || !newSymbol) return;
    const currentSymbols = watchlist.symbols || [];
    if (currentSymbols.includes(newSymbol.toUpperCase())) {
      toast.error("Symbol already in watchlist");
      return;
    }
    updateSymbols({ 
      identifier: id, 
      data: { symbols: [...currentSymbols, newSymbol.toUpperCase()] } 
    });
  };

  const handleRemoveSymbol = (symbol: string) => {
    if (!watchlist) return;
    const currentSymbols = watchlist.symbols || [];
    updateSymbols({ 
      identifier: id, 
      data: { symbols: currentSymbols.filter((s: string) => s !== symbol) } 
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this watchlist?")) {
      deleteWatchlist({ identifier: id });
    }
  };

  if (isLoadingWatchlists) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!watchlist) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold text-red-500">Watchlist not found</h1>
        <Button variant="link" onClick={() => router.push("/watchlists")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Watchlists
        </Button>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const symbolData = (scanData as any)?.data?.results || [];

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => router.push("/watchlists")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{watchlist.name}</h1>
          </div>
          <p className="text-muted-foreground ml-10">
            {watchlist.description || "No description"}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Symbols ({watchlist.symbols?.length || 0})</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Symbol
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Symbol</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="symbol">Ticker Symbol</Label>
                <Input
                  id="symbol"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  placeholder="e.g. AAPL"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddSymbol} disabled={isUpdating || !newSymbol.trim()}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        {isScanning ? (
           <div className="flex h-32 items-center justify-center">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={symbolData} 
            pageCount={1}
            pagination={{ pageIndex: 0, pageSize: 100 }}
            onPaginationChange={() => {}}
          />
        )}
      </div>
    </div>
  );
}

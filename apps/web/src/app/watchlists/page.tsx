"use client";

import { useState } from "react";
import Link from "next/link";
import { useWatchlistsControllerListWatchlists, useWatchlistsControllerCreateWatchlist } from "@/lib/api/generated/watchlists/watchlists";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, ChevronRight, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function WatchlistsPage() {
  const { data, isLoading, isError } = useWatchlistsControllerListWatchlists();
  const queryClient = useQueryClient();
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { mutate: createWatchlist, isPending: isCreating } = useWatchlistsControllerCreateWatchlist({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['watchlistsControllerListWatchlists'] });
        setIsDialogOpen(false);
        setNewWatchlistName("");
      }
    }
  });

  const handleCreate = () => {
    if (!newWatchlistName.trim()) return;
    createWatchlist({ data: { name: newWatchlistName, symbols: [] } });
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center text-red-500">Failed to load watchlists</div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const watchlists = (data as any)?.data?.watchlists ? Object.values((data as any).data.watchlists) : [];

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Watchlists</h1>
          <p className="text-muted-foreground">
            Manage your custom lists of symbols to track and scan.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Watchlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Watchlist</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  placeholder="My Watchlist"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={isCreating || !newWatchlistName.trim()}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {watchlists.map((watchlist: any) => (
          <Link key={watchlist.id} href={`/watchlists/${watchlist.id}`}>
            <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">
                  {watchlist.name}
                </CardTitle>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {watchlist.symbols?.length || 0} symbols
                </CardDescription>
                {watchlist.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {watchlist.description}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
        {watchlists.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No watchlists found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}

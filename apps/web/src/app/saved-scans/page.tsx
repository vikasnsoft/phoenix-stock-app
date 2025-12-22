"use client";

import { useState } from "react";
import { 
  useSavedScansControllerListSavedScans, 
  useSavedScansControllerDeleteSavedScan,
  useSavedScansControllerRunSavedScan 
} from "@/lib/api/generated/saved-scans/saved-scans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Trash2, Play } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "@/components/screener/columns";

export default function SavedScansPage() {
  const { data, isLoading, isError } = useSavedScansControllerListSavedScans();
  const queryClient = useQueryClient();
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);

  const { mutate: deleteScan, isPending: isDeleting } = useSavedScansControllerDeleteSavedScan({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['savedScansControllerListSavedScans'] });
        toast.success("Saved scan deleted");
      },
      onError: () => {
        toast.error("Failed to delete saved scan");
      }
    }
  });

  const { mutate: runScan, data: scanResult, isPending: isRunning } = useSavedScansControllerRunSavedScan({
    mutation: {
      onSuccess: () => {
        setIsResultOpen(true);
      },
      onError: () => {
        toast.error("Failed to run scan");
      }
    }
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this scan?")) {
      deleteScan({ identifier: id });
    }
  };

  const handleRun = (id: string) => {
    setSelectedScanId(id);
    runScan({ identifier: id });
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
        <div className="text-center text-red-500">Failed to load saved scans</div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const savedScans = (data as any)?.data?.saved_scans ? Object.values((data as any).data.saved_scans) : [];
  // @ts-expect-error - Response type mismatch in generated code
  const scanData = scanResult?.data?.results || [];

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Saved Scans</h1>
          <p className="text-muted-foreground">
            Your library of custom technical scans.
          </p>
        </div>
        <Link href="/scans">
          <Button>
            <Play className="mr-2 h-4 w-4" />
            New Scan
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {savedScans.map((scan: any) => (
          <Card key={scan.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg font-medium truncate" title={scan.name}>
                {scan.name}
              </CardTitle>
              <CardDescription>
                Created {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {scan.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {scan.description}
                </p>
              )}
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                {scan.definition?.filters?.length || 0} filters defined
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button variant="ghost" size="sm" onClick={() => handleDelete(scan.id)} disabled={isDeleting}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => handleRun(scan.id)}
                  disabled={isRunning && selectedScanId === scan.id}
                >
                  {isRunning && selectedScanId === scan.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
        {savedScans.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No saved scans found. Create one in the Scan Builder.
          </div>
        )}
      </div>

      <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scan Results</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <DataTable 
              columns={columns} 
              data={scanData} 
              pageCount={1}
              pagination={{ pageIndex: 0, pageSize: 100 }}
              onPaginationChange={() => {}}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setIsResultOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

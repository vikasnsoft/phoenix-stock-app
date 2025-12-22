"use client";

import { useIngestionControllerTriggerEod, useIngestionControllerTriggerSymbolSync } from "@/lib/api/generated/ingestion/ingestion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, RefreshCw, Database } from "lucide-react";
import { toast } from "sonner";

export default function IngestionPage() {
  const { mutate: triggerEod, isPending: isEodPending } = useIngestionControllerTriggerEod({
    mutation: {
      onSuccess: () => {
        toast.success("EOD ingestion triggered successfully");
      },
      onError: () => {
        toast.error("Failed to trigger EOD ingestion");
      }
    }
  });

  const { mutate: triggerSymbolSync, isPending: isSymbolPending } = useIngestionControllerTriggerSymbolSync({
    mutation: {
      onSuccess: () => {
        toast.success("Symbol sync triggered successfully");
      },
      onError: () => {
        toast.error("Failed to trigger symbol sync");
      }
    }
  });

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ingestion Control</h1>
        <p className="text-muted-foreground">
          Manually trigger data ingestion jobs.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              EOD Data Ingestion
            </CardTitle>
            <CardDescription>
              Trigger the End-of-Day data ingestion process for all tracked symbols.
              This will fetch the latest daily candles from the data provider.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => triggerEod({ data: {} })} 
              disabled={isEodPending}
              className="w-full"
            >
              {isEodPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Trigger EOD Sync
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Symbol Synchronization
            </CardTitle>
            <CardDescription>
              Sync the master list of symbols from the data provider.
              This updates the list of available stocks, ETFs, and indices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => triggerSymbolSync({ data: { exchange: 'US' } })} 
              disabled={isSymbolPending}
              className="w-full"
              variant="secondary"
            >
              {isSymbolPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Trigger Symbol Sync
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

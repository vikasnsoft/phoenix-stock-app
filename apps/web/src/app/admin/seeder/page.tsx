"use client";

import { useState, useEffect } from "react";
import { AXIOS_INSTANCE } from "@/lib/api/axios-instance";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Database,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface SeedJob {
  id: string;
  name: string;
  state?: string;
  data: {
    yearsBack?: number;
    skip?: number;
    take?: number;
    seedCandles?: boolean;
    seedMetrics?: boolean;
  };
  progress: number | object;
  attemptsMade: number;
  processedOn?: number;
  finishedOn?: number;
  returnvalue?: {
    tickers?: number;
    candles?: { processed: number; inserted: number };
    metrics?: { processed: number; inserted: number };
  };
  failedReason?: string;
}

interface SeedStatus {
  queue: {
    active: SeedJob[];
    waiting: SeedJob[];
    recentCompleted: SeedJob[];
    recentFailed: SeedJob[];
  };
  database: {
    activeSymbols: number;
    totalCandles: number;
    totalMetrics: number;
  };
}

export default function SeederPage() {
  const [status, setStatus] = useState<SeedStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Seed form state
  const [yearsBack, setYearsBack] = useState(1);
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(100);
  const [seedCandles, setSeedCandles] = useState(true);
  const [seedMetrics, setSeedMetrics] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await AXIOS_INSTANCE.get<SeedStatus>(
        "/ingestion/seed/status"
      );
      setStatus(response.data);
    } catch (error) {
      toast.error("Failed to fetch seed status");
    } finally {
      setLoading(false);
    }
  };

  const triggerSeed = async () => {
    setSubmitting(true);
    try {
      const response = await AXIOS_INSTANCE.post("/ingestion/poc/seed", {
        yearsBack,
        skip,
        take,
        seedCandles,
        seedMetrics,
        candleConcurrency: 5,
        metricDelayMs: 1200,
      });
      toast.success(`Seed job queued: ${response.data.jobId}`);
      setAutoRefresh(true);
      fetchStatus();
    } catch (error) {
      toast.error("Failed to trigger seed job");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatNumber = (n: number) => n.toLocaleString();

  const getStateColor = (state?: string) => {
    switch (state) {
      case "active":
        return "bg-blue-500";
      case "waiting":
        return "bg-yellow-500";
      case "completed":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const renderJobCard = (job: SeedJob, state: string) => (
    <div key={job.id} className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm">Job #{job.id}</span>
        <Badge className={getStateColor(state)}>{state}</Badge>
      </div>
      <div className="text-sm text-muted-foreground">
        {job.data.take} symbols, {job.data.yearsBack}y back
        {job.data.seedCandles && " | Candles"}
        {job.data.seedMetrics && " | Metrics"}
      </div>
      {job.returnvalue && (
        <div className="text-xs space-y-1 bg-muted p-2 rounded">
          <div>Tickers: {job.returnvalue.tickers}</div>
          {job.returnvalue.candles && (
            <div>
              Candles: {formatNumber(job.returnvalue.candles.inserted)} inserted
            </div>
          )}
          {job.returnvalue.metrics && (
            <div>
              Metrics: {formatNumber(job.returnvalue.metrics.inserted)} inserted
            </div>
          )}
        </div>
      )}
      {job.failedReason && (
        <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
          {job.failedReason}
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Database Seeder</h1>
        <p className="text-muted-foreground">
          Seed historical OHLCV candles and financial metrics into the database.
        </p>
      </div>

      {/* Database Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Symbols
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status ? formatNumber(status.database.activeSymbols) : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Candles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status ? formatNumber(status.database.totalCandles) : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status ? formatNumber(status.database.totalMetrics) : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Seed Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Run Seeder
            </CardTitle>
            <CardDescription>
              Configure and start a new seed job. Candles are fetched from
              Stooq, metrics from Finnhub.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearsBack">Years Back</Label>
                <Input
                  id="yearsBack"
                  type="number"
                  min={1}
                  max={5}
                  value={yearsBack}
                  onChange={(e) => setYearsBack(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="take">Symbol Count</Label>
                <Input
                  id="take"
                  type="number"
                  min={1}
                  max={5000}
                  value={take}
                  onChange={(e) => setTake(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="skip">Skip Symbols</Label>
              <Input
                id="skip"
                type="number"
                min={0}
                value={skip}
                onChange={(e) => setSkip(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Use skip/take for pagination (e.g., skip=0 take=500, then
                skip=500 take=500)
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="seedCandles"
                  checked={seedCandles}
                  onCheckedChange={setSeedCandles}
                />
                <Label htmlFor="seedCandles">Seed Candles</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="seedMetrics"
                  checked={seedMetrics}
                  onCheckedChange={setSeedMetrics}
                />
                <Label htmlFor="seedMetrics">Seed Metrics</Label>
              </div>
            </div>
            <Button
              onClick={triggerSeed}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Start Seed Job
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Estimated time: ~{Math.ceil((take * 1.2) / 60)} min for metrics
              (Finnhub rate limit: 60/min)
            </p>
          </CardContent>
        </Card>

        {/* Job Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Job Status
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoRefresh"
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                  <Label htmlFor="autoRefresh" className="text-xs">
                    Auto
                  </Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchStatus}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
            {status?.queue.active.map((job) => renderJobCard(job, "active"))}
            {status?.queue.waiting.map((job) => renderJobCard(job, "waiting"))}

            {status?.queue.active.length === 0 &&
              status?.queue.waiting.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  No active or waiting jobs
                </div>
              )}

            {(status?.queue.recentCompleted.length ?? 0) > 0 && (
              <>
                <div className="text-sm font-medium flex items-center gap-2 pt-2 border-t">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Recent Completed
                </div>
                {status?.queue.recentCompleted
                  .slice(0, 3)
                  .map((job) => renderJobCard(job, "completed"))}
              </>
            )}

            {(status?.queue.recentFailed.length ?? 0) > 0 && (
              <>
                <div className="text-sm font-medium flex items-center gap-2 pt-2 border-t">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Recent Failed
                </div>
                {status?.queue.recentFailed
                  .slice(0, 3)
                  .map((job) => renderJobCard(job, "failed"))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

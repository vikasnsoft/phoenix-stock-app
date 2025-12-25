"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AXIOS_INSTANCE } from "@/lib/api/axios-instance";
import { useAuthStore } from "@/stores/auth-store";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import { Bell, Loader2, Play, Trash2, History, Plus } from "lucide-react";

type AlertType =
  | "PRICE_CROSS"
  | "SCAN_MATCH"
  | "PERCENT_CHANGE"
  | "INDICATOR_CROSS";

type AlertStatus = "ACTIVE" | "TRIGGERED" | "EXPIRED" | "CANCELLED";

type ApiError = { readonly message: string };

type ApiResponse<T> = {
  readonly data: T;
  readonly error: ApiError | null;
  readonly meta?: Record<string, unknown>;
};

type AlertItem = {
  readonly id: string;
  readonly name: string;
  readonly alertType: AlertType;
  readonly condition: Record<string, unknown>;
  readonly ticker: string | null;
  readonly status: AlertStatus;
  readonly emailNotify: boolean;
  readonly pushNotify: boolean;
  readonly expiresAt: string | null;
  readonly triggeredAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

type AlertHistoryItem = {
  readonly id: string;
  readonly alertId: string;
  readonly triggerValue: number | null;
  readonly triggerPrice: number | null;
  readonly matchedSymbols: string[];
  readonly emailSent: boolean;
  readonly pushSent: boolean;
  readonly metadata: Record<string, unknown> | null;
  readonly triggeredAt: string;
};

type AlertHistoryResponse = {
  readonly history: AlertHistoryItem[];
  readonly total: number;
  readonly skip: number;
  readonly take: number;
};

type PriceDirection = "above" | "below";

type CreateAlertPayload = {
  readonly name: string;
  readonly alertType: AlertType;
  readonly condition: Record<string, unknown>;
  readonly ticker?: string;
  readonly emailNotify?: boolean;
  readonly pushNotify?: boolean;
  readonly expiresAt?: string;
};

type CreateAlertFormState = {
  readonly name: string;
  readonly alertType: AlertType;
  readonly ticker: string;
  readonly priceThreshold: string;
  readonly percentChange: string;
  readonly direction: PriceDirection;
  readonly savedScanId: string;
  readonly emailNotify: boolean;
};

const defaultCreateAlertFormState: CreateAlertFormState = {
  name: "",
  alertType: "PRICE_CROSS",
  ticker: "",
  priceThreshold: "",
  percentChange: "",
  direction: "above",
  savedScanId: "",
  emailNotify: true,
};

function parseNumber(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function buildCreateAlertPayload(
  state: CreateAlertFormState
): CreateAlertPayload | null {
  const name = state.name.trim();
  if (!name) {
    return null;
  }

  if (state.alertType === "PRICE_CROSS") {
    const threshold = parseNumber(state.priceThreshold);
    const ticker = state.ticker.trim().toUpperCase();
    if (!ticker || threshold === null) {
      return null;
    }
    return {
      name,
      alertType: state.alertType,
      ticker,
      condition: { threshold, direction: state.direction },
      emailNotify: state.emailNotify,
    };
  }

  if (state.alertType === "PERCENT_CHANGE") {
    const percentChange = parseNumber(state.percentChange);
    const ticker = state.ticker.trim().toUpperCase();
    if (!ticker || percentChange === null) {
      return null;
    }
    return {
      name,
      alertType: state.alertType,
      ticker,
      condition: { percentChange, direction: state.direction },
      emailNotify: state.emailNotify,
    };
  }

  if (state.alertType === "SCAN_MATCH") {
    const savedScanId = state.savedScanId.trim();
    if (!savedScanId) {
      return null;
    }
    return {
      name,
      alertType: state.alertType,
      condition: { savedScanId },
      emailNotify: state.emailNotify,
    };
  }

  return null;
}

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const isLoadingAuth = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [form, setForm] = useState<CreateAlertFormState>(
    defaultCreateAlertFormState
  );

  const [historyAlertId, setHistoryAlertId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  const alertsQueryKey = useMemo(() => ["alerts"], []);

  const { data, isLoading, isError } = useQuery({
    queryKey: alertsQueryKey,
    enabled: !isLoadingAuth && isAuthenticated,
    queryFn: async (): Promise<AlertItem[]> => {
      const response = await AXIOS_INSTANCE.get<
        AlertItem[] | ApiResponse<AlertItem[]>
      >("/alerts");
      const payload = response.data;
      if (Array.isArray(payload)) {
        return payload;
      }
      return payload.data;
    },
  });

  const historyQueryKey = useMemo(
    () => ["alerts", historyAlertId, "history"],
    [historyAlertId]
  );

  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: historyQueryKey,
    enabled: Boolean(historyAlertId) && isHistoryOpen && isAuthenticated,
    queryFn: async (): Promise<AlertHistoryResponse> => {
      const response = await AXIOS_INSTANCE.get<
        AlertHistoryResponse | ApiResponse<AlertHistoryResponse>
      >(`/alerts/${historyAlertId}/history`, { params: { skip: 0, take: 50 } });
      const payload = response.data;
      if ("data" in payload && payload.data) {
        return payload.data;
      }
      return payload as AlertHistoryResponse;
    },
  });

  const { mutate: triggerEvaluation, isPending: isEvaluating } = useMutation({
    mutationFn: async (): Promise<void> => {
      await AXIOS_INSTANCE.post("/alerts/evaluate", {});
    },
    onSuccess: () => {
      toast.success("Alert evaluation queued");
    },
    onError: () => {
      toast.error("Failed to trigger alert evaluation");
    },
  });

  const { mutate: createAlert, isPending: isCreating } = useMutation({
    mutationFn: async (payload: CreateAlertPayload): Promise<void> => {
      await AXIOS_INSTANCE.post("/alerts", payload);
    },
    onSuccess: async () => {
      toast.success("Alert created");
      setIsCreateOpen(false);
      setForm(defaultCreateAlertFormState);
      await queryClient.invalidateQueries({ queryKey: alertsQueryKey });
    },
    onError: () => {
      toast.error("Failed to create alert");
    },
  });

  const { mutate: deleteAlert, isPending: isDeleting } = useMutation({
    mutationFn: async (alertId: string): Promise<void> => {
      await AXIOS_INSTANCE.delete(`/alerts/${alertId}`);
    },
    onSuccess: async () => {
      toast.success("Alert deleted");
      await queryClient.invalidateQueries({ queryKey: alertsQueryKey });
    },
    onError: () => {
      toast.error("Failed to delete alert");
    },
  });

  const onSubmitCreate = () => {
    const payload = buildCreateAlertPayload(form);
    if (!payload) {
      toast.error("Please fill out all required fields");
      return;
    }
    createAlert(payload);
  };

  const openHistory = (alertId: string) => {
    setHistoryAlertId(alertId);
    setIsHistoryOpen(true);
  };

  const closeHistory = () => {
    setIsHistoryOpen(false);
  };

  if (isLoadingAuth) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alerts
            </CardTitle>
            <CardDescription>
              Sign in to manage alerts and view alert history.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

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
        <div className="text-center text-red-500">Failed to load alerts</div>
      </div>
    );
  }

  const alerts: AlertItem[] = data ?? [];

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
        <p className="text-muted-foreground">
          Create alert rules and get notified when they trigger.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Create Alert</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="alert-name">Name</Label>
                <Input
                  id="alert-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. AAPL breaks above 200"
                />
              </div>

              <div className="grid gap-2">
                <Label>Alert Type</Label>
                <Select
                  value={form.alertType}
                  onValueChange={(v) =>
                    setForm({ ...form, alertType: v as AlertType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRICE_CROSS">Price Cross</SelectItem>
                    <SelectItem value="PERCENT_CHANGE">
                      Percent Change
                    </SelectItem>
                    <SelectItem value="SCAN_MATCH">Scan Match</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.alertType === "SCAN_MATCH" ? (
                <div className="grid gap-2">
                  <Label htmlFor="saved-scan-id">Saved Scan ID</Label>
                  <Input
                    id="saved-scan-id"
                    value={form.savedScanId}
                    onChange={(e) =>
                      setForm({ ...form, savedScanId: e.target.value })
                    }
                    placeholder="Paste saved scan id"
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="ticker">Ticker</Label>
                  <Input
                    id="ticker"
                    value={form.ticker}
                    onChange={(e) =>
                      setForm({ ...form, ticker: e.target.value })
                    }
                    placeholder="AAPL"
                  />
                </div>
              )}

              {form.alertType === "PRICE_CROSS" ? (
                <div className="grid gap-2">
                  <Label htmlFor="threshold">Threshold</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={form.priceThreshold}
                    onChange={(e) =>
                      setForm({ ...form, priceThreshold: e.target.value })
                    }
                    placeholder="200"
                  />
                </div>
              ) : null}

              {form.alertType === "PERCENT_CHANGE" ? (
                <div className="grid gap-2">
                  <Label htmlFor="percent">Percent Change</Label>
                  <Input
                    id="percent"
                    type="number"
                    value={form.percentChange}
                    onChange={(e) =>
                      setForm({ ...form, percentChange: e.target.value })
                    }
                    placeholder="5"
                  />
                </div>
              ) : null}

              {form.alertType === "PRICE_CROSS" ||
              form.alertType === "PERCENT_CHANGE" ? (
                <div className="grid gap-2">
                  <Label>Direction</Label>
                  <Select
                    value={form.direction}
                    onValueChange={(v) =>
                      setForm({ ...form, direction: v as PriceDirection })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Above</SelectItem>
                      <SelectItem value="below">Below</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Email notifications</div>
                  <div className="text-xs text-muted-foreground">
                    Send an email when the alert triggers
                  </div>
                </div>
                <Switch
                  checked={form.emailNotify}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, emailNotify: checked })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={onSubmitCreate} disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant="secondary"
          onClick={() => triggerEvaluation()}
          disabled={isEvaluating}
        >
          {isEvaluating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Evaluate now
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className="flex flex-col">
            <CardHeader>
              <CardTitle
                className="text-lg font-medium truncate"
                title={alert.name}
              >
                {alert.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline">{alert.alertType}</Badge>
                <Badge
                  variant={alert.status === "ACTIVE" ? "secondary" : "outline"}
                >
                  {alert.status}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              {alert.ticker ? (
                <div className="text-sm text-muted-foreground">
                  Ticker: {alert.ticker}
                </div>
              ) : null}
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                {JSON.stringify(alert.condition ?? {}, null, 2)}
              </pre>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openHistory(alert.id)}
              >
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteAlert(alert.id)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </CardFooter>
          </Card>
        ))}

        {alerts.length === 0 ? (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No alerts yet.
          </div>
        ) : null}
      </div>

      <Dialog
        open={isHistoryOpen}
        onOpenChange={(open) => (open ? null : closeHistory())}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Alert History</DialogTitle>
          </DialogHeader>
          {isHistoryLoading ? (
            <div className="flex h-[30vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {(historyData?.history ?? []).map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      Triggered at {new Date(item.triggeredAt).toLocaleString()}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        email: {item.emailSent ? "sent" : "not sent"}
                      </Badge>
                      <Badge variant="outline">
                        push: {item.pushSent ? "sent" : "not sent"}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Trigger price: {item.triggerPrice ?? "-"} · Trigger value:{" "}
                      {item.triggerValue ?? "-"}
                    </div>
                    {item.matchedSymbols.length > 0 ? (
                      <div className="text-sm text-muted-foreground">
                        Matched: {item.matchedSymbols.join(", ")}
                      </div>
                    ) : null}
                    {item.metadata ? (
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                        {JSON.stringify(item.metadata, null, 2)}
                      </pre>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
              {(historyData?.history ?? []).length === 0 ? (
                <div className="text-center text-muted-foreground">
                  No history yet.
                </div>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => closeHistory()}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

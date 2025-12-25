"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AXIOS_INSTANCE } from "@/lib/api/axios-instance";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";

type PublicScanSortBy = "newest" | "popular" | "rating" | "featured";

type ApiResponse<T> = {
  readonly data: T;
  readonly error: null | { readonly message: string };
  readonly meta?: Record<string, unknown>;
};

type PublicScanListItem = {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: string;
  readonly tags: string[];
  readonly isFeatured: boolean;
  readonly runCount: number;
  readonly cloneCount: number;
  readonly avgRating: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly user: { readonly id: string; readonly name: string | null };
};

type PublicScanListResponse = {
  readonly items: PublicScanListItem[];
  readonly total: number;
  readonly skip: number;
  readonly take: number;
};

type PublicScanDetailsResponse = {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: string;
  readonly tags: string[];
  readonly isFeatured: boolean;
  readonly runCount: number;
  readonly cloneCount: number;
  readonly avgRating: number;
  readonly ratingCount: number;
  readonly definition: unknown;
  readonly symbolUniverse: string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly user: { readonly id: string; readonly name: string | null };
};

export default function DiscoverPage() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<PublicScanSortBy>("newest");
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  const listQueryKey = useMemo(
    () => ["discovery", "public-scans", { search, sortBy }],
    [search, sortBy]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: listQueryKey,
    queryFn: async (): Promise<ApiResponse<PublicScanListResponse>> => {
      const response = await AXIOS_INSTANCE.get<
        ApiResponse<PublicScanListResponse>
      >("/discovery/scans", {
        params: { search: search.trim() || undefined, sortBy },
      });
      return response.data;
    },
  });

  const detailsQueryKey = useMemo(
    () => ["discovery", "public-scan", selectedScanId],
    [selectedScanId]
  );

  const { data: detailsData, isLoading: isDetailsLoading } = useQuery({
    queryKey: detailsQueryKey,
    enabled: Boolean(selectedScanId) && isDetailsOpen,
    queryFn: async (): Promise<ApiResponse<PublicScanDetailsResponse>> => {
      const response = await AXIOS_INSTANCE.get<
        ApiResponse<PublicScanDetailsResponse>
      >(`/discovery/scans/${selectedScanId}`);
      return response.data;
    },
  });

  const { mutate: cloneScan, isPending: isCloning } = useMutation({
    mutationFn: async (
      scanId: string
    ): Promise<ApiResponse<Record<string, unknown>>> => {
      const response = await AXIOS_INSTANCE.post<
        ApiResponse<Record<string, unknown>>
      >(`/discovery/scans/${scanId}/clone`, {});
      return response.data;
    },
    onSuccess: () => {
      toast.success("Scan cloned to your library");
      queryClient.invalidateQueries({
        queryKey: ["savedScansControllerListSavedScans"],
      });
    },
    onError: () => {
      toast.error("Failed to clone scan");
    },
  });

  const { mutate: rateScan, isPending: isRating } = useMutation({
    mutationFn: async (params: {
      readonly scanId: string;
      readonly rating: number;
    }): Promise<ApiResponse<Record<string, unknown>>> => {
      const response = await AXIOS_INSTANCE.post<
        ApiResponse<Record<string, unknown>>
      >(`/discovery/scans/${params.scanId}/rate`, { rating: params.rating });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Thanks for the rating");
      queryClient.invalidateQueries({ queryKey: detailsQueryKey });
      queryClient.invalidateQueries({ queryKey: listQueryKey });
    },
    onError: () => {
      toast.error("Failed to rate scan");
    },
  });

  const publicScans = data?.data?.items ?? [];

  const openDetails = (scanId: string) => {
    setSelectedScanId(scanId);
    setIsDetailsOpen(true);
  };

  const closeDetails = () => {
    setIsDetailsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || data?.error) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center text-red-500">
          Failed to load public scans
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Discover</h1>
        <p className="text-muted-foreground">
          Explore public scans shared by the community.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search scans by name or description"
          className="sm:max-w-md"
        />
        <div className="flex items-center gap-2">
          <Button
            variant={sortBy === "newest" ? "default" : "secondary"}
            size="sm"
            onClick={() => setSortBy("newest")}
          >
            Newest
          </Button>
          <Button
            variant={sortBy === "popular" ? "default" : "secondary"}
            size="sm"
            onClick={() => setSortBy("popular")}
          >
            Popular
          </Button>
          <Button
            variant={sortBy === "rating" ? "default" : "secondary"}
            size="sm"
            onClick={() => setSortBy("rating")}
          >
            Top Rated
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {publicScans.map((scan) => (
          <Card key={scan.id} className="flex flex-col">
            <CardHeader>
              <CardTitle
                className="text-lg font-medium truncate"
                title={scan.name}
              >
                {scan.name}
              </CardTitle>
              <CardDescription>
                {scan.category} · {scan.avgRating.toFixed(1)}★ ·{" "}
                {scan.runCount.toLocaleString()} runs
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              {scan.description ? (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {scan.description}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {scan.isFeatured ? (
                  <Badge variant="secondary">Featured</Badge>
                ) : null}
                {scan.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openDetails(scan.id)}
              >
                Details
              </Button>
              <Button
                size="sm"
                onClick={() => cloneScan(scan.id)}
                disabled={!isAuthenticated || isCloning}
              >
                <Copy className="mr-2 h-4 w-4" />
                Clone
              </Button>
            </CardFooter>
          </Card>
        ))}
        {publicScans.length === 0 ? (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No public scans found.
          </div>
        ) : null}
      </div>

      <Dialog
        open={isDetailsOpen}
        onOpenChange={(open) => (open ? null : closeDetails())}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scan Details</DialogTitle>
          </DialogHeader>
          {isDetailsLoading ? (
            <div className="flex h-[30vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-lg font-semibold">
                  {detailsData?.data?.name ?? ""}
                </div>
                {detailsData?.data?.description ? (
                  <div className="text-sm text-muted-foreground">
                    {detailsData.data.description}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {detailsData?.data?.category ?? ""}
                </Badge>
                <Badge variant="outline">
                  {(detailsData?.data?.avgRating ?? 0).toFixed(1)}★
                </Badge>
                <Badge variant="outline">
                  {detailsData?.data?.ratingCount ?? 0} ratings
                </Badge>
                <Badge variant="outline">
                  {detailsData?.data?.cloneCount ?? 0} clones
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {(detailsData?.data?.tags ?? []).length > 0 ? (
                    (detailsData?.data?.tags ?? []).map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No tags</div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Symbol Universe</div>
                <div className="text-sm text-muted-foreground">
                  {(detailsData?.data?.symbolUniverse ?? []).length > 0
                    ? `${detailsData?.data?.symbolUniverse.length} symbols`
                    : "No default symbols"}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Definition (raw)</div>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(detailsData?.data?.definition ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => closeDetails()}
              >
                Close
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  selectedScanId
                    ? rateScan({ scanId: selectedScanId, rating: 5 })
                    : null
                }
                disabled={!isAuthenticated || isRating || !selectedScanId}
              >
                <Star className="mr-2 h-4 w-4" />
                Rate 5
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  selectedScanId ? cloneScan(selectedScanId) : null
                }
                disabled={!isAuthenticated || isCloning || !selectedScanId}
              >
                <Copy className="mr-2 h-4 w-4" />
                Clone
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

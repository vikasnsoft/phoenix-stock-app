"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

let queryClient: QueryClient | null = null;

/**
 * Return a singleton QueryClient instance for the application.
 */
const getQueryClient = (): QueryClient => {
  if (!queryClient) {
    queryClient = new QueryClient();
  }
  return queryClient;
};

export interface QueryProvidersProps {
  readonly children: ReactNode;
}

/**
 * QueryProviders wraps the React tree with React Query providers.
 */
export const QueryProviders = ({
  children,
}: QueryProvidersProps) => {
  const client = getQueryClient();

  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

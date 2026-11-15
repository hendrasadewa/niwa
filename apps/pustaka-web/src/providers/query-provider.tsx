"use client";

import * as React from "react";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof ApiError) {
              if (error.status === 401) {
                toast({
                  variant: "destructive",
                  title: "Session expired",
                  description: "Please sign in again to continue.",
                });
              } else if (error.status === 400) {
                toast({
                  variant: "destructive",
                  title: "Invalid request",
                  description: error.message,
                });
              }
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            // Only fire global toast if the mutation doesn't define its own onError handler
            if (!mutation.options.onError && error instanceof ApiError) {
              toast({
                variant: "destructive",
                title:
                  error.status === 400 ? "Validation Error" : "Request Failed",
                description: error.message,
              });
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (
                error instanceof ApiError &&
                (error.status === 400 ||
                  error.status === 401 ||
                  error.status === 403 ||
                  error.status === 404)
              ) {
                return false;
              }
              return failureCount < 1;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}

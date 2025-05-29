import {
  QueryClient,
  QueryClientProvider,
  MutationCache,
  QueryCache,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PokemonAPIError } from "../services/api";
import logger from "../utils/logger";

// Create QueryClient with optimized configuration
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Global defaults for all queries
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 30 * 60 * 1000, // 30 minutes
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (
            error instanceof PokemonAPIError &&
            error.status >= 400 &&
            error.status < 500
          ) {
            return false;
          }
          // Retry up to 3 times for network errors and 5xx errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        // Prevent background refetches when data is fresh
        refetchOnMount: "always",
      },
      mutations: {
        // Global defaults for mutations
        retry: 1,
        retryDelay: 1000,
      },
    },
    // Global error handlers with proper cache instances
    mutationCache: new MutationCache({
      onError: (error) => {
        logger.error("Mutation error:", error);
        // Could integrate with toast notifications here
      },
    }),
    queryCache: new QueryCache({
      onError: (error, query) => {
        logger.error("Query error:", error, "Query key:", query.queryKey);
        // Could integrate with global error handling here
      },
    }),
  });
};

// Singleton QueryClient instance
let queryClient;

const getQueryClient = () => {
  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
};

export const QueryProvider = ({ children }) => {
  const client = getQueryClient();

  return (
    <QueryClientProvider client={client}>
      {children}
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      )}
    </QueryClientProvider>
  );
};

// Export client for direct access if needed
export { getQueryClient };

import { QUERY_DEFAULTS } from '../constants';
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_DEFAULTS.STALE_TIME,
      retry: QUERY_DEFAULTS.RETRY_COUNT,
      refetchOnWindowFocus: QUERY_DEFAULTS.REFETCH_ON_WINDOW_FOCUS,
    },
  },
});

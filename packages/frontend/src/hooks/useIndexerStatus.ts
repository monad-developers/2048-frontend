import { useState, useEffect, useCallback } from 'react';
import { getGraphQLClient } from '@/lib/graphql/client';
import { GET_INDEXER_STATUS } from '@/lib/graphql/queries';
import type { IndexerStatus, IndexerStatusQueryResponse } from '@/lib/graphql/types';

const CHAIN_ID = 143; // Monad Mainnet
const POLL_INTERVAL = 30000; // 30 seconds

export function useIndexerStatus() {
  const [status, setStatus] = useState<IndexerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const client = getGraphQLClient();
      const data = await client.request<IndexerStatusQueryResponse>(
        GET_INDEXER_STATUS,
        { chainId: CHAIN_ID }
      );

      setStatus(data.IndexerStatus[0] || null);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll status less frequently than leaderboard
    const interval = setInterval(fetchStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}

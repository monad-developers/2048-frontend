import { useState, useEffect, useCallback, useRef } from 'react';
import { getGraphQLClient } from '@/lib/graphql/client';
import { GET_LEADERBOARD } from '@/lib/graphql/queries';
import type { LeaderboardEntry, LeaderboardState, LeaderboardQueryResponse } from '@/lib/graphql/types';
import { useIndexerStatus } from './useIndexerStatus';

const POLL_INTERVAL = 5000; // 5 seconds

interface UseLeaderboardOptions {
  currentPlayerAddress?: string;
}

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const { currentPlayerAddress } = options;
  const { status: indexerStatus } = useIndexerStatus();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [state, setState] = useState<LeaderboardState>('loading');
  const [error, setError] = useState<Error | null>(null);
  const previousEntriesRef = useRef<LeaderboardEntry[]>([]);
  const isFirstFetch = useRef(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const client = getGraphQLClient();
      const data = await client.request<LeaderboardQueryResponse>(
        GET_LEADERBOARD,
        { limit: 10 }
      );

      const games = data.Game || [];

      // Determine state based on data and indexer status
      if (games.length === 0) {
        if (indexerStatus?.isBackfilling) {
          setState('syncing');
        } else if (indexerStatus?.totalGamesIndexed === 0) {
          setState('empty');
        } else {
          setState('ready'); // Has games but none in top 10 (unlikely)
        }
        setEntries([]);
        return;
      }

      // Enrich entries with computed fields
      const enrichedEntries = games.map((game, index) => ({
        ...game,
        rank: index + 1,
        isNew: !isFirstFetch.current &&
               !previousEntriesRef.current.some(e => e.id === game.id),
        isCurrentPlayer: currentPlayerAddress
          ? game.player.toLowerCase() === currentPlayerAddress.toLowerCase()
          : false,
      }));

      previousEntriesRef.current = enrichedEntries;
      isFirstFetch.current = false;
      setEntries(enrichedEntries);
      setState(indexerStatus?.isBackfilling ? 'syncing' : 'ready');
      setError(null);
    } catch (err) {
      setError(err as Error);
      setState('error');
    }
  }, [currentPlayerAddress, indexerStatus]);

  // Fetch on mount
  useEffect(() => {
    isFirstFetch.current = true;
    setState('loading');
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for updates (pause when tab hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchLeaderboard();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchLeaderboard();
      }
    }, POLL_INTERVAL);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchLeaderboard]);

  return {
    entries,
    state,
    error,
    refetch: fetchLeaderboard,
    indexerStatus
  };
}

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Flame, Fuel, Zap, Loader2 } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { LeaderboardSkeleton } from './LeaderboardSkeleton';
import { LeaderboardEmpty } from './LeaderboardEmpty';
import { LeaderboardSyncing } from './LeaderboardSyncing';
import { LeaderboardError } from './LeaderboardError';
import {
  formatAddress,
  formatScore,
  formatGas,
  formatMonBurned
} from '@/lib/format';

interface LeaderboardProps {
  currentPlayerAddress?: string;
}

function getRankDisplay(rank: number) {
  switch (rank) {
    case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
    case 2: return <Medal className="w-5 h-5 text-gray-400" />;
    case 3: return <Medal className="w-5 h-5 text-amber-600" />;
    default: return (
      <span className="w-5 text-center font-bold text-gray-400 text-sm">
        {rank}
      </span>
    );
  }
}

function getTileColorClass(tile: number): string {
  const colors: Record<number, string> = {
    2: 'bg-purple-100 text-purple-800',
    4: 'bg-purple-200 text-purple-800',
    8: 'bg-purple-300 text-purple-900',
    16: 'bg-purple-400 text-white',
    32: 'bg-purple-500 text-white',
    64: 'bg-purple-600 text-white',
    128: 'bg-yellow-400 text-yellow-900',
    256: 'bg-yellow-500 text-white',
    512: 'bg-orange-500 text-white',
    1024: 'bg-orange-600 text-white',
    2048: 'bg-red-500 text-white',
    4096: 'bg-red-600 text-white',
    8192: 'bg-red-700 text-white',
  };
  return colors[tile] || 'bg-purple-700 text-white';
}

export function Leaderboard({ currentPlayerAddress }: LeaderboardProps) {
  const { entries, state, error, refetch, indexerStatus } = useLeaderboard({
    currentPlayerAddress,
  });

  return (
    <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg p-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-purple-700 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Top 10 High Scores
        </h2>
        {state === 'ready' && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </div>
        )}
        {state === 'syncing' && (
          <div className="flex items-center gap-1 text-xs text-purple-600">
            <Loader2 className="w-3 h-3 animate-spin" />
            Syncing
          </div>
        )}
      </div>

      {/* Content based on state */}
      {state === 'loading' && <LeaderboardSkeleton />}

      {state === 'empty' && <LeaderboardEmpty />}

      {state === 'syncing' && entries.length === 0 && (
        <LeaderboardSyncing
          totalGamesIndexed={indexerStatus?.totalGamesIndexed}
          lastBlock={indexerStatus?.lastIndexedBlock}
        />
      )}

      {state === 'error' && error && (
        <LeaderboardError error={error} onRetry={refetch} />
      )}

      {/* Leaderboard entries */}
      {(state === 'ready' || (state === 'syncing' && entries.length > 0)) && (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                layout
                initial={entry.isNew ? { opacity: 0, x: -20, scale: 0.95 } : false}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
                className={`
                  relative p-3 rounded-lg transition-colors
                  ${entry.isCurrentPlayer
                    ? 'bg-purple-100 ring-2 ring-purple-400'
                    : entry.rank && entry.rank <= 3
                      ? 'bg-gradient-to-r from-purple-50 to-white'
                      : 'bg-gray-50'
                  }
                  ${entry.isNew ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}
                `}
              >
                {/* New entry badge */}
                {entry.isNew && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded-full"
                  >
                    NEW
                  </motion.div>
                )}

                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="shrink-0 w-6 flex justify-center">
                    {getRankDisplay(entry.rank!)}
                  </div>

                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-700 truncate">
                        {formatAddress(entry.player)}
                      </span>
                      {entry.isCurrentPlayer && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-600 text-white rounded-full font-medium">
                          YOU
                        </span>
                      )}
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {entry.moveCount} moves
                      </span>
                      <span className="flex items-center gap-1">
                        <Fuel className="w-3 h-3" />
                        {formatGas(entry.totalGasUsed)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {formatMonBurned(entry.totalMonBurned)}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex flex-col items-end gap-1">
                    <motion.div
                      className="text-lg font-bold text-purple-700"
                      initial={entry.isNew ? { scale: 0 } : false}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.1 }}
                    >
                      {formatScore(entry.score)}
                    </motion.div>
                    <div className={`
                      px-2 py-0.5 rounded text-xs font-bold
                      ${getTileColorClass(entry.highestTile)}
                    `}>
                      {entry.highestTile}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

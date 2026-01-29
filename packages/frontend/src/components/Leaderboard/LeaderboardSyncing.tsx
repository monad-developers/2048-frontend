import { Loader2, Database } from 'lucide-react';

interface LeaderboardSyncingProps {
  totalGamesIndexed?: number;
  lastBlock?: string;
}

export function LeaderboardSyncing({
  totalGamesIndexed = 0,
  lastBlock
}: LeaderboardSyncingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="relative mb-3">
        <Database className="w-12 h-12 text-purple-300" />
        <Loader2 className="w-6 h-6 text-purple-600 absolute -bottom-1 -right-1 animate-spin" />
      </div>
      <h3 className="font-semibold text-gray-600 mb-1">Syncing Data</h3>
      <p className="text-sm text-gray-500 mb-2">
        Indexing historical games...
      </p>
      <div className="text-xs text-gray-400 space-y-1">
        <p>{totalGamesIndexed.toLocaleString()} games indexed</p>
        {lastBlock && <p>Block #{Number(lastBlock).toLocaleString()}</p>}
      </div>
    </div>
  );
}

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface LeaderboardErrorProps {
  error: Error;
  onRetry: () => void;
}

export function LeaderboardError({ error, onRetry }: LeaderboardErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertTriangle className="w-12 h-12 text-red-400 mb-3" />
      <h3 className="font-semibold text-gray-600 mb-1">Failed to Load</h3>
      <p className="text-sm text-gray-500 mb-3">
        {error.message || 'Unable to fetch leaderboard data'}
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}

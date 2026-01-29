import { Gamepad2 } from 'lucide-react';

export function LeaderboardEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Gamepad2 className="w-12 h-12 text-gray-300 mb-3" />
      <h3 className="font-semibold text-gray-600 mb-1">No Games Yet</h3>
      <p className="text-sm text-gray-500">
        Be the first to play and claim the #1 spot!
      </p>
    </div>
  );
}

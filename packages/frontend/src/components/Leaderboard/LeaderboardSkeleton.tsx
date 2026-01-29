export function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="w-6 h-6 bg-gray-200 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-3 w-32 bg-gray-100 rounded" />
          </div>
          <div className="w-16 h-8 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

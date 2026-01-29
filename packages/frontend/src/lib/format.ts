/**
 * Format wei to MON with appropriate precision
 */
export function formatMonBurned(weiString: string): string {
  const wei = BigInt(weiString);
  const mon = Number(wei) / 1e18;

  if (mon < 0.0001) {
    return '< 0.0001 MON';
  } else if (mon < 1) {
    return `${mon.toFixed(4)} MON`;
  } else if (mon < 100) {
    return `${mon.toFixed(2)} MON`;
  } else {
    return `${Math.round(mon).toLocaleString()} MON`;
  }
}

/**
 * Format gas used with K/M suffixes
 */
export function formatGas(gasString: string): string {
  const gas = Number(gasString);

  if (gas >= 1_000_000) {
    return `${(gas / 1_000_000).toFixed(1)}M`;
  } else if (gas >= 1_000) {
    return `${(gas / 1_000).toFixed(0)}K`;
  } else {
    return gas.toLocaleString();
  }
}

/**
 * Format address for display
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format score with comma separators
 */
export function formatScore(score: number): string {
  return score.toLocaleString();
}

/**
 * Format relative time (e.g., "2m ago", "1h ago")
 */
export function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = Number(timestamp) * 1000; // Convert seconds to ms
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

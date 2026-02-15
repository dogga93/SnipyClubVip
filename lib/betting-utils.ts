export function formatOdds(odds: number): string {
  return odds.toFixed(2);
}

export function impliedProbability(odds: number): number {
  return (1 / odds) * 100;
}

export function calculateEdge(modelProb: number, odds: number): number {
  const implied = impliedProbability(odds);
  return modelProb - implied;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getEdgeColor(edge: number): string {
  if (edge > 4) return 'text-emerald-400';
  if (edge > 2) return 'text-cyan-400';
  if (edge > 0) return 'text-blue-400';
  if (edge > -2) return 'text-gray-400';
  return 'text-rose-400';
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'from-emerald-500 to-cyan-500';
  if (confidence >= 60) return 'from-cyan-500 to-blue-500';
  if (confidence >= 40) return 'from-blue-500 to-purple-500';
  return 'from-purple-500 to-pink-500';
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours < 24) {
    return `${hours}h ${minutes}m`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'inplay':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'scheduled':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'ended':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    default:
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
}

import { usePeer } from '../../stores/peer-store';

export function PeerIndicator() {
  const { peerCount, isConnected } = usePeer();

  if (!isConnected) return null;

  return (
    <span
      className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
        peerCount > 0
          ? 'text-success bg-success/10 border border-success/20'
          : 'text-text-muted bg-surface-light border border-border'
      }`}
      title={`${peerCount} peer${peerCount !== 1 ? 's' : ''} connected via WebRTC`}
    >
      {peerCount > 0 ? `${peerCount} peer${peerCount !== 1 ? 's' : ''}` : 'p2p'}
    </span>
  );
}

interface Props {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
}

export function RiskBadge({ level }: Props) {
  const styles = {
    HIGH: 'bg-danger/15 text-danger border-danger/25',
    MEDIUM: 'bg-warning/15 text-warning border-warning/25',
    LOW: 'bg-success/15 text-success border-success/25',
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-px rounded text-[10px] font-mono font-semibold border ${styles[level]}`}>
      {level}
    </span>
  );
}

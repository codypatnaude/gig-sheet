import type { ConnectionStatus as Status } from '../../hooks/useSocket.js';
import styles from './ConnectionStatus.module.css';

interface Props {
  status: Status;
}

const LABELS: Record<Status, string> = {
  connecting: 'Connecting…',
  connected: 'Connected',
  reconnecting: 'Reconnecting…',
  offline: 'Offline',
};

export function ConnectionStatus({ status }: Props) {
  return (
    <div className={`${styles.root} ${styles[status]}`}>
      <span className={styles.dot} />
      <span className={styles.label}>{LABELS[status]}</span>
    </div>
  );
}

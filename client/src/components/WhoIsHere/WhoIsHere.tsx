import type { Member } from '@gig-sheets/shared';
import styles from './WhoIsHere.module.css';

const ROLE_COLORS: Record<string, string> = {
  Guitar: 'var(--color-role-guitar)',
  Bass:   'var(--color-role-bass)',
  Drums:  'var(--color-role-drums)',
  Vocals: 'var(--color-role-vocals)',
  Keys:   'var(--color-role-keys)',
  Other:  'var(--color-role-other)',
};

interface Props {
  members: Member[];
}

export function WhoIsHere({ members }: Props) {
  return (
    <div className={styles.root}>
      <h3 className={styles.heading}>Who's Here ({members.length})</h3>
      <ul className={styles.list}>
        {members.map((m) => (
          <li key={m.socket_id} className={styles.member}>
            <span
              className={styles.roleDot}
              style={{ background: ROLE_COLORS[m.role] ?? 'var(--color-role-other)' }}
            />
            <span className={styles.name}>{m.name}</span>
            <span className={styles.role}>{m.role}</span>
          </li>
        ))}
        {members.length === 0 && (
          <li className={styles.empty}>No one here yet</li>
        )}
      </ul>
    </div>
  );
}

import { useState } from 'react';
import type { Song } from '@gig-sheets/shared';
import type { ChartRole } from '@gig-sheets/shared';
import { CHART_ROLES } from '@gig-sheets/shared';
import styles from './MigrationPrompt.module.css';

const ROLE_LABELS: Record<ChartRole, string> = {
  guitar: 'Guitar',
  bass: 'Bass',
  drums: 'Drums',
  vocals: 'Vocals',
  keys: 'Keys',
  other: 'Other',
};

interface Props {
  song: Song;
  onMigrate: (sourceRole: ChartRole) => void;
  onDismiss: () => void;
}

export function MigrationPrompt({ song, onMigrate, onDismiss }: Props) {
  const populated = CHART_ROLES.filter((r) => {
    const field = `chart_${r}` as keyof Song;
    const val = song[field];
    return typeof val === 'string' && val.trim().length > 0;
  });

  const [selected, setSelected] = useState<ChartRole | null>(
    populated.length === 1 ? (populated[0] ?? null) : null
  );

  return (
    <div className={styles.overlay} onClick={onDismiss}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Update "{song.title}"</h2>
        <p className={styles.body}>
          This song uses the old per-role chart format. Choose one role's chart to become
          the shared master chart. Other charts will be discarded.
        </p>

        {populated.length === 0 ? (
          <p className={styles.empty}>No chart content found — the master chart will be empty.</p>
        ) : (
          <div className={styles.roleList}>
            {populated.map((r) => (
              <label key={r} className={styles.roleOption}>
                <input
                  type="radio"
                  name="source_role"
                  value={r}
                  checked={selected === r}
                  onChange={() => setSelected(r)}
                />
                <span>{ROLE_LABELS[r]}</span>
              </label>
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onDismiss}>
            Not now
          </button>
          <button
            className={styles.migrateBtn}
            onClick={() => selected && onMigrate(selected)}
            disabled={populated.length > 0 && !selected}
          >
            Use {selected ? ROLE_LABELS[selected] : '…'} Chart
          </button>
        </div>
      </div>
    </div>
  );
}

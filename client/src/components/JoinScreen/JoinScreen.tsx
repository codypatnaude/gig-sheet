import { useState } from 'react';
import type { Role } from '@gig-sheets/shared';
import { ROLES } from '@gig-sheets/shared';
import styles from './JoinScreen.module.css';

interface Props {
  onJoin: (name: string, role: Role) => void;
}

export function JoinScreen({ onJoin }: Props) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    if (trimmed.length > 30) {
      setError('Name must be 30 characters or fewer');
      return;
    }
    if (!role) {
      setError('Please select your instrument');
      return;
    }
    setError('');
    onJoin(trimmed, role);
  };

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <h1 className={styles.title}>GigSheet</h1>
        <p className={styles.subtitle}>Join the session</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Your name
            <input
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cody"
              maxLength={30}
              autoFocus
              autoComplete="off"
            />
            <span className={styles.charCount}>{name.length}/30</span>
          </label>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Your instrument</legend>
            <div className={styles.roleGrid}>
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`${styles.roleBtn} ${role === r ? styles.selected : ''}`}
                  onClick={() => setRole(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </fieldset>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.joinBtn}>
            Join Session
          </button>
        </form>
      </div>
    </div>
  );
}

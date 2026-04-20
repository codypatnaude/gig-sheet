// [scroll-sync] SongView component — chart display + auto-scroll controls
import { useRef, useState } from 'react';
import type { Song, Role, ScrollSpeed } from '@gig-sheets/shared';
import { CHART_ROLES, SPEED_VALUES } from '@gig-sheets/shared';
import { useAutoScroll } from '../../hooks/useAutoScroll.js';
import type { Socket } from 'socket.io-client';
import styles from './SongView.module.css';

const ROLE_LABELS: Record<string, string> = {
  guitar: 'Guitar',
  bass: 'Bass',
  drums: 'Drums',
  vocals: 'Vocals',
  keys: 'Keys',
  other: 'Other',
};

type ChartField =
  | 'chart_guitar'
  | 'chart_bass'
  | 'chart_drums'
  | 'chart_vocals'
  | 'chart_keys'
  | 'chart_other';

function roleToChartField(role: Role): ChartField {
  return `chart_${role.toLowerCase()}` as ChartField;
}

interface Props {
  song: Song;
  myRole: Role;
  socket: React.MutableRefObject<Socket | null>;
  onBack: () => void;
}

export function SongView({ song, myRole, socket, onBack }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isScrolling, speed, startScroll, stopScroll, changeSpeed } = useAutoScroll(
    socket,
    containerRef
  );

  const defaultTab = CHART_ROLES.includes(myRole.toLowerCase() as typeof CHART_ROLES[number])
    ? myRole.toLowerCase()
    : 'guitar';
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  const chartContent = (song[`chart_${activeTab}` as ChartField] ?? '').trim();

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Back to setlist">
          ‹
        </button>
        <div className={styles.songInfo}>
          <h1 className={styles.songTitle}>{song.title}</h1>
          <p className={styles.songMeta}>
            {[song.key, song.tempo ? `${song.tempo} bpm` : null, song.duration]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      {/* Role tabs */}
      <div className={styles.tabs}>
        {CHART_ROLES.map((r) => {
          const hasContent = !!song[`chart_${r}` as ChartField]?.trim();
          return (
            <button
              key={r}
              className={`${styles.tab} ${activeTab === r ? styles.tabActive : ''} ${!hasContent ? styles.tabEmpty : ''}`}
              onClick={() => setActiveTab(r)}
            >
              {ROLE_LABELS[r]}
            </button>
          );
        })}
      </div>

      {/* Chart area */}
      <div className={styles.chartContainer} ref={containerRef}>
        {chartContent ? (
          <pre className={styles.chart}>{chartContent}</pre>
        ) : (
          <div className={styles.noChart}>
            <p>No {ROLE_LABELS[activeTab]} chart</p>
          </div>
        )}
        {/* Scroll padding at bottom so last line isn't hidden by controls */}
        <div style={{ height: '120px' }} />
      </div>

      {/* Auto-scroll controls */}
      <div className={styles.scrollBar}>
        <button
          className={`${styles.scrollToggle} ${isScrolling ? styles.scrollActive : ''}`}
          onClick={() => (isScrolling ? stopScroll() : startScroll(song.id))}
        >
          {isScrolling ? '■ Stop' : '▶ Scroll'}
        </button>

        <div className={styles.speedPicker}>
          {SPEED_VALUES.map((s) => (
            <button
              key={s}
              className={`${styles.speedBtn} ${speed === s ? styles.speedActive : ''}`}
              onClick={() => changeSpeed(s as ScrollSpeed)}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

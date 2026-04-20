import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { Song, NewSong, Member } from '@gig-sheets/shared';
import { SetlistView } from '../components/SetlistView/SetlistView.js';
import { SongEditor } from '../components/SongEditor/SongEditor.js';
import { WhoIsHere } from '../components/WhoIsHere/WhoIsHere.js';
import { ConnectionStatus } from '../components/ConnectionStatus/ConnectionStatus.js';
import type { ConnectionStatus as ConnStatus } from '../hooks/useSocket.js';
import styles from './SetlistPage.module.css';

interface Props {
  socket: React.MutableRefObject<Socket | null>;
  songs: Song[];
  currentSongId: string | null;
  members: Member[];
  connectionStatus: ConnStatus;
  onSelectSong: (id: string) => void;
}

export function SetlistPage({
  socket,
  songs,
  currentSongId,
  members,
  connectionStatus,
  onSelectSong,
}: Props) {
  const [editingSong, setEditingSong] = useState<Song | null | 'new'>(null);
  const [showWho, setShowWho] = useState(false);

  const emit = (event: string, payload?: unknown) => socket.current?.emit(event, payload);

  const handleSave = (data: NewSong | Song) => {
    if ('id' in data) {
      emit('song_update', { song: data });
    } else {
      emit('song_create', { song: data });
    }
    setEditingSong(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this song?')) {
      emit('song_delete', { song_id: id });
    }
  };

  const handleReorder = (orderedIds: string[]) => {
    emit('setlist_reorder', { ordered_ids: orderedIds });
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.appName}>GigSheet</h1>
        <div className={styles.headerActions}>
          <ConnectionStatus status={connectionStatus} />
          <button
            className={`${styles.whoBtn} ${showWho ? styles.whoBtnActive : ''}`}
            onClick={() => setShowWho((v) => !v)}
            aria-label="Who's here"
          >
            👥 {members.length}
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <SetlistView
          songs={songs}
          currentSongId={currentSongId}
          onSelect={onSelectSong}
          onEdit={(song) => setEditingSong(song)}
          onDelete={handleDelete}
          onReorder={handleReorder}
          onAdd={() => setEditingSong('new')}
        />
      </div>

      {showWho && (
        <div className={styles.whoPanel}>
          <WhoIsHere members={members} />
        </div>
      )}

      {editingSong !== null && editingSong === 'new' && (
        <SongEditor onSave={handleSave} onCancel={() => setEditingSong(null)} />
      )}
      {editingSong !== null && editingSong !== 'new' && (
        <SongEditor song={editingSong} onSave={handleSave} onCancel={() => setEditingSong(null)} />
      )}
    </div>
  );
}

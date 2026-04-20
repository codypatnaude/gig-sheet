import { useEffect, useState } from 'react';
import { useSocket } from './hooks/useSocket.js';
import { JoinScreen } from './components/JoinScreen/JoinScreen.js';
import { SetlistPage } from './pages/SetlistPage.js';
import { SongViewPage } from './pages/SongViewPage.js';
import type { Role } from '@gig-sheets/shared';

type Page = 'join' | 'setlist' | 'songview';

export default function App() {
  const { socket, state, join } = useSocket();
  const [page, setPage] = useState<Page>(() => (state.member ? 'setlist' : 'join'));

  const handleJoin = (name: string, role: Role) => {
    join(name, role);
    setPage('setlist');
  };

  // Navigate to song view when currentSongId changes (synced from server)
  const [viewedSongId, setViewedSongId] = useState<string | null>(null);

  useEffect(() => {
    if (state.currentSongId && state.member) {
      setViewedSongId(state.currentSongId);
      setPage('songview');
    }
  }, [state.currentSongId, state.member]);

  const handleSelectSong = (id: string) => {
    socket.current?.emit('song_select', { song_id: id });
  };

  const handleBack = () => {
    setPage('setlist');
  };

  if (page === 'join' || !state.member) {
    return <JoinScreen onJoin={handleJoin} />;
  }

  const currentSong =
    viewedSongId ? state.setlist.find((s) => s.id === viewedSongId) ?? null : null;

  if (page === 'songview' && currentSong) {
    return (
      <SongViewPage
        song={currentSong}
        myRole={state.member.role}
        socket={socket}
        onBack={handleBack}
      />
    );
  }

  return (
    <SetlistPage
      socket={socket}
      songs={state.setlist}
      currentSongId={state.currentSongId}
      members={state.members}
      connectionStatus={state.connectionStatus}
      onSelectSong={handleSelectSong}
    />
  );
}

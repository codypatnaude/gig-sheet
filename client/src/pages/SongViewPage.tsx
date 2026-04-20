import type { Socket } from 'socket.io-client';
import type { Song, Role } from '@gig-sheets/shared';
import { SongView } from '../components/SongView/SongView.js';

interface Props {
  song: Song;
  myRole: Role;
  socket: React.MutableRefObject<Socket | null>;
  onBack: () => void;
}

export function SongViewPage({ song, myRole, socket, onBack }: Props) {
  return <SongView song={song} myRole={myRole} socket={socket} onBack={onBack} />;
}

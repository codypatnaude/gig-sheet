import type { Socket } from 'socket.io-client';
import type { Song, Note, Role } from '@gig-sheets/shared';
import { SongView } from '../components/SongView/SongView.js';

interface Props {
  song: Song;
  notes: Note[];
  myRole: Role;
  socket: React.MutableRefObject<Socket | null>;
  onBack: () => void;
}

export function SongViewPage({ song, notes, myRole, socket, onBack }: Props) {
  return <SongView song={song} notes={notes} myRole={myRole} socket={socket} onBack={onBack} />;
}

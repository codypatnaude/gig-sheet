import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Song } from '@gig-sheets/shared';
import styles from './SetlistView.module.css';

interface RowProps {
  song: Song;
  index: number;
  isActive: boolean;
  onSelect: (id: string) => void;
  onEdit: (song: Song) => void;
  onDelete: (id: string) => void;
}

function SongRow({ song, index, isActive, onSelect, onEdit, onDelete }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: song.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.row} ${isActive ? styles.activeRow : ''}`}
    >
      {/* Drag handle */}
      <button className={styles.dragHandle} {...attributes} {...listeners} aria-label="Reorder">
        ⠿
      </button>

      {/* Position */}
      <span className={styles.position}>{index + 1}</span>

      {/* Main content — tap to open */}
      <button className={styles.rowContent} onClick={() => onSelect(song.id)}>
        <span className={styles.songTitle}>{song.title}</span>
        <span className={styles.songMeta}>
          {[song.key, song.tempo ? `${song.tempo} bpm` : null, song.duration]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </button>

      {/* Edit */}
      <button
        className={styles.actionBtn}
        onClick={(e) => { e.stopPropagation(); onEdit(song); }}
        aria-label="Edit song"
      >
        ✎
      </button>

      {/* Delete */}
      <button
        className={`${styles.actionBtn} ${styles.deleteBtn}`}
        onClick={(e) => { e.stopPropagation(); onDelete(song.id); }}
        aria-label="Delete song"
      >
        ✕
      </button>
    </li>
  );
}

interface Props {
  songs: Song[];
  currentSongId: string | null;
  onSelect: (id: string) => void;
  onEdit: (song: Song) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onAdd: () => void;
}

export function SetlistView({
  songs,
  currentSongId,
  onSelect,
  onEdit,
  onDelete,
  onReorder,
  onAdd,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = songs.findIndex((s) => s.id === active.id);
    const newIndex = songs.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...songs];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved!);
    onReorder(reordered.map((s) => s.id));
  };

  return (
    <div className={styles.root}>
      <div className={styles.listHeader}>
        <span className={styles.count}>{songs.length} song{songs.length !== 1 ? 's' : ''}</span>
        <button className={styles.addBtn} onClick={onAdd}>
          + Add Song
        </button>
      </div>

      {songs.length === 0 && (
        <div className={styles.empty}>
          <p>No songs yet.</p>
          <p>Tap <strong>+ Add Song</strong> to get started.</p>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ol className={styles.list}>
            {songs.map((song, i) => (
              <SongRow
                key={song.id}
                song={song}
                index={i}
                isActive={song.id === currentSongId}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

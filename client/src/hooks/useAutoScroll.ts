// [scroll-sync] Auto-scroll hook — RAF controller loop + receiver sync
import { useRef, useState, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import type { ScrollSpeed, ScrollSyncedPayload } from '@gig-sheets/shared';
import { SPEED_VALUES } from '@gig-sheets/shared';

// Base scroll rate: 2px per frame at 60fps = ~120px/sec at 1.0x speed
const PX_PER_FRAME_BASE = 2;
// Broadcast position every 250ms to avoid flooding the network
const BROADCAST_INTERVAL_MS = 250;

export function useAutoScroll(
  socket: React.MutableRefObject<Socket | null>,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const [isScrolling, setIsScrolling] = useState(false);
  const [speed, setSpeed] = useState<ScrollSpeed>(1.0);

  const rafRef = useRef<number | null>(null);
  const lastBroadcastRef = useRef<number>(0);
  const isScrollingRef = useRef(false);
  const speedRef = useRef<ScrollSpeed>(1.0);
  const songIdRef = useRef<string>('');

  // Keep refs in sync with state
  useEffect(() => {
    isScrollingRef.current = isScrolling;
  }, [isScrolling]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // [scroll-sync] Receive scroll position from controller
  useEffect(() => {
    const sock = socket.current;
    if (!sock) return;

    const onScrollSynced = (payload: ScrollSyncedPayload) => {
      // Only apply if we are NOT the controller
      if (isScrollingRef.current) return;
      const container = containerRef.current;
      if (container) {
        container.scrollTop = payload.position;
      }
    };

    const onScrollStopped = () => {
      if (isScrollingRef.current) return;
      // Nothing to do on the receiver side — position stays where it is
    };

    sock.on('scroll_synced', onScrollSynced);
    sock.on('scroll_stopped', onScrollStopped);
    return () => {
      sock.off('scroll_synced', onScrollSynced);
      sock.off('scroll_stopped', onScrollStopped);
    };
  }, [socket, containerRef]);

  const startScroll = useCallback(
    (songId: string) => {
      const container = containerRef.current;
      if (!container || isScrollingRef.current) return;

      songIdRef.current = songId;
      setIsScrolling(true);
      isScrollingRef.current = true;

      const tick = (timestamp: number) => {
        if (!isScrollingRef.current) return;

        const container = containerRef.current;
        if (!container) return;

        const pxPerFrame = PX_PER_FRAME_BASE * speedRef.current;
        container.scrollTop += pxPerFrame;

        // Broadcast position at BROADCAST_INTERVAL_MS cadence
        if (timestamp - lastBroadcastRef.current >= BROADCAST_INTERVAL_MS) {
          lastBroadcastRef.current = timestamp;
          socket.current?.emit('scroll_update', {
            song_id: songIdRef.current,
            position: container.scrollTop,
            speed: speedRef.current,
          });
        }

        // Stop at bottom
        const atBottom =
          container.scrollTop + container.clientHeight >= container.scrollHeight - 2;
        if (atBottom) {
          stopScroll();
          return;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [socket, containerRef]
  );

  const stopScroll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    isScrollingRef.current = false;
    setIsScrolling(false);
    socket.current?.emit('scroll_stop');
  }, [socket]);

  const changeSpeed = useCallback((newSpeed: ScrollSpeed) => {
    if (!SPEED_VALUES.includes(newSpeed)) return;
    setSpeed(newSpeed);
    speedRef.current = newSpeed;
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return { isScrolling, speed, startScroll, stopScroll, changeSpeed };
}

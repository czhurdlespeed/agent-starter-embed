'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { motion } from 'motion/react';
import { RoomAudioRenderer, RoomContext, StartAudio } from '@livekit/components-react';
import { ErrorMessage } from '@/components/embed-popup/error-message';
import { PopupView } from '@/components/embed-popup/popup-view';
import { Trigger } from '@/components/embed-popup/trigger';
import useConnectionDetails from '@/hooks/use-connection-details';
import { type AppConfig, EmbedErrorDetails } from '@/lib/types';
import { cn } from '@/lib/utils';

const PopupViewMotion = motion.create(PopupView);

const POPUP_WIDTH_MOBILE = 140;
const POPUP_WIDTH_DESKTOP = 224;
const POPUP_HEIGHT_MOBILE = 180;
const POPUP_HEIGHT_DESKTOP = 288;

const TRIGGER_WIDTH_MOBILE = 140;
const TRIGGER_WIDTH_DESKTOP = 224;
const TRIGGER_HEIGHT_MOBILE = 180;
const TRIGGER_HEIGHT_DESKTOP = 288;

export type EmbedFixedAgentClientProps = {
  appConfig: AppConfig;
};

function resolveUserId(appConfig: AppConfig): string | undefined {
  // 1) Prefer explicit user id passed via script tag (if present in this environment)
  if (typeof document !== 'undefined') {
    const scriptTag = document.querySelector<HTMLScriptElement>('script[data-lk-user-id]');
    const scriptUserId = scriptTag?.dataset.lkUserId;
    if (scriptUserId && scriptUserId.trim().length > 0) {
      return scriptUserId.trim();
    }
  }

  // 2) Fallback to user id from app config (e.g. iframe embed using URL param)
  return appConfig.userData?.user_id;
}

async function checkUserApproved(userId?: string): Promise<boolean> {
  // If there's no user id, treat as not approved
  if (!userId) {
    return false;
  }

  try {
    const res = await fetch('/api/is-user-approved', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!res.ok) {
      // Non-2xx (e.g. 4xx/5xx) -> treat as not approved
      return false;
    }

    const data = (await res.json()) as { approved?: boolean };
    return Boolean(data.approved);
  } catch {
    // Network / server error -> fail closed and do not start the agent
    return false;
  }
}

function AgentClient({ appConfig }: EmbedFixedAgentClientProps) {
  const isAnimating = useRef(false);
  const room = useMemo(() => new Room(), []);
  const [popupOpen, setPopupOpen] = useState(false);
  const [error, setError] = useState<EmbedErrorDetails | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [triggerPosition, setTriggerPosition] = useState<{ x: number; y: number } | null>(null);
  const [hasBeenInCall, setHasBeenInCall] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const triggerDragRef = useRef<{
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    pointerId: number;
  } | null>(null);
  const isTriggerDraggingRef = useRef(false);
  const triggerWrapperRef = useRef<HTMLDivElement>(null);
  const { clearConnectionDetails, existingOrRefreshConnectionDetails } =
    useConnectionDetails(appConfig);

  const handleTogglePopup = useCallback((positionWhenOpening?: { x: number; y: number }) => {
    if (isAnimating.current) {
      // prevent re-opening before room has disconnected
      return;
    }

    setError(null);
    setPopupOpen((open) => {
      if (open) {
        setPopupPosition(null);
      } else if (positionWhenOpening) {
        setPopupPosition(positionWhenOpening);
      } else {
        setPopupPosition(null);
      }
      return !open;
    });
  }, []);

  const handlePanelAnimationStart = () => {
    isAnimating.current = true;
  };

  const handlePanelAnimationComplete = () => {
    isAnimating.current = false;
    if (!popupOpen && room.state !== 'disconnected') {
      room.disconnect();
    }
  };

  useEffect(() => {
    const onConnected = () => {
      setHasBeenInCall(true);
      setIsAgentConnected(true);
    };
    const onDisconnected = () => {
      setPopupOpen(false);
      setIsAgentConnected(false);
      clearConnectionDetails();
    };
    const onMediaDevicesError = (error: Error) => {
      setError({
        title: 'Encountered an error with your media devices',
        description: `${error.name}: ${error.message}`,
      });
    };
    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.MediaDevicesError, onMediaDevicesError);
    room.on(RoomEvent.Disconnected, onDisconnected);
    if (room.state === 'connected') {
      setHasBeenInCall(true);
      setIsAgentConnected(true);
    }
    return () => {
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.MediaDevicesError, onMediaDevicesError);
    };
  }, [room, clearConnectionDetails]);

  useEffect(() => {
    if (!popupOpen) {
      return;
    }
    if (room.state !== 'disconnected') {
      return;
    }

    const connect = async () => {
      Promise.all([
        room.localParticipant.setMicrophoneEnabled(true, undefined, {
          preConnectBuffer: appConfig.isPreConnectBufferEnabled,
        }),
        existingOrRefreshConnectionDetails().then((connectionDetails) =>
          room.connect(connectionDetails.serverUrl, connectionDetails.participantToken)
        ),
      ]).catch((error) => {
        if (error instanceof Error) {
          console.error('Error connecting to agent:', error);
          setError({
            title: 'There was an error connecting to the agent',
            description: `${error.name}: ${error.message}`,
          });
        }
      });
    };

    connect();
  }, [room, popupOpen, existingOrRefreshConnectionDetails, appConfig.isPreConnectBufferEnabled]);

  const getInitialPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 16, y: 16 };
    const padding = 16;
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    const w = isDesktop ? POPUP_WIDTH_DESKTOP : POPUP_WIDTH_MOBILE;
    const h = isDesktop ? POPUP_HEIGHT_DESKTOP : POPUP_HEIGHT_MOBILE;
    return {
      x: window.innerWidth - w - padding,
      y: window.innerHeight - h - padding,
    };
  }, []);

  const handleTriggerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-no-drag]')) return;
      const wrapperEl = e.currentTarget as HTMLElement;
      let startLeft: number;
      let startTop: number;
      if (triggerPosition) {
        startLeft = triggerPosition.x;
        startTop = triggerPosition.y;
      } else {
        const rect = wrapperEl.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
      }
      const pointerId = e.pointerId;
      triggerDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startLeft,
        startTop,
        pointerId,
      };
      const onMove = (ev: PointerEvent) => {
        if (!triggerDragRef.current || ev.pointerId !== triggerDragRef.current.pointerId) return;
        const dx = ev.clientX - triggerDragRef.current.startX;
        const dy = ev.clientY - triggerDragRef.current.startY;
        if (!isTriggerDraggingRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
          isTriggerDraggingRef.current = true;
          wrapperEl.setPointerCapture?.(pointerId);
        }
        if (isTriggerDraggingRef.current) {
          const isDesktop = window.matchMedia('(min-width: 768px)').matches;
          const w = isDesktop ? TRIGGER_WIDTH_DESKTOP : TRIGGER_WIDTH_MOBILE;
          const h = isDesktop ? TRIGGER_HEIGHT_DESKTOP : TRIGGER_HEIGHT_MOBILE;
          let x = triggerDragRef.current.startLeft + dx;
          let y = triggerDragRef.current.startTop + dy;
          x = Math.max(0, Math.min(x, window.innerWidth - w));
          y = Math.max(0, Math.min(y, window.innerHeight - h));
          setTriggerPosition({ x, y });
        }
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointerleave', onUp);
        triggerDragRef.current = null;
        requestAnimationFrame(() => {
          isTriggerDraggingRef.current = false;
        });
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointerleave', onUp);
    },
    [triggerPosition]
  );

  useEffect(() => {
    if (!triggerPosition) return;
    const clamp = () => {
      setTriggerPosition((pos) => {
        if (!pos) return null;
        const isDesktop = window.matchMedia('(min-width: 768px)').matches;
        const w = isDesktop ? TRIGGER_WIDTH_DESKTOP : TRIGGER_WIDTH_MOBILE;
        const h = isDesktop ? TRIGGER_HEIGHT_DESKTOP : TRIGGER_HEIGHT_MOBILE;
        const maxX = window.innerWidth - w;
        const maxY = window.innerHeight - h;
        const x = Math.max(0, Math.min(pos.x, maxX));
        const y = Math.max(0, Math.min(pos.y, maxY));
        return x === pos.x && y === pos.y ? pos : { x, y };
      });
    };
    window.addEventListener('resize', clamp);
    clamp();
    return () => window.removeEventListener('resize', clamp);
  }, [triggerPosition]);

  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!popupOpen) return;
    const clamp = () => {
      if (popupPosition) {
        setPopupPosition((pos) => {
          if (!pos) return null;
          const isDesktop = window.matchMedia('(min-width: 768px)').matches;
          const w = isDesktop ? POPUP_WIDTH_DESKTOP : POPUP_WIDTH_MOBILE;
          const h = isDesktop ? POPUP_HEIGHT_DESKTOP : POPUP_HEIGHT_MOBILE;
          const maxX = window.innerWidth - w;
          const maxY = window.innerHeight - h;
          const x = Math.max(0, Math.min(pos.x, maxX));
          const y = Math.max(0, Math.min(pos.y, maxY));
          return x === pos.x && y === pos.y ? pos : { x, y };
        });
      } else {
        forceUpdate();
      }
    };
    window.addEventListener('resize', clamp);
    clamp();
    return () => window.removeEventListener('resize', clamp);
  }, [popupOpen, popupPosition]);

  const handleTriggerClick = useCallback(async () => {
    if (isTriggerDraggingRef.current) return;

    // Only allow opening / connecting if the user is approved in the database.
    const userId = resolveUserId(appConfig);
    const approved = await checkUserApproved(userId);

    if (!approved) {
      // Not approved: do nothing. The trigger's video button will continue looping.
      return;
    }

    let positionWhenOpening: { x: number; y: number } | undefined;
    if (triggerPosition) {
      positionWhenOpening = triggerPosition;
    } else {
      const rect = triggerWrapperRef.current?.getBoundingClientRect();
      if (rect) {
        positionWhenOpening = { x: rect.left, y: rect.top };
      }
    }
    handleTogglePopup(positionWhenOpening);
  }, [triggerPosition, handleTogglePopup, appConfig]);

  const handlePopupDragStart = useCallback(
    (e: React.PointerEvent) => {
      // Don't start drag when clicking on interactive elements
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, textarea, [role="button"], [role="menuitem"]')) {
        return;
      }
      e.preventDefault();
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture?.(e.pointerId);
      const pos = popupPosition ?? getInitialPosition();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startLeft: pos.x,
        startTop: pos.y,
      };
    },
    [popupPosition, getInitialPosition]
  );

  const handlePopupDragEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const isDesktop = window.matchMedia('(min-width: 768px)').matches;
      const w = isDesktop ? POPUP_WIDTH_DESKTOP : POPUP_WIDTH_MOBILE;
      const h = isDesktop ? POPUP_HEIGHT_DESKTOP : POPUP_HEIGHT_MOBILE;
      let x = dragRef.current.startLeft + dx;
      let y = dragRef.current.startTop + dy;
      x = Math.max(0, Math.min(x, window.innerWidth - w));
      y = Math.max(0, Math.min(y, window.innerHeight - h));
      setPopupPosition({ x, y });
    };
    const handlePointerUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointerleave', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointerleave', handlePointerUp);
    };
  }, []);

  const position = popupPosition ?? getInitialPosition();

  return (
    <RoomContext.Provider value={room}>
      <RoomAudioRenderer />
      <StartAudio label="Start Audio" />

      {!popupOpen && (
        <div
          ref={triggerWrapperRef}
          className={cn(
            'fixed z-50 cursor-grab touch-none active:cursor-grabbing',
            !triggerPosition && 'right-4 bottom-4'
          )}
          style={
            triggerPosition
              ? {
                  left: triggerPosition.x,
                  top: triggerPosition.y,
                  right: 'auto',
                  bottom: 'auto',
                }
              : undefined
          }
          onPointerDown={handleTriggerPointerDown}
        >
          <Trigger
            error={error}
            popupOpen={popupOpen}
            onToggle={handleTriggerClick}
            startVideoMuted={hasBeenInCall}
          />
        </div>
      )}

      <motion.div
        inert={!popupOpen}
        initial={{
          opacity: 0,
          translateY: 8,
        }}
        animate={{
          opacity: popupOpen ? 1 : 0,
          translateY: popupOpen ? 0 : 8,
        }}
        transition={{
          type: 'spring',
          bounce: 0,
          duration: popupOpen ? 0.25 : 0.2,
        }}
        onAnimationStart={handlePanelAnimationStart}
        onAnimationComplete={handlePanelAnimationComplete}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 60,
        }}
        className="w-[140px] md:w-[224px]"
      >
        <div
          className="bg-bg1 dark:bg-bg2 border-separator1 dark:border-separator2 relative h-[180px] w-[140px] cursor-grab touch-none overflow-hidden rounded-xl border border-solid drop-shadow-md active:cursor-grabbing md:h-[288px] md:w-[224px]"
          onPointerDown={handlePopupDragStart}
          onPointerUp={handlePopupDragEnd}
          onPointerLeave={handlePopupDragEnd}
          role="application"
          aria-label="Agent window, drag to move"
        >
          <div className="absolute inset-0">
            <ErrorMessage error={error} />
            {!error && (
              <PopupViewMotion
                appConfig={appConfig}
                initial={{ opacity: 1 }}
                animate={{ opacity: error === null ? 1 : 0 }}
                transition={{
                  type: 'linear',
                  duration: 0.2,
                }}
                disabled={!popupOpen}
                sessionStarted={popupOpen}
                onEmbedError={setError}
                onAgentTimeout={handleTogglePopup}
                className="absolute inset-0"
              />
            )}
          </div>
        </div>
      </motion.div>
    </RoomContext.Provider>
  );
}

export default AgentClient;

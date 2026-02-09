'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SpeakerHighIcon, SpeakerSlashIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const WELCOME_VIDEO_URL = process.env.NEXT_PUBLIC_WELCOME_VIDEO_URL ?? '/welcome-video.mp4';

interface VideoButtonProps {
  onClick?: () => void;
  className?: string;
  /** Video plays with audio first time, then loops silently. Falls back to muted if autoplay blocked. */
  audioOnFirstPlay?: boolean;
  /** Render as div (for use inside another button); parent handles click */
  asChild?: boolean;
  /** Start muted (e.g. when reappearing after ending a call) */
  startMuted?: boolean;
}

/**
 * Video button that plays with audio on first play, then loops without audio.
 * Uses a single video element with an ended-event handler for efficiency.
 * Note: Browsers often block autoplay with audio; video will start muted and loop until user interaction.
 */
export function VideoButton({
  onClick,
  className,
  audioOnFirstPlay = true,
  asChild = false,
  startMuted = false,
}: VideoButtonProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPlayedWithAudio, setHasPlayedWithAudio] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isMuted, setIsMuted] = useState(startMuted);

  useEffect(() => {
    if (startMuted) setIsMuted(true);
  }, [startMuted]);

  const handleEnded = useCallback(() => {
    const video = videoRef.current;
    if (!video || !audioOnFirstPlay) return;

    setHasPlayedWithAudio(true);
    setIsMuted(true);
    video.muted = true;
    video.loop = true;
    video.currentTime = 0;
    video.play().catch(() => {});
  }, [audioOnFirstPlay]);

  const playWithAudio = audioOnFirstPlay && !hasPlayedWithAudio && !autoplayBlocked && !isMuted;

  const performMuteToggle = useCallback(() => {
    const video = videoRef.current;
    if (isMuted) {
      setIsMuted(false);
      if (video) {
        video.muted = false;
        if (!hasPlayedWithAudio) {
          video.loop = false;
          video.play().catch(() => setIsMuted(true));
        }
      }
    } else {
      setIsMuted(true);
      if (video) {
        video.muted = true;
      }
    }
  }, [isMuted, hasPlayedWithAudio]);

  const handleMuteToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      performMuteToggle();
    },
    [performMuteToggle]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !playWithAudio;
    video.loop = !playWithAudio;
  }, [playWithAudio]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !audioOnFirstPlay) return;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        setAutoplayBlocked(true);
        setIsMuted(true);
        video.muted = true;
        video.loop = true;
        video.play().catch(() => {});
      });
    }
  }, [audioOnFirstPlay]);

  const commonClasses = cn(
    'relative overflow-hidden rounded-lg',
    !asChild && 'cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95',
    !asChild && 'focus:outline-none focus:ring-2 focus:ring-[#FF8200] focus:ring-offset-2',
    className
  );

  if (loadError) {
    const Fallback = asChild ? 'div' : 'button';
    return (
      <Fallback
        {...(!asChild && { type: 'button', onClick, 'aria-label': 'Join the call' })}
        className={cn(
          'bg-fgAccent flex items-center justify-center text-white',
          'rounded-lg px-4 py-2 text-sm font-semibold',
          !asChild && 'cursor-pointer transition-opacity hover:opacity-90',
          className
        )}
      >
        Join the call
      </Fallback>
    );
  }

  const Wrapper = asChild ? 'div' : 'button';
  return (
    <Wrapper
      {...(!asChild && { type: 'button', onClick, 'aria-label': 'Join the call' })}
      className={commonClasses}
    >
      <video
        ref={videoRef}
        src={WELCOME_VIDEO_URL}
        autoPlay
        playsInline
        muted={!playWithAudio}
        loop={!playWithAudio}
        onEnded={handleEnded}
        onError={() => setLoadError(true)}
        className="size-full object-cover"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-1/3 items-center justify-center">
        <span className="rounded bg-[#84cc16] px-2 py-1.5 text-[9px] font-bold text-white shadow-md md:rounded-lg md:px-3 md:py-2 md:text-sm">
          Join the call
        </span>
      </div>
      <div
        role="button"
        tabIndex={0}
        data-no-drag
        onClick={handleMuteToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            performMuteToggle();
          }
        }}
        className="pointer-events-auto absolute top-1 right-1 z-10 cursor-pointer rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70 md:top-2 md:right-2 md:p-1.5"
        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
      >
        {isMuted ? (
          <SpeakerSlashIcon weight="bold" className="size-[11px] md:size-5" />
        ) : (
          <SpeakerHighIcon weight="bold" className="size-[11px] md:size-5" />
        )}
      </div>
    </Wrapper>
  );
}

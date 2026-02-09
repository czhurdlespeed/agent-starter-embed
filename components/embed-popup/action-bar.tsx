'use client';

import * as React from 'react';
import { useCallback } from 'react';
import { Track } from 'livekit-client';
import { BarVisualizer, useRemoteParticipants } from '@livekit/components-react';
import { ChatTextIcon, PhoneDisconnectIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { ChatInput } from '@/components/livekit/chat/chat-input';
import { DeviceSelect } from '@/components/livekit/device-select';
import { TrackToggle } from '@/components/livekit/track-toggle';
import { Toggle } from '@/components/ui/toggle';
import { UseAgentControlBarProps, useAgentControlBar } from '@/hooks/use-agent-control-bar';
import { AppConfig } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface AgentControlBarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    UseAgentControlBarProps {
  capabilities: Pick<AppConfig, 'supportsChatInput' | 'supportsVideoInput' | 'supportsScreenShare'>;
  onChatOpenChange?: (open: boolean) => void;
  onSendMessage?: (message: string) => Promise<void>;
  onDeviceError?: (error: { source: Track.Source; error: Error }) => void;
}

/**
 * A control bar specifically designed for voice assistant interfaces
 */
export function ActionBar({
  controls,
  saveUserChoices = true,
  capabilities,
  className,
  onSendMessage,
  onChatOpenChange,
  onDeviceError,
  ...props
}: AgentControlBarProps) {
  const participants = useRemoteParticipants();
  const [chatOpen, setChatOpen] = React.useState(false);
  const [isSendingMessage, setIsSendingMessage] = React.useState(false);

  const isAgentAvailable = participants.some((p) => p.isAgent);
  const isInputDisabled = !chatOpen || !isAgentAvailable || isSendingMessage;

  const {
    micTrackRef,
    visibleControls,
    cameraToggle,
    microphoneToggle,
    screenShareToggle,
    handleDisconnect,
    handleAudioDeviceChange,
    handleVideoDeviceChange,
  } = useAgentControlBar({
    controls,
    saveUserChoices,
  });

  const handleSendMessage = async (message: string) => {
    setIsSendingMessage(true);
    try {
      await onSendMessage?.(message);
    } finally {
      setIsSendingMessage(false);
    }
  };

  React.useEffect(() => {
    onChatOpenChange?.(chatOpen);
  }, [chatOpen, onChatOpenChange]);

  const onMicrophoneDeviceSelectError = useCallback(
    (error: Error) => {
      onDeviceError?.({ source: Track.Source.Microphone, error });
    },
    [onDeviceError]
  );
  const onCameraDeviceSelectError = useCallback(
    (error: Error) => {
      onDeviceError?.({ source: Track.Source.Camera, error });
    },
    [onDeviceError]
  );

  return (
    <div
      aria-label="Voice assistant controls"
      className={cn(
        'bg-background border-separator1 dark:border-separator1 relative z-20 mx-0 mb-0.5 flex flex-col rounded border px-0 py-0.5 drop-shadow-md md:mx-1 md:mb-1 md:rounded-[24px] md:p-1',
        className
      )}
      {...props}
    >
      {capabilities.supportsChatInput && (
        <div
          inert={!chatOpen}
          className={cn(
            'relative overflow-hidden transition-[height] duration-300 ease-out',
            chatOpen ? 'h-[29px] md:h-[46px]' : 'h-0'
          )}
        >
          <div
            className={cn(
              'absolute inset-x-0 top-0 flex h-[23px] w-full transition-opacity duration-150 ease-linear md:h-9',
              chatOpen ? 'opacity-100 delay-150' : 'opacity-0'
            )}
          >
            <ChatInput
              onSend={handleSendMessage}
              disabled={isInputDisabled}
              className="w-full [&_input]:h-[23px] md:[&_input]:h-9 [&_input]:text-[9px] md:[&_input]:text-sm [&_button]:size-[23px] md:[&_button]:size-9"
            />
          </div>
          <hr className="border-bg2 absolute inset-x-0 bottom-0 my-1 w-full" />
        </div>
      )}

      <div className="flex flex-row justify-between gap-0.5 items-center min-h-0">
        <div className="flex gap-0.5 shrink overflow-hidden min-w-0">
          {visibleControls.microphone && (
            <div className="flex items-center gap-0 shrink-0">
              <TrackToggle
                variant="primary"
                source={Track.Source.Microphone}
                pressed={microphoneToggle.enabled}
                disabled={microphoneToggle.pending}
                onPressedChange={microphoneToggle.toggle}
                className="peer/track group/track relative w-auto pr-0.5 pl-0.5 md:pr-1.5 md:pl-1.5 min-w-0 h-auto self-stretch min-h-[12px] md:min-h-7 has-[+_*]:rounded-r-none has-[+_*]:border-r-0 has-[+_*]:pr-0.5 md:has-[+_*]:pr-1 [&_svg]:size-[7px] md:[&_svg]:size-5"
              >
                <BarVisualizer
                  barCount={3}
                  trackRef={micTrackRef}
                  options={{ minHeight: 4 }}
                  className="flex h-full w-auto items-center justify-center gap-0.5"
                >
                  <span
                    className={cn([
                      'h-full w-0.5 origin-center rounded-2xl',
                      'group-data-[state=on]/track:bg-fg1 group-data-[state=off]/track:bg-destructive-foreground',
                      'data-lk-muted:bg-muted',
                    ])}
                  ></span>
                </BarVisualizer>
              </TrackToggle>
              <DeviceSelect
                size="sm"
                kind="audioinput"
                requestPermissions={false}
                onMediaDeviceError={onMicrophoneDeviceSelectError}
                onActiveDeviceChange={handleAudioDeviceChange}
                contentClassName="min-w-0 text-xs md:text-sm py-1 z-[100]"
                className={cn([
                  'pl-0.5 md:pl-2 min-h-[12px] md:min-h-7 text-[7px] md:text-sm py-0 px-0.5 md:py-2 md:px-3 min-w-[28px] h-[28px] md:min-w-0 md:h-7 md:max-w-[7rem] [&_svg]:size-[7px] md:[&_svg]:size-5',
                  'peer-data-[state=off]/track:text-destructive-foreground',
                  'hover:text-fg1 focus:text-fg1',
                  'hover:peer-data-[state=off]/track:text-destructive-foreground focus:peer-data-[state=off]/track:text-destructive-foreground',
                  'rounded-l-none',
                ])}
              />
            </div>
          )}

          {capabilities.supportsVideoInput && visibleControls.camera && (
            <div className="flex items-center gap-0 shrink-0">
              <TrackToggle
                variant="primary"
                source={Track.Source.Camera}
                pressed={cameraToggle.enabled}
                pending={cameraToggle.pending}
                disabled={cameraToggle.pending}
                onPressedChange={cameraToggle.toggle}
                className="peer/track relative w-auto pr-0.5 pl-0.5 md:pr-1.5 md:pl-1.5 min-w-0 h-auto self-stretch min-h-[12px] md:min-h-7 disabled:opacity-100 has-[+_*]:rounded-r-none has-[+_*]:border-r-0 has-[+_*]:pr-0.5 md:has-[+_*]:pr-1 [&_svg]:size-[7px] md:[&_svg]:size-5"
              />
              <DeviceSelect
                size="sm"
                kind="videoinput"
                requestPermissions={false}
                onMediaDeviceError={onCameraDeviceSelectError}
                onActiveDeviceChange={handleVideoDeviceChange}
                contentClassName="min-w-0 text-xs md:text-sm py-1 z-[100]"
                className={cn([
                  'pl-0.5 md:pl-2 min-h-[12px] md:min-h-7 text-[7px] md:text-sm py-0 px-0.5 md:py-2 md:px-3 min-w-[28px] h-[28px] md:min-w-0 md:h-7 md:max-w-[7rem] [&_svg]:size-[7px] md:[&_svg]:size-5',
                  'peer-data-[state=off]/track:text-destructive-foreground',
                  'hover:text-fg1 focus:text-fg1',
                  'hover:peer-data-[state=off]/track:text-destructive-foreground focus:peer-data-[state=off]/track:text-destructive-foreground',
                  'rounded-l-none',
                ])}
              />
            </div>
          )}
        </div>
        <div className="flex gap-0.5 shrink-0">
          {capabilities.supportsScreenShare && visibleControls.screenShare && (
            <div className="flex items-center gap-0 shrink-0">
              <TrackToggle
                variant="secondary"
                source={Track.Source.ScreenShare}
                pressed={screenShareToggle.enabled}
                disabled={screenShareToggle.pending}
                onPressedChange={screenShareToggle.toggle}
                className="relative size-[28px] md:size-7 shrink-0 [&_svg]:size-[7px] md:[&_svg]:size-5"
              />
            </div>
          )}

          {visibleControls.chat && (
            <Toggle
              variant="secondary"
              size="sm"
              aria-label="Toggle chat"
              pressed={chatOpen}
              onPressedChange={setChatOpen}
              disabled={!isAgentAvailable}
              className="aspect-square size-[28px] md:size-7 shrink-0"
            >
              <ChatTextIcon weight="bold" className="size-[7px] md:size-3.5" />
            </Toggle>
          )}

          {visibleControls.leave && (
            <Button
              variant="destructive"
              size="icon"
              aria-label="End call"
              onClick={handleDisconnect}
              className="aspect-square size-[28px] md:size-7 shrink-0"
            >
              <PhoneDisconnectIcon weight="bold" className="size-[7px] md:size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

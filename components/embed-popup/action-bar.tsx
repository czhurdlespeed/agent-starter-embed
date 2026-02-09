'use client';

import * as React from 'react';
import { useCallback } from 'react';
import { Track } from 'livekit-client';
import { BarVisualizer, useRemoteParticipants } from '@livekit/components-react';
import { ChatTextIcon, PhoneDisconnectIcon } from '@phosphor-icons/react/dist/ssr';
import { ChatInput } from '@/components/livekit/chat/chat-input';
import { DeviceSelect } from '@/components/livekit/device-select';
import { TrackToggle } from '@/components/livekit/track-toggle';
import { Button } from '@/components/ui/button';
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
              className="w-full [&_button]:size-[23px] md:[&_button]:size-9 [&_input]:h-[23px] [&_input]:text-[9px] md:[&_input]:h-9 md:[&_input]:text-sm"
            />
          </div>
          <hr className="border-bg2 absolute inset-x-0 bottom-0 my-1 w-full" />
        </div>
      )}

      <div className="flex min-h-0 flex-row items-center justify-between gap-0.5">
        <div className="flex min-w-0 shrink gap-0.5 overflow-hidden">
          {visibleControls.microphone && (
            <div className="flex shrink-0 items-center gap-0">
              <TrackToggle
                variant="primary"
                source={Track.Source.Microphone}
                pressed={microphoneToggle.enabled}
                disabled={microphoneToggle.pending}
                onPressedChange={microphoneToggle.toggle}
                className="peer/track group/track relative h-auto min-h-[12px] w-auto min-w-0 self-stretch pr-0.5 pl-0.5 has-[+_*]:rounded-r-none has-[+_*]:border-r-0 has-[+_*]:pr-0.5 md:min-h-7 md:pr-1.5 md:pl-1.5 md:has-[+_*]:pr-1 [&_svg]:size-[7px] md:[&_svg]:size-5"
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
                  'h-[28px] min-h-[12px] min-w-[28px] px-0.5 py-0 pl-0.5 text-[7px] md:h-7 md:min-h-7 md:max-w-[7rem] md:min-w-0 md:px-3 md:py-2 md:pl-2 md:text-sm [&_svg]:size-[7px] md:[&_svg]:size-5',
                  'peer-data-[state=off]/track:text-destructive-foreground',
                  'hover:text-fg1 focus:text-fg1',
                  'hover:peer-data-[state=off]/track:text-destructive-foreground focus:peer-data-[state=off]/track:text-destructive-foreground',
                  'rounded-l-none',
                ])}
              />
            </div>
          )}

          {capabilities.supportsVideoInput && visibleControls.camera && (
            <div className="flex shrink-0 items-center gap-0">
              <TrackToggle
                variant="primary"
                source={Track.Source.Camera}
                pressed={cameraToggle.enabled}
                pending={cameraToggle.pending}
                disabled={cameraToggle.pending}
                onPressedChange={cameraToggle.toggle}
                className="peer/track relative h-auto min-h-[12px] w-auto min-w-0 self-stretch pr-0.5 pl-0.5 disabled:opacity-100 has-[+_*]:rounded-r-none has-[+_*]:border-r-0 has-[+_*]:pr-0.5 md:min-h-7 md:pr-1.5 md:pl-1.5 md:has-[+_*]:pr-1 [&_svg]:size-[7px] md:[&_svg]:size-5"
              />
              <DeviceSelect
                size="sm"
                kind="videoinput"
                requestPermissions={false}
                onMediaDeviceError={onCameraDeviceSelectError}
                onActiveDeviceChange={handleVideoDeviceChange}
                contentClassName="min-w-0 text-xs md:text-sm py-1 z-[100]"
                className={cn([
                  'h-[28px] min-h-[12px] min-w-[28px] px-0.5 py-0 pl-0.5 text-[7px] md:h-7 md:min-h-7 md:max-w-[7rem] md:min-w-0 md:px-3 md:py-2 md:pl-2 md:text-sm [&_svg]:size-[7px] md:[&_svg]:size-5',
                  'peer-data-[state=off]/track:text-destructive-foreground',
                  'hover:text-fg1 focus:text-fg1',
                  'hover:peer-data-[state=off]/track:text-destructive-foreground focus:peer-data-[state=off]/track:text-destructive-foreground',
                  'rounded-l-none',
                ])}
              />
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-0.5">
          {capabilities.supportsScreenShare && visibleControls.screenShare && (
            <div className="flex shrink-0 items-center gap-0">
              <TrackToggle
                variant="secondary"
                source={Track.Source.ScreenShare}
                pressed={screenShareToggle.enabled}
                disabled={screenShareToggle.pending}
                onPressedChange={screenShareToggle.toggle}
                className="relative size-[28px] shrink-0 md:size-7 [&_svg]:size-[7px] md:[&_svg]:size-5"
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
              className="aspect-square size-[28px] shrink-0 md:size-7"
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
              className="aspect-square size-[28px] shrink-0 md:size-7"
            >
              <PhoneDisconnectIcon weight="bold" className="size-[7px] md:size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

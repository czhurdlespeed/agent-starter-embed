import { AnimatePresence, motion } from 'motion/react';
import { useVoiceAssistant } from '@livekit/components-react';
import { PhoneDisconnectIcon, XIcon } from '@phosphor-icons/react';
import { EmbedErrorDetails } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { VideoButton } from './video-button';

const AnimatedButton = motion.create(Button);

interface TriggerProps {
  error: EmbedErrorDetails | null;
  popupOpen: boolean;
  onToggle: () => void;
  startVideoMuted?: boolean;
}

export function Trigger({ error = null, popupOpen, onToggle, startVideoMuted = false }: TriggerProps) {
  const { state: agentState } = useVoiceAssistant();

  const isAgentConnecting =
    popupOpen && (agentState === 'connecting' || agentState === 'initializing');

  const isAgentConnected =
    popupOpen &&
    agentState !== 'disconnected' &&
    agentState !== 'connecting' &&
    agentState !== 'initializing';

  return (
    <AnimatePresence>
      <AnimatedButton
        key="trigger-button"
        size="lg"
        initial={{
          scale: 0,
        }}
        animate={{
          scale: 1,
        }}
        exit={{ scale: 0 }}
        transition={{
          type: 'spring',
          duration: 1,
          bounce: 0.2,
        }}
        onClick={onToggle}
        className={cn(
          'relative m-0 block w-[140px] h-[180px] md:w-[224px] md:h-[288px] p-0 drop-shadow-md',
          'scale-100 transition-[scale] duration-300 hover:scale-[1.02] focus:scale-[1.02]',
          'rounded-xl',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8200] focus-visible:ring-offset-2'
        )}
      >
        {/* ring */}
        <motion.div
          className={cn(
            'absolute inset-0 z-10 rounded-xl overflow-hidden transition-colors',
            !popupOpen && 'bg-[#FF8200]',
            !error && isAgentConnecting && 'bg-bg1',
            (isAgentConnected || (error && popupOpen)) && 'bg-destructive-foreground'
          )}
        />
        {/* icon */}
        <div
          className={cn(
            'relative z-20 grid place-items-center rounded-xl overflow-hidden transition-colors',
            'w-full h-full min-w-0 min-h-0',
            !popupOpen && 'bg-transparent',
            !error && isAgentConnecting && 'bg-bg1',
            (isAgentConnected || (error && popupOpen)) && 'bg-destructive'
          )}
        >
          <AnimatePresence>
            {!popupOpen && (
              <motion.div
                key="video-button"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: popupOpen ? 20 : -20 }}
                className="absolute inset-0"
              >
                <VideoButton asChild className="size-full rounded-lg" startMuted={startVideoMuted} />
              </motion.div>
            )}
            {(isAgentConnecting || (error && popupOpen)) && (
              <motion.div
                key="dismiss"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: popupOpen ? -20 : 20 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[28px] md:size-11"
              >
                <XIcon
                  weight="bold"
                  className={cn('text-fg0 size-[13px] md:size-5', error && 'text-destructive-foreground')}
                />
              </motion.div>
            )}
            {!error && isAgentConnected && (
              <motion.div
                key="disconnect"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: popupOpen ? -20 : 20 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[28px] md:size-11"
              >
                <PhoneDisconnectIcon
                  weight="bold"
                  className="text-destructive-foreground size-[13px] md:size-5"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AnimatedButton>
    </AnimatePresence>
  );
}

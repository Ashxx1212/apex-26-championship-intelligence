import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, AudioWaveform } from 'lucide-react';

interface BootSequenceProps {
  onComplete: () => void;
}

const bootLines = [
  'APEX INTELLIGENCE CORE',
  '2026 CHAMPIONSHIP DATA CORE READY',
  'FORECAST ENGINE STANDING BY',
];

const NARRATION_TEXT = 'APEX intelligence core online. 2026 championship data link established. Forecast engine standing by.';
const FALLBACK_TIMEOUT_MS = 15000;

// Preferred voices in order of preference
const PREFERRED_VOICE_PATTERNS = [
  'Microsoft David',
  'Microsoft Zira',
  'Google US English',
  'Microsoft Mark',
];

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [phase, setPhase] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [voiceLinkActive, setVoiceLinkActive] = useState(false);

  const hasTransitionedRef = useRef(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const narrationStartedRef = useRef(false);
  const voicesLoadedRef = useRef(false);

  const transitionIntoCommandCentre = useCallback(() => {
    if (hasTransitionedRef.current) return;
    hasTransitionedRef.current = true;

    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }

    onComplete();
  }, [onComplete]);

  const getBestVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!window.speechSynthesis) return null;

    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    // Try to find a preferred voice
    for (const pattern of PREFERRED_VOICE_PATTERNS) {
      const found = voices.find(
        (v) =>
          v.name.includes(pattern) &&
          v.lang.startsWith('en')
      );
      if (found) return found;
    }

    // Fall back to any English voice
    const englishVoice = voices.find((v) => v.lang.startsWith('en'));
    return englishVoice || null;
  }, []);

  const handleInitialize = useCallback(() => {
  // Prevent double-clicks, delayed voice events, or browser callbacks
  // from starting the narration more than once.
  if (narrationStartedRef.current || hasTransitionedRef.current) return;

  setIsInitializing(true);

  const speakNarration = () => {
    // This is the important protection against duplicate speech calls.
    if (narrationStartedRef.current || hasTransitionedRef.current) return;

    narrationStartedRef.current = true;

    if (voiceLoadTimeoutRef.current) {
      clearTimeout(voiceLoadTimeoutRef.current);
      voiceLoadTimeoutRef.current = null;
    }

    if (!window.speechSynthesis) {
      transitionIntoCommandCentre();
      return;
    }

    window.speechSynthesis.onvoiceschanged = null;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(NARRATION_TEXT);
    utterance.rate = 0.88;
    utterance.pitch = 0.72;

    const bestVoice = getBestVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onstart = () => {
      setVoiceLinkActive(true);
    };

    utterance.onend = () => {
      transitionIntoCommandCentre();
    };

    utterance.onerror = () => {
      transitionIntoCommandCentre();
    };

    fallbackTimeoutRef.current = setTimeout(() => {
      transitionIntoCommandCentre();
    }, FALLBACK_TIMEOUT_MS);

    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      transitionIntoCommandCentre();
    }
  };

  if (!window.speechSynthesis) {
    transitionIntoCommandCentre();
    return;
  }

  const voices = window.speechSynthesis.getVoices();

  if (voices.length > 0) {
    voicesLoadedRef.current = true;
    speakNarration();
    return;
  }

  // Set this first, before registering the voice callback.
  // The narration lock prevents either callback from speaking twice.
  voiceLoadTimeoutRef.current = setTimeout(() => {
    speakNarration();
  }, 1000);

  window.speechSynthesis.onvoiceschanged = () => {
    voicesLoadedRef.current = true;
    speakNarration();
  };
}, [getBestVoice, transitionIntoCommandCentre]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    bootLines.forEach((_, index) => {
      timers.push(
        setTimeout(() => {
          setPhase(index + 1);
        }, (index + 1) * 800)
      );
    });

    timers.push(
      setTimeout(() => {
        setShowButton(true);
      }, bootLines.length * 800 + 400)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
      if (voiceLoadTimeoutRef.current) {
  clearTimeout(voiceLoadTimeoutRef.current);
}
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-graphite overflow-hidden">
      {/* Scan lines overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255,255,255,0.03) 2px,
              rgba(255,255,255,0.03) 4px
            )`,
          }}
        />
      </div>

      {/* Animated speed lines */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute h-[1px] bg-gradient-to-r from-transparent via-cyan/30 to-transparent animate-speed-line"
            style={{
              top: `${15 + i * 6}%`,
              left: '-100%',
              width: '60%',
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* APEX Symbol */}
      <div className="relative flex flex-col items-center mb-12">
        <div className="relative">
          {/* Geometric bracket frame */}
          <div className="absolute -inset-8 border border-crimson/20">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-crimson" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-crimson" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-crimson" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-crimson" />
          </div>

          {/* APEX Logo */}
          <div className="relative">
            <span className="text-6xl md:text-8xl font-black tracking-[0.3em] text-white">
              APEX
            </span>
            <span className="absolute -top-1 -right-6 text-cyan text-sm font-bold">
              26
            </span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <div className="h-[1px] w-48 bg-gradient-to-r from-transparent via-crimson to-transparent" />
        </div>
      </div>

      {/* Boot text sequence */}
      <div className="flex flex-col items-center gap-3 mb-12 font-mono">
        {bootLines.map((line, index) => (
          <div
            key={line}
            className={`text-sm md:text-base tracking-wider transition-all duration-500 ${
              phase > index
                ? 'text-cyan/90 opacity-100'
                : 'text-white/0 opacity-0'
            } ${phase === index + 1 ? 'text-white' : ''}`}
          >
            <span className="mr-2 text-crimson">&gt;</span>
            {line}
          </div>
        ))}
      </div>

      {/* Audio uplink status - shown when voice is active */}
      {voiceLinkActive && (
        <div className="mb-4 text-[10px] tracking-[0.25em] text-cyan/70 animate-pulse">
          AUDIO UPLINK // TRANSMITTING SYSTEM BRIEF
        </div>
      )}

      {/* Initialize button */}
      <button
        onClick={handleInitialize}
        disabled={!showButton || isInitializing}
        className={`
          group relative overflow-hidden px-8 py-4 border
          font-bold tracking-widest text-sm
          transition-all duration-500
          ${
            showButton && !isInitializing
              ? 'border-crimson text-white opacity-100'
              : 'border-crimson/0 text-white/0 opacity-0 pointer-events-none'
          }
          ${isInitializing ? 'border-cyan text-cyan' : ''}
        `}
      >
        {/* Button glow effect */}
        <div
          className={`
            absolute inset-0 bg-crimson/10
            transition-opacity duration-300
            ${isInitializing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}
        />

        {/* Scanning line */}
        <div
          className={`
            absolute inset-0
            before:absolute before:inset-0
            before:bg-gradient-to-r before:from-transparent before:via-cyan/30 before:to-transparent
            before:animate-scan
          `}
        />

        <span className="relative flex items-center gap-3">
          {isInitializing ? (
            <>
              {voiceLinkActive && (
                <AudioWaveform className="w-4 h-4 animate-pulse" />
              )}
              <span className={voiceLinkActive ? 'animate-pulse' : ''}>
                {voiceLinkActive ? 'VOICE LINK ACTIVE' : 'INITIALIZING...'}
              </span>
            </>
          ) : (
            <>
              INITIALIZE RACE INTELLIGENCE
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </span>
      </button>

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-crimson/30" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-crimson/30" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-crimson/30" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-crimson/30" />
    </div>
  );
}

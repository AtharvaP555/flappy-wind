import { useRef, useEffect, useCallback } from "react";

export const useAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeOscillatorsRef = useRef<Set<OscillatorNode>>(new Set());

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }, []);

  const playSound = useCallback(
    (frequency: number, duration: number, type: OscillatorType = "sine") => {
      try {
        const audioContext = audioContextRef.current;
        if (!audioContext) return;

        if (audioContext.state === "suspended") {
          audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(
          frequency,
          audioContext.currentTime
        );
        oscillator.type = type;

        // Set initial gain and fade out completely
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.0001, // Very small value for complete fadeout
          audioContext.currentTime + duration
        );

        // Add to active oscillators
        activeOscillatorsRef.current.add(oscillator);

        // Clean up function
        const cleanup = () => {
          try {
            gainNode.disconnect();
            oscillator.disconnect();
            activeOscillatorsRef.current.delete(oscillator);
          } catch (e) {
            // Ignore errors from already disconnected nodes
          }
        };

        // Set up ended event
        oscillator.onended = cleanup;

        // Start and stop the oscillator
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);

        // Force cleanup after duration
        setTimeout(cleanup, (duration + 0.1) * 1000);
      } catch (e) {
        console.error("Audio error", e);
      }
    },
    []
  );

  const stopAllSounds = useCallback(() => {
    activeOscillatorsRef.current.forEach((oscillator) => {
      try {
        oscillator.stop();
        oscillator.disconnect();
      } catch (e) {
        // Oscillator might already be stopped
      }
    });
    activeOscillatorsRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllSounds();
    };
  }, [stopAllSounds]);

  return { playSound, stopAllSounds };
};

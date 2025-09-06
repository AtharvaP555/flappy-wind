import { useRef, useEffect, useCallback } from "react";

interface GameLoopCallbacks {
  update: (deltaTime: number) => void;
  render: () => void;
}

export const useGameLoop = ({ update, render }: GameLoopCallbacks) => {
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isRunningRef = useRef(false);

  const gameLoop = useCallback(
    (currentTime: number) => {
      if (!isRunningRef.current) return;

      const deltaTime = lastTimeRef.current
        ? (currentTime - lastTimeRef.current) / 1000
        : 0;

      if (deltaTime > 0 && deltaTime < 0.1) {
        update(deltaTime);
      }

      render();
      lastTimeRef.current = currentTime;
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    },
    [update, render]
  );

  const startLoop = useCallback(() => {
    if (!isRunningRef.current) {
      isRunningRef.current = true;
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameLoop]);

  const stopLoop = useCallback(() => {
    isRunningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  useEffect(() => {
    startLoop();

    return () => {
      stopLoop();
    };
  }, [startLoop, stopLoop]);

  return { startLoop, stopLoop };
};

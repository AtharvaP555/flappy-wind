import { useState, useRef, useEffect } from "react";
import type { GameState } from "../types/game";

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>({
    isRunning: false,
    gameOver: false,
    score: 0,
    bestScore: parseInt(localStorage.getItem("flappyWindBestScore") || "0"),
    windEnergy: 100,
    gameOverOpacity: 0,
  });

  // Refs for stable access in game loop
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Save best score
  useEffect(() => {
    if (gameState.score > gameState.bestScore) {
      const newBestScore = gameState.score;
      setGameState((prev) => ({ ...prev, bestScore: newBestScore }));
      localStorage.setItem("flappyWindBestScore", newBestScore.toString());
    }
  }, [gameState.score, gameState.bestScore]);

  // Animate game over overlay
  useEffect(() => {
    if (gameState.gameOver) {
      let opacity = 0;
      const fadeIn = () => {
        opacity += 0.05;
        setGameState((prev) => ({
          ...prev,
          gameOverOpacity: Math.min(opacity, 1),
        }));
        if (opacity < 1) {
          requestAnimationFrame(fadeIn);
        }
      };
      fadeIn();
    } else {
      setGameState((prev) => ({ ...prev, gameOverOpacity: 0 }));
    }
  }, [gameState.gameOver]);

  return { gameState, gameStateRef, setGameState };
};

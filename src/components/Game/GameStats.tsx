import React from "react";
import type { GameState } from "../../types/game";

interface GameStatsProps {
  gameState: GameState;
  isMobile: boolean;
}

const GameStats: React.FC<GameStatsProps> = ({ gameState, isMobile }) => {
  if (isMobile) {
    return null; // Hide stats on mobile to save space
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "30px",
        marginTop: "20px",
        fontSize: "20px",
        fontWeight: "bold",
        fontFamily: "'Courier New', monospace",
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "10px 20px",
          borderRadius: "25px",
          color: "white",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
        }}
      >
        🎯 SCORE: {gameState.score.toString().padStart(3, "0")}
      </div>

      <div
        style={{
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          padding: "10px 20px",
          borderRadius: "25px",
          color: "white",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
        }}
      >
        🏆 BEST: {gameState.bestScore.toString().padStart(3, "0")}
      </div>

      <div
        style={{
          background: `linear-gradient(135deg, ${
            gameState.windEnergy > 50
              ? "#4facfe 0%, #00f2fe 100%"
              : "#fa709a 0%, #fee140 100%"
          })`,
          padding: "10px 20px",
          borderRadius: "25px",
          color: "white",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
        }}
      >
        🌪️ WIND: {Math.round(gameState.windEnergy)}%
      </div>
    </div>
  );
};

export default GameStats;

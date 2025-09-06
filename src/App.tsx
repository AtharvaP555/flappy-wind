import GameCanvas from "./components/Game/GameCanvas";
import GameStats from "./components/Game/GameStats";
import { useResponsiveCanvas } from "./hooks/useResponsiveCanvas";
import { useGameState } from "./hooks/useGameState";
import "./App.css";

function App() {
  const { canvasDimensions, isMobile } = useResponsiveCanvas();
  const { gameState, setGameState } = useGameState();

  return (
    <div
      className="app"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "10px" : "20px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <h1
        style={{
          background: "linear-gradient(45deg, #FFD700, #FF6B35)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontSize: isMobile ? "2em" : "3em",
          textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
          marginBottom: isMobile ? "10px" : "20px",
          textAlign: "center",
        }}
      >
        🌪️ FLAPPY WIND
      </h1>

      <GameCanvas
        canvasDimensions={canvasDimensions}
        gameState={gameState}
        setGameState={setGameState}
        isMobile={isMobile}
      />

      <GameStats gameState={gameState} isMobile={isMobile} />

      <p
        style={{
          textAlign: "center",
          margin: "20px 0",
          fontSize: isMobile ? "14px" : "18px",
          color: "white",
          fontFamily: "'Courier New', monospace",
          fontWeight: "bold",
          textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
          maxWidth: "600px",
        }}
      >
        {isMobile
          ? "TAP TO FLAP • DRAG TO CREATE WIND GUSTS"
          : "CLICK TO FLAP • DRAG TO CREATE WIND GUSTS • MANAGE YOUR ENERGY WISELY!"}
      </p>
    </div>
  );
}

export default App;

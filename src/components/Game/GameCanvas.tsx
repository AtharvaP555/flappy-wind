import React, { useRef, useCallback } from "react";
import type {
  CanvasDimensions,
  GameState,
  Bird,
  Pipe,
  Gust,
  Particle,
  Cloud,
} from "../../types/game";
import { useGameLoop } from "../../hooks/useGameLoop";
import { useAudio } from "../../hooks/useAudio";
import { useTouchControls } from "../../hooks/useTouchControls";
import {
  updateBird,
  updateParticles,
  updateGusts,
  updateClouds,
  createPipe,
} from "../../utils/physics";
import {
  drawBackground,
  drawBird,
  drawPipe,
  drawGust,
  drawParticles,
  drawWindStroke,
  drawUI,
  drawGameOverCard,
} from "../../utils/rendering";
import { distance, normalize, checkCollision } from "../../utils/gameHelpers";
import { GAME_PHYSICS, WIND_CONFIG } from "../../utils/constants";

interface GameCanvasProps {
  canvasDimensions: CanvasDimensions;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  isMobile: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  canvasDimensions,
  gameState,
  setGameState,
  isMobile,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { playSound, stopAllSounds } = useAudio();

  // Game constants based on canvas size
  const CANVAS_WIDTH = canvasDimensions.width;
  const CANVAS_HEIGHT = canvasDimensions.height;
  const PIPE_WIDTH = Math.max(40, CANVAS_WIDTH * 0.075);
  const PIPE_GAP = Math.max(120, CANVAS_HEIGHT * 0.25);
  const PIPE_SPEED = Math.max(150, CANVAS_WIDTH * 0.25);
  const GUST_RADIUS = Math.max(60, CANVAS_WIDTH * 0.125);

  // Game state refs
  const gameTimeRef = useRef(0);
  const shakeRef = useRef({ x: 0, y: 0, intensity: 0 });
  const nextPipeTimeRef = useRef(0);

  // Game objects
  const birdRef = useRef<Bird>({
    x: CANVAS_WIDTH * 0.125,
    y: CANVAS_HEIGHT * 0.5,
    radius: Math.max(15, CANVAS_WIDTH * 0.025),
    color: "#FFD700",
    vy: 0,
    vx: 0,
    rotation: 0,
  });

  const pipesRef = useRef<Pipe[]>([]);
  const gustsRef = useRef<Gust[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);

  // Initialize clouds
  React.useEffect(() => {
    cloudsRef.current = [];
    const cloudCount = Math.max(4, Math.floor(CANVAS_WIDTH / 100));
    for (let i = 0; i < cloudCount; i++) {
      cloudsRef.current.push({
        x: Math.random() * (CANVAS_WIDTH + 200) - 200,
        y: Math.random() * CANVAS_HEIGHT * 0.4 + 50,
        size: Math.random() * (CANVAS_WIDTH * 0.05) + CANVAS_WIDTH * 0.04,
        speed: Math.random() * 20 + 10,
        opacity: Math.random() * 0.3 + 0.2,
      });
    }
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  // Update bird position when canvas size changes
  React.useEffect(() => {
    birdRef.current.x = CANVAS_WIDTH * 0.125;
    birdRef.current.y = CANVAS_HEIGHT * 0.5;
    birdRef.current.radius = Math.max(15, CANVAS_WIDTH * 0.025);
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  // Helper functions
  const createParticles = useCallback(
    (x: number, y: number, count: number, color: string) => {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 200,
          vy: (Math.random() - 0.5) * 200,
          life: 0.5,
          maxLife: 0.5,
          color,
          size: Math.random() * 4 + 2,
        });
      }
    },
    []
  );

  const addScreenShake = useCallback((intensity: number) => {
    shakeRef.current.intensity = Math.max(
      shakeRef.current.intensity,
      intensity
    );
  }, []);

  const updateScreenShake = useCallback((deltaTime: number) => {
    if (shakeRef.current.intensity > 0) {
      shakeRef.current.x = (Math.random() - 0.5) * shakeRef.current.intensity;
      shakeRef.current.y = (Math.random() - 0.5) * shakeRef.current.intensity;
      shakeRef.current.intensity *= Math.pow(0.1, deltaTime);

      if (shakeRef.current.intensity < 0.1) {
        shakeRef.current.intensity = 0;
        shakeRef.current.x = 0;
        shakeRef.current.y = 0;
      }
    }
  }, []);

  const createGust = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const strokeLength = distance(start, end);
      if (strokeLength < 20) return null;

      const cost = Math.min(
        strokeLength * WIND_CONFIG.GUST_COST_PER_PIXEL,
        gameState.windEnergy
      );
      if (cost < 10) return null;

      const direction = normalize({ x: end.x - start.x, y: end.y - start.y });
      const magnitude = Math.min(
        strokeLength * 1.5,
        WIND_CONFIG.GUST_BASE_POWER
      );

      setGameState((prev) => ({
        ...prev,
        windEnergy: Math.max(0, prev.windEnergy - cost),
      }));

      playSound(200 + Math.random() * 100, 0.1, "sine");
      createParticles(start.x, start.y, 5, "rgba(0, 200, 255, 0.8)");

      return {
        x: start.x,
        y: start.y,
        direction,
        magnitude,
        radius: GUST_RADIUS,
        life: WIND_CONFIG.GUST_LIFE,
        maxLife: WIND_CONFIG.GUST_LIFE,
      };
    },
    [
      gameState.windEnergy,
      setGameState,
      playSound,
      createParticles,
      GUST_RADIUS,
    ]
  );

  const handleGameStart = useCallback(() => {
    gameOverTriggeredRef.current = false;
    if (gameState.gameOver) {
      stopAllSounds();
      // Restart game
      setGameState({
        isRunning: true,
        gameOver: false,
        score: 0,
        bestScore: gameState.bestScore,
        windEnergy: 100,
        gameOverOpacity: 0,
      });

      birdRef.current = {
        x: CANVAS_WIDTH * 0.125,
        y: CANVAS_HEIGHT * 0.5,
        radius: Math.max(15, CANVAS_WIDTH * 0.025),
        color: "#FFD700",
        vy: 0,
        vx: 0,
        rotation: 0,
      };

      pipesRef.current = [];
      gustsRef.current = [];
      particlesRef.current = [];
      nextPipeTimeRef.current = 2;
      gameTimeRef.current = 0;
      playSound(440, 0.1);
      return;
    }

    if (!gameState.isRunning) {
      setGameState((prev) => ({ ...prev, isRunning: true }));
      nextPipeTimeRef.current = 2;
      playSound(330, 0.1);
    }

    // Always flap when tapped (whether starting game or during play)
    if (!gameState.gameOver) {
      birdRef.current.vy = GAME_PHYSICS.FLAP_POWER;
      playSound(440, 0.1);
      createParticles(birdRef.current.x, birdRef.current.y, 3, "#FFD700");
    }
  }, [
    gameState,
    setGameState,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    playSound,
    createParticles,
    stopAllSounds,
  ]);

  const handleWindGust = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const gust = createGust(start, end);
      if (gust) {
        gustsRef.current.push(gust);
      }
    },
    [createGust]
  );

  // Touch controls
  const { isDrawing, drawStart, drawCurrent } = useTouchControls({
    canvasRef,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    onTap: () => handleGameStart(),
    onDragEnd: handleWindGust,
    gameRunning: gameState.isRunning,
    gameOver: gameState.gameOver,
  });

  // Mouse controls
  // const handleMouseDown = useCallback(
  //   (e: React.MouseEvent) => {
  //     if (!gameState.isRunning || gameState.gameOver) return;
  //     e.preventDefault();
  //     // Mouse drawing implementation simplified for this refactor
  //     // You can implement full mouse drawing similar to touch controls if needed
  //   },
  //   [gameState.isRunning, gameState.gameOver]
  // );

  // const handleClick = useCallback(() => {
  //   if (isDrawing) return;
  //   handleGameStart();
  // }, [isDrawing, handleGameStart]);

  // Update functions
  const gameOverTriggeredRef = useRef(false);
  const handleGameOver = useCallback(() => {
    if (gameOverTriggeredRef.current) return; // Prevent multiple triggers
    gameOverTriggeredRef.current = true;
    setGameState((prev) => ({ ...prev, gameOver: true }));
    playSound(150, 0.3, "square");
    addScreenShake(15);
    createParticles(birdRef.current.x, birdRef.current.y, 10, "#FF0000");
  }, [setGameState, playSound, addScreenShake, createParticles]);

  const updatePipes = useCallback(
    (deltaTime: number) => {
      if (gameState.gameOver) return; // Early return if game is already over

      pipesRef.current.forEach((pipe) => {
        pipe.x -= PIPE_SPEED * deltaTime;

        if (pipe.animationOffset < 1) {
          pipe.animationOffset += deltaTime * 3;
        }

        if (!pipe.passed && pipe.x + pipe.width < birdRef.current.x) {
          pipe.passed = true;
          setGameState((prev) => ({ ...prev, score: prev.score + 1 }));
          playSound(523, 0.2);
          createParticles(
            pipe.x + pipe.width,
            pipe.topHeight + pipe.gap / 2,
            5,
            "#4CAF50"
          );
        }
      });

      pipesRef.current = pipesRef.current.filter(
        (pipe) => pipe.x > -pipe.width
      );

      nextPipeTimeRef.current -= deltaTime;
      if (nextPipeTimeRef.current <= 0) {
        pipesRef.current.push(
          createPipe(CANVAS_WIDTH + 50, CANVAS_HEIGHT, PIPE_WIDTH, PIPE_GAP)
        );
        nextPipeTimeRef.current = 2.5;
      }

      // Only check collisions if game is not already over
      if (!gameState.gameOver) {
        for (const pipe of pipesRef.current) {
          if (checkCollision(birdRef.current, pipe)) {
            handleGameOver();
            break; // Break out of the loop after first collision
          }
        }
      }
    },
    [
      gameState.gameOver, // Make sure this is in dependencies
      PIPE_SPEED,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      PIPE_WIDTH,
      PIPE_GAP,
      setGameState,
      playSound,
      createParticles,
      handleGameOver, // Add handleGameOver to dependencies
    ]
  );

  const updateWindEnergy = useCallback(
    (deltaTime: number) => {
      if (gameState.windEnergy < WIND_CONFIG.MAX_WIND_ENERGY) {
        setGameState((prev) => ({
          ...prev,
          windEnergy: Math.min(
            WIND_CONFIG.MAX_WIND_ENERGY,
            prev.windEnergy + WIND_CONFIG.WIND_REGEN_RATE * deltaTime
          ),
        }));
      }
    },
    [gameState.windEnergy, setGameState]
  );

  const updateGameTime = useCallback(
    (deltaTime: number) => {
      if (gameState.isRunning) {
        gameTimeRef.current += deltaTime;
      }
    },
    [gameState.isRunning]
  );

  // Game loop update function
  const update = useCallback(
    (deltaTime: number) => {
      updateScreenShake(deltaTime);
      updateClouds(cloudsRef.current, deltaTime, CANVAS_WIDTH, CANVAS_HEIGHT);
      updateGameTime(deltaTime);

      if (gameState.isRunning) {
        updateBird(
          birdRef.current,
          deltaTime,
          gustsRef.current,
          CANVAS_WIDTH,
          CANVAS_HEIGHT,
          handleGameOver,
          gameState.gameOver
        );
        updatePipes(deltaTime);
        particlesRef.current = updateParticles(particlesRef.current, deltaTime);
        gustsRef.current = updateGusts(gustsRef.current, deltaTime);
        updateWindEnergy(deltaTime);
      }
    },
    [
      updateScreenShake,
      updateGameTime,
      gameState.isRunning,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      handleGameOver,
      updatePipes,
      updateWindEnergy,
    ]
  );

  // Game loop render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.translate(shakeRef.current.x, shakeRef.current.y);

    drawBackground(
      ctx,
      cloudsRef.current,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      gameTimeRef.current,
      gameState.score
    );
    pipesRef.current.forEach((pipe) => drawPipe(ctx, pipe, CANVAS_HEIGHT));
    gustsRef.current.forEach((gust) => drawGust(ctx, gust));
    drawParticles(ctx, particlesRef.current);
    drawBird(ctx, birdRef.current);
    drawWindStroke(
      ctx,
      isDrawing,
      drawStart,
      drawCurrent,
      GUST_RADIUS,
      CANVAS_WIDTH
    );

    ctx.restore();

    drawUI(
      ctx,
      gameState.score,
      gameState.bestScore,
      gameState.windEnergy,
      WIND_CONFIG.MAX_WIND_ENERGY,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      gameState.isRunning,
      gameState.gameOver,
      isMobile
    );

    if (gameState.gameOver) {
      drawGameOverCard(
        ctx,
        gameState.score,
        gameState.bestScore,
        gameState.gameOverOpacity,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        isMobile
      );
    }
  }, [
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    GUST_RADIUS,
    gameState,
    isMobile,
    isDrawing,
    drawStart,
    drawCurrent,
  ]);

  // Initialize game loop
  useGameLoop({ update, render });

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{
        border: "4px solid #333",
        cursor: gameState.gameOver ? "pointer" : "crosshair",
        borderRadius: "15px",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1)",
        maxWidth: "100%",
        maxHeight: "70vh",
      }}
      // onMouseDown={handleMouseDown}
      // onClick={handleClick}
    >
      Your browser doesn't support HTML5 Canvas
    </canvas>
  );
};

export default GameCanvas;

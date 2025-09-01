import { useEffect, useRef, useState, useCallback } from "react";
import "./App.css";

// Interfaces
interface Bird {
  x: number;
  y: number;
  radius: number;
  color: string;
  vy: number;
  vx: number;
  rotation: number; // Add rotation for visual polish
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  width: number;
  gap: number;
  passed: boolean;
}

interface Gust {
  x: number;
  y: number;
  direction: { x: number; y: number };
  magnitude: number;
  radius: number;
  life: number;
  maxLife: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    return parseInt(localStorage.getItem("flappyWindBestScore") || "0");
  });
  const [windEnergy, setWindEnergy] = useState(100);

  // Refs for stable access
  const isGameRunningRef = useRef(false);
  const gameOverRef = useRef(false);
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(bestScore);
  const windEnergyRef = useRef(100);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Wind drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawCurrentRef = useRef<{ x: number; y: number } | null>(null);

  // Screen shake
  const shakeRef = useRef({ x: 0, y: 0, intensity: 0 });

  // Game constants
  const GRAVITY = 800;
  const FLAP_POWER = -300;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const PIPE_WIDTH = 60;
  const PIPE_GAP = 150;
  const PIPE_SPEED = 200;

  // Wind constants
  const MAX_WIND_ENERGY = 100;
  const WIND_REGEN_RATE = 15;
  const GUST_COST_PER_PIXEL = 0.5;
  const GUST_BASE_POWER = 1200;
  const GUST_RADIUS = 100;
  const GUST_LIFE = 1.2;

  // Game state
  const birdRef = useRef<Bird>({
    x: 100,
    y: 300,
    radius: 20,
    color: "#FFD700",
    vy: 0,
    vx: 0,
    rotation: 0,
  });

  const pipesRef = useRef<Pipe[]>([]);
  const gustsRef = useRef<Gust[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nextPipeTimeRef = useRef(0);

  // Update refs when state changes
  useEffect(() => {
    isGameRunningRef.current = isGameRunning;
  }, [isGameRunning]);
  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    bestScoreRef.current = bestScore;
  }, [bestScore]);
  useEffect(() => {
    windEnergyRef.current = windEnergy;
  }, [windEnergy]);

  // Save best score to localStorage
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem("flappyWindBestScore", score.toString());
    }
  }, [score, bestScore]);

  // Simple audio feedback
  const playSound = useCallback(
    (frequency: number, duration: number, type: "sine" | "square" = "sine") => {
      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(
          frequency,
          audioContext.currentTime
        );
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + duration
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      } catch (e) {
        // Audio not supported, ignore
      }
    },
    []
  );

  // Create particles
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

  // Screen shake effect
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
      shakeRef.current.intensity *= Math.pow(0.1, deltaTime); // Use deltaTime for smooth decay

      if (shakeRef.current.intensity < 0.1) {
        shakeRef.current.intensity = 0;
        shakeRef.current.x = 0;
        shakeRef.current.y = 0;
      }
    }
  }, []);

  // Helper functions
  const getCanvasMousePos = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const distance = useCallback(
    (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
      return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    },
    []
  );

  const normalize = useCallback((vec: { x: number; y: number }) => {
    const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    return len > 0 ? { x: vec.x / len, y: vec.y / len } : { x: 0, y: 0 };
  }, []);

  // Create gust from drawing
  const createGust = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const strokeLength = distance(start, end);
      if (strokeLength < 20) return null;

      const cost = Math.min(
        strokeLength * GUST_COST_PER_PIXEL,
        windEnergyRef.current
      );
      if (cost < 10) return null;

      const direction = normalize({ x: end.x - start.x, y: end.y - start.y });
      const magnitude = Math.min(strokeLength * 2, GUST_BASE_POWER);

      setWindEnergy((prev) => Math.max(0, prev - cost));

      // Sound and particles for wind creation
      playSound(200 + Math.random() * 100, 0.1, "sine");
      createParticles(start.x, start.y, 5, "rgba(0, 200, 255, 0.8)");

      return {
        x: start.x,
        y: start.y,
        direction,
        magnitude,
        radius: GUST_RADIUS,
        life: GUST_LIFE,
        maxLife: GUST_LIFE,
      };
    },
    [
      distance,
      normalize,
      GUST_COST_PER_PIXEL,
      GUST_BASE_POWER,
      GUST_RADIUS,
      GUST_LIFE,
      playSound,
      createParticles,
    ]
  );

  // Mouse/touch handlers for wind drawing
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isGameRunningRef.current || gameOverRef.current) return;
      e.preventDefault();

      const pos = getCanvasMousePos(e.nativeEvent);
      setIsDrawing(true);
      drawStartRef.current = pos;
      drawCurrentRef.current = pos;
    },
    [getCanvasMousePos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing || !drawStartRef.current) return;
      e.preventDefault();

      drawCurrentRef.current = getCanvasMousePos(e.nativeEvent);
    },
    [isDrawing, getCanvasMousePos]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing || !drawStartRef.current || !drawCurrentRef.current)
        return;
      e.preventDefault();

      const gust = createGust(drawStartRef.current, drawCurrentRef.current);
      if (gust) {
        gustsRef.current.push(gust);
      }

      setIsDrawing(false);
      drawStartRef.current = null;
      drawCurrentRef.current = null;
    },
    [isDrawing, createGust]
  );

  // Handle regular clicks (for flapping and starting game)
  const handleCanvasClick = useCallback(() => {
    if (isDrawing) return;

    if (gameOverRef.current) {
      // Restart game
      setGameOver(false);
      setScore(0);
      setWindEnergy(100);
      setIsGameRunning(true);
      birdRef.current = {
        x: 100,
        y: 300,
        radius: 20,
        color: "#FFD700",
        vy: 0,
        vx: 0,
        rotation: 0,
      };
      pipesRef.current = [];
      gustsRef.current = [];
      particlesRef.current = [];
      nextPipeTimeRef.current = 2;
      playSound(440, 0.1);
      return;
    }

    if (!isGameRunningRef.current) {
      setIsGameRunning(true);
      nextPipeTimeRef.current = 2;
      playSound(330, 0.1);
    }

    // Flap
    if (!gameOverRef.current) {
      birdRef.current.vy = FLAP_POWER;
      playSound(440, 0.1);
      createParticles(birdRef.current.x, birdRef.current.y, 3, "#FFD700");
    }
  }, [isDrawing, FLAP_POWER, playSound, createParticles]);

  // Create pipe
  const createPipe = useCallback(
    (x: number): Pipe => {
      const minTopHeight = 100;
      const maxTopHeight = CANVAS_HEIGHT - PIPE_GAP - 100;
      const topHeight =
        Math.random() * (maxTopHeight - minTopHeight) + minTopHeight;

      return {
        x,
        topHeight,
        bottomY: topHeight + PIPE_GAP,
        width: PIPE_WIDTH,
        gap: PIPE_GAP,
        passed: false,
      };
    },
    [CANVAS_HEIGHT, PIPE_GAP, PIPE_WIDTH]
  );

  // Apply gust force to bird
  const applyGustForce = useCallback(
    (bird: Bird, gust: Gust, deltaTime: number) => {
      const dist = distance(bird, gust);
      if (dist < gust.radius) {
        const influence = 1 - (dist / gust.radius) ** 2;
        const force = gust.magnitude * influence;

        bird.vx += gust.direction.x * force * deltaTime;
        bird.vy += gust.direction.y * force * deltaTime;
      }
    },
    [distance]
  );

  // Update functions
  const updateBird = useCallback(
    (bird: Bird, deltaTime: number) => {
      if (gameOverRef.current) return;

      // Apply gravity
      bird.vy += GRAVITY * deltaTime;

      // Apply wind forces
      gustsRef.current.forEach((gust) => {
        applyGustForce(bird, gust, deltaTime);
      });

      // Apply air resistance to horizontal movement
      bird.vx *= 0.98;

      // Update position
      bird.x += bird.vx * deltaTime;
      bird.y += bird.vy * deltaTime;

      // Update rotation based on velocity (visual polish)
      bird.rotation = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 2, bird.vy * 0.003)
      );

      // Keep bird in horizontal bounds
      if (bird.x < bird.radius) {
        bird.x = bird.radius;
        bird.vx = 0;
      }
      if (bird.x > CANVAS_WIDTH - bird.radius) {
        bird.x = CANVAS_WIDTH - bird.radius;
        bird.vx = 0;
      }

      // Check vertical bounds
      if (bird.y < bird.radius || bird.y > CANVAS_HEIGHT - bird.radius) {
        setGameOver(true);
        playSound(150, 0.5, "square"); // Game over sound
        addScreenShake(15);
        createParticles(bird.x, bird.y, 10, "#FF0000");
      }
    },
    [
      GRAVITY,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      applyGustForce,
      playSound,
      addScreenShake,
      createParticles,
    ]
  );

  const updateParticles = useCallback((deltaTime: number) => {
    particlesRef.current = particlesRef.current.filter((particle) => {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.vy += 200 * deltaTime; // Gravity for particles
      particle.life -= deltaTime;
      return particle.life > 0;
    });
  }, []);

  const updateGusts = useCallback((deltaTime: number) => {
    gustsRef.current = gustsRef.current.filter((gust) => {
      gust.life -= deltaTime;
      return gust.life > 0;
    });
  }, []);

  const updatePipes = useCallback(
    (deltaTime: number) => {
      if (gameOverRef.current) return;

      pipesRef.current.forEach((pipe) => {
        pipe.x -= PIPE_SPEED * deltaTime;

        if (!pipe.passed && pipe.x + pipe.width < birdRef.current.x) {
          pipe.passed = true;
          setScore((prev) => prev + 1);
          playSound(523, 0.2); // Score sound
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
        pipesRef.current.push(createPipe(CANVAS_WIDTH));
        nextPipeTimeRef.current = 2.5;
      }

      // Check collisions
      for (const pipe of pipesRef.current) {
        if (checkCollision(birdRef.current, pipe)) {
          setGameOver(true);
          playSound(150, 0.5, "square");
          addScreenShake(15);
          createParticles(birdRef.current.x, birdRef.current.y, 10, "#FF0000");
          break;
        }
      }
    },
    [
      PIPE_SPEED,
      CANVAS_WIDTH,
      createPipe,
      playSound,
      addScreenShake,
      createParticles,
    ]
  );

  const updateWindEnergy = useCallback(
    (deltaTime: number) => {
      if (windEnergyRef.current < MAX_WIND_ENERGY) {
        setWindEnergy((prev) =>
          Math.min(MAX_WIND_ENERGY, prev + WIND_REGEN_RATE * deltaTime)
        );
      }
    },
    [MAX_WIND_ENERGY, WIND_REGEN_RATE]
  );

  // Collision detection
  const checkCollision = useCallback((bird: Bird, pipe: Pipe): boolean => {
    const birdLeft = bird.x - bird.radius;
    const birdRight = bird.x + bird.radius;
    const birdTop = bird.y - bird.radius;
    const birdBottom = bird.y + bird.radius;

    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + pipe.width;

    if (birdRight > pipeLeft && birdLeft < pipeRight) {
      if (birdTop < pipe.topHeight || birdBottom > pipe.bottomY) {
        return true;
      }
    }

    return false;
  }, []);

  // Drawing functions
  const drawBird = useCallback((ctx: CanvasRenderingContext2D, bird: Bird) => {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    // Bird body
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fillStyle = bird.color;
    ctx.fill();
    ctx.strokeStyle = "#FFA500";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Eye
    ctx.beginPath();
    ctx.arc(5, -5, 3, 0, Math.PI * 2);
    ctx.fillStyle = "black";
    ctx.fill();

    // Beak
    ctx.beginPath();
    ctx.moveTo(bird.radius - 5, 0);
    ctx.lineTo(bird.radius + 5, -3);
    ctx.lineTo(bird.radius + 5, 3);
    ctx.closePath();
    ctx.fillStyle = "#FF8C00";
    ctx.fill();

    ctx.restore();
  }, []);

  const drawPipe = useCallback(
    (ctx: CanvasRenderingContext2D, pipe: Pipe) => {
      const gradient = ctx.createLinearGradient(
        pipe.x,
        0,
        pipe.x + pipe.width,
        0
      );
      gradient.addColorStop(0, "#4CAF50");
      gradient.addColorStop(1, "#2E7D32");

      ctx.fillStyle = gradient;
      ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
      ctx.fillRect(
        pipe.x,
        pipe.bottomY,
        pipe.width,
        CANVAS_HEIGHT - pipe.bottomY
      );

      ctx.strokeStyle = "#1B5E20";
      ctx.lineWidth = 3;
      ctx.strokeRect(pipe.x, 0, pipe.width, pipe.topHeight);
      ctx.strokeRect(
        pipe.x,
        pipe.bottomY,
        pipe.width,
        CANVAS_HEIGHT - pipe.bottomY
      );
    },
    [CANVAS_HEIGHT]
  );

  const drawGust = useCallback((ctx: CanvasRenderingContext2D, gust: Gust) => {
    const alpha = gust.life / gust.maxLife;

    // Gust circle with pulsing effect
    const pulseRadius = gust.radius * (1 + Math.sin(Date.now() * 0.01) * 0.1);
    ctx.beginPath();
    ctx.arc(gust.x, gust.y, pulseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Direction arrow
    const arrowLength = 40;
    const endX = gust.x + gust.direction.x * arrowLength;
    const endY = gust.y + gust.direction.y * arrowLength;

    ctx.beginPath();
    ctx.moveTo(gust.x, gust.y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `rgba(0, 200, 255, ${alpha})`;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Arrow head
    const headLength = 12;
    const angle = Math.atan2(gust.direction.y, gust.direction.x);

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle - Math.PI / 6),
      endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle + Math.PI / 6),
      endY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.strokeStyle = `rgba(0, 200, 255, ${alpha * 1.2})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }, []);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach((particle) => {
      const alpha = particle.life / particle.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }, []);

  const drawWindStroke = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!isDrawing || !drawStartRef.current || !drawCurrentRef.current)
        return;

      // Animated stroke
      const pulseWidth = 3 + Math.sin(Date.now() * 0.01) * 1;
      ctx.beginPath();
      ctx.moveTo(drawStartRef.current.x, drawStartRef.current.y);
      ctx.lineTo(drawCurrentRef.current.x, drawCurrentRef.current.y);
      ctx.strokeStyle = "rgba(0, 200, 255, 0.8)";
      ctx.lineWidth = pulseWidth;
      ctx.stroke();

      // Preview circle
      ctx.beginPath();
      ctx.arc(
        drawStartRef.current.x,
        drawStartRef.current.y,
        GUST_RADIUS,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();
    },
    [isDrawing, GUST_RADIUS]
  );

  const drawUI = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      // Score with shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = "white";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`Score: ${scoreRef.current}`, CANVAS_WIDTH / 2, 50);

      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Best score
      if (bestScoreRef.current > 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.font = "18px Arial";
        ctx.fillText(`Best: ${bestScoreRef.current}`, CANVAS_WIDTH / 2, 75);
      }

      // Wind Energy Bar with glow effect
      const barWidth = 200;
      const barHeight = 20;
      const barX = CANVAS_WIDTH - barWidth - 20;
      const barY = 20;

      // Calculate energy percentage first
      const energyPercent = windEnergyRef.current / MAX_WIND_ENERGY;

      // Glow effect
      ctx.shadowColor = energyPercent > 0.5 ? "#4CAF50" : "#F44336";
      ctx.shadowBlur = 10;

      // Background
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Energy fill
      const fillColor = energyPercent > 0.3 ? "#4CAF50" : "#F44336";
      ctx.fillStyle = fillColor;
      ctx.fillRect(barX, barY, barWidth * energyPercent, barHeight);

      ctx.shadowBlur = 0;

      // Border
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barWidth, barHeight);

      // Label
      ctx.fillStyle = "white";
      ctx.font = "16px Arial";
      ctx.textAlign = "right";
      ctx.fillText("Wind Energy", barX - 10, barY + 15);

      // Instructions
      if (!isGameRunningRef.current && !gameOverRef.current) {
        ctx.fillStyle = "white";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          "Click to flap • Drag to create wind!",
          CANVAS_WIDTH / 2,
          180
        );
        ctx.font = "18px Arial";
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillText(
          "Use wind strategically - it's limited!",
          CANVAS_WIDTH / 2,
          210
        );
      }

      if (gameOverRef.current) {
        // Game over with glow
        ctx.shadowColor = "red";
        ctx.shadowBlur = 15;
        ctx.fillStyle = "red";
        ctx.font = "bold 36px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

        ctx.shadowBlur = 0;
        ctx.fillStyle = "white";
        ctx.font = "24px Arial";
        ctx.fillText(
          "Click to restart",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 50
        );

        if (scoreRef.current === bestScoreRef.current && scoreRef.current > 0) {
          ctx.fillStyle = "#FFD700";
          ctx.font = "bold 20px Arial";
          ctx.fillText(
            "NEW BEST SCORE!",
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2 + 80
          );
        }
      }
    },
    [CANVAS_WIDTH, CANVAS_HEIGHT, MAX_WIND_ENERGY]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Apply screen shake
    ctx.save();
    ctx.translate(shakeRef.current.x, shakeRef.current.y);

    ctx.clearRect(-20, -20, canvas.width + 40, canvas.height + 40);

    // Draw game objects
    pipesRef.current.forEach((pipe) => drawPipe(ctx, pipe));
    gustsRef.current.forEach((gust) => drawGust(ctx, gust));
    drawParticles(ctx);
    drawBird(ctx, birdRef.current);

    // Draw current wind stroke
    drawWindStroke(ctx);

    ctx.restore();

    // Draw UI (not affected by screen shake)
    drawUI(ctx);
  }, [drawPipe, drawGust, drawParticles, drawBird, drawWindStroke, drawUI]);

  // Game loop
  const gameLoop = useCallback(
    (currentTime: number) => {
      const deltaTime = lastTimeRef.current
        ? (currentTime - lastTimeRef.current) / 1000
        : 0;

      if (deltaTime > 0 && deltaTime < 0.1) {
        updateScreenShake(deltaTime);
        if (isGameRunningRef.current) {
          updateBird(birdRef.current, deltaTime);
          updatePipes(deltaTime);
          updateGusts(deltaTime);
          updateParticles(deltaTime);
          updateWindEnergy(deltaTime);
        }
      }

      render();
      lastTimeRef.current = currentTime;
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    },
    [
      updateScreenShake,
      updateBird,
      updatePipes,
      updateGusts,
      updateParticles,
      updateWindEnergy,
      render,
    ]
  );

  // Start game loop
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameLoop]);

  return (
    <div className="app">
      <h1>🌪️ Flappy Wind</h1>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{
          border: "2px solid #333",
          background: "linear-gradient(to bottom, #87CEEB, #98D8E8)",
          cursor: "crosshair",
          borderRadius: "10px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleCanvasClick}
      >
        Your browser doesn't support HTML5 Canvas
      </canvas>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          marginTop: "15px",
          fontSize: "18px",
          fontWeight: "bold",
        }}
      >
        <div>🎯 Score: {score}</div>
        <div>🏆 Best: {bestScore}</div>
        <div>🌪️ Wind: {Math.round(windEnergy)}%</div>
      </div>
      <p
        style={{
          textAlign: "center",
          margin: "15px 0",
          fontSize: "16px",
          color: "#666",
        }}
      >
        Click to flap • Drag to create wind gusts • Manage your energy wisely!
      </p>
    </div>
  );
}

export default App;

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
  rotation: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  width: number;
  gap: number;
  passed: boolean;
  pipeColor: string; // Add color variation
  animationOffset: number; // For pipe pop-in animation
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

interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
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
  const [gameOverOpacity, setGameOverOpacity] = useState(0);

  // Audio Context
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }, []);

  // Refs for stable access
  const isGameRunningRef = useRef(false);
  const gameOverRef = useRef(false);
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(bestScore);
  const windEnergyRef = useRef(100);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const gameTimeRef = useRef(0);

  // Wind drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawCurrentRef = useRef<{ x: number; y: number } | null>(null);

  // Screen shake
  const shakeRef = useRef({ x: 0, y: 0, intensity: 0 });

  // Environment state
  const cloudsRef = useRef<Cloud[]>([]);

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

  // Visual constants
  const PIPE_COLORS = ["#4CAF50", "#45A049", "#3E8E41", "#66BB6A"];

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

  // Initialize clouds
  useEffect(() => {
    for (let i = 0; i < 8; i++) {
      cloudsRef.current.push({
        x: Math.random() * (CANVAS_WIDTH + 200) - 200,
        y: Math.random() * CANVAS_HEIGHT * 0.4 + 50,
        size: Math.random() * 40 + 30,
        speed: Math.random() * 20 + 10,
        opacity: Math.random() * 0.3 + 0.2,
      });
    }
  }, []);

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

  // Animate game over overlay
  useEffect(() => {
    if (gameOver) {
      let opacity = 0;
      const fadeIn = () => {
        opacity += 0.05;
        setGameOverOpacity(Math.min(opacity, 1));
        if (opacity < 1) {
          requestAnimationFrame(fadeIn);
        }
      };
      fadeIn();
    } else {
      setGameOverOpacity(0);
    }
  }, [gameOver]);

  // Save best score to localStorage
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem("flappyWindBestScore", score.toString());
    }
  }, [score, bestScore]);

  // Audio functions
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

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + duration
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      } catch (e) {
        console.error("Audio error", e);
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
      shakeRef.current.intensity *= Math.pow(0.1, deltaTime);

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

  // Day/night color calculation
  const getDayNightColors = useCallback((gameTime: number, score: number) => {
    // Cycle through day/night based on time and score
    const cycleProgress = (gameTime * 0.1 + score * 0.3) % 10;
    const dayProgress = Math.sin(cycleProgress) * 0.5 + 0.5; // 0 = night, 1 = day

    const skyTop = {
      day: "#87CEEB",
      night: "#191970",
    };
    const skyBottom = {
      day: "#98D8E8",
      night: "#4B0082",
    };

    const interpolateColor = (color1: string, color2: string, t: number) => {
      const r1 = parseInt(color1.slice(1, 3), 16);
      const g1 = parseInt(color1.slice(3, 5), 16);
      const b1 = parseInt(color1.slice(5, 7), 16);
      const r2 = parseInt(color2.slice(1, 3), 16);
      const g2 = parseInt(color2.slice(3, 5), 16);
      const b2 = parseInt(color2.slice(5, 7), 16);

      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);

      return `#${r.toString(16).padStart(2, "0")}${g
        .toString(16)
        .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    };

    return {
      skyTop: interpolateColor(skyTop.night, skyTop.day, dayProgress),
      skyBottom: interpolateColor(skyBottom.night, skyBottom.day, dayProgress),
      cloudOpacity: dayProgress * 0.8 + 0.2,
    };
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
    [distance, normalize, playSound, createParticles]
  );

  // Mouse/touch handlers
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

  // Handle regular clicks
  const handleCanvasClick = useCallback(() => {
    if (isDrawing) return;

    if (gameOverRef.current) {
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
      gameTimeRef.current = 0;
      playSound(440, 0.1);
      return;
    }

    if (!isGameRunningRef.current) {
      setIsGameRunning(true);
      nextPipeTimeRef.current = 2;
      playSound(330, 0.1);
    }

    if (!gameOverRef.current) {
      birdRef.current.vy = FLAP_POWER;
      playSound(440, 0.1);
      createParticles(birdRef.current.x, birdRef.current.y, 3, "#FFD700");
    }
  }, [isDrawing, playSound, createParticles]);

  // Create pipe with enhanced visuals
  const createPipe = useCallback((x: number): Pipe => {
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
      pipeColor: PIPE_COLORS[Math.floor(Math.random() * PIPE_COLORS.length)],
      animationOffset: 0, // Will be used for pop-in animation
    };
  }, []);

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

      bird.vy += GRAVITY * deltaTime;

      gustsRef.current.forEach((gust) => {
        applyGustForce(bird, gust, deltaTime);
      });

      bird.vx *= 0.98;
      bird.x += bird.vx * deltaTime;
      bird.y += bird.vy * deltaTime;
      bird.rotation = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 2, bird.vy * 0.003)
      );

      if (bird.x < bird.radius) {
        bird.x = bird.radius;
        bird.vx = 0;
      }
      if (bird.x > CANVAS_WIDTH - bird.radius) {
        bird.x = CANVAS_WIDTH - bird.radius;
        bird.vx = 0;
      }

      if (bird.y < bird.radius || bird.y > CANVAS_HEIGHT - bird.radius) {
        setGameOver(true);
        playSound(150, 0.5, "square");
        addScreenShake(15);
        createParticles(bird.x, bird.y, 10, "#FF0000");
      }
    },
    [applyGustForce, playSound, addScreenShake, createParticles]
  );

  const updateClouds = useCallback((deltaTime: number) => {
    cloudsRef.current.forEach((cloud) => {
      cloud.x -= cloud.speed * deltaTime;
      if (cloud.x < -cloud.size - 50) {
        cloud.x = CANVAS_WIDTH + cloud.size;
        cloud.y = Math.random() * CANVAS_HEIGHT * 0.4 + 50;
      }
    });
  }, []);

  const updatePipes = useCallback(
    (deltaTime: number) => {
      if (gameOverRef.current) return;

      pipesRef.current.forEach((pipe) => {
        pipe.x -= PIPE_SPEED * deltaTime;

        // Animate pipe pop-in
        if (pipe.animationOffset < 1) {
          pipe.animationOffset += deltaTime * 3;
        }

        if (!pipe.passed && pipe.x + pipe.width < birdRef.current.x) {
          pipe.passed = true;
          setScore((prev) => prev + 1);
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
        pipesRef.current.push(createPipe(CANVAS_WIDTH + 50));
        nextPipeTimeRef.current = 2.5;
      }

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
    [createPipe, playSound, addScreenShake, createParticles]
  );

  const updateParticles = useCallback((deltaTime: number) => {
    particlesRef.current = particlesRef.current.filter((particle) => {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.vy += 200 * deltaTime;
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

  const updateWindEnergy = useCallback((deltaTime: number) => {
    if (windEnergyRef.current < MAX_WIND_ENERGY) {
      setWindEnergy((prev) =>
        Math.min(MAX_WIND_ENERGY, prev + WIND_REGEN_RATE * deltaTime)
      );
    }
  }, []);

  const updateGameTime = useCallback((deltaTime: number) => {
    if (isGameRunningRef.current) {
      gameTimeRef.current += deltaTime;
    }
  }, []);

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

  // Enhanced drawing functions
  const drawBackground = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const colors = getDayNightColors(gameTimeRef.current, scoreRef.current);

      // Gradient sky
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, colors.skyTop);
      gradient.addColorStop(1, colors.skyBottom);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw clouds
      cloudsRef.current.forEach((cloud) => {
        ctx.save();
        ctx.globalAlpha = cloud.opacity * colors.cloudOpacity;
        ctx.fillStyle = "#FFFFFF";

        // Draw fluffy cloud shape
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.size * 0.5, 0, Math.PI * 2);
        ctx.arc(
          cloud.x + cloud.size * 0.3,
          cloud.y,
          cloud.size * 0.4,
          0,
          Math.PI * 2
        );
        ctx.arc(
          cloud.x - cloud.size * 0.3,
          cloud.y,
          cloud.size * 0.4,
          0,
          Math.PI * 2
        );
        ctx.arc(
          cloud.x + cloud.size * 0.15,
          cloud.y - cloud.size * 0.2,
          cloud.size * 0.35,
          0,
          Math.PI * 2
        );
        ctx.arc(
          cloud.x - cloud.size * 0.15,
          cloud.y - cloud.size * 0.2,
          cloud.size * 0.35,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.restore();
      });
    },
    [getDayNightColors]
  );

  const drawBird = useCallback((ctx: CanvasRenderingContext2D, bird: Bird) => {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    // Bird shadow
    ctx.save();
    ctx.translate(2, 2);
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fillStyle = "black";
    ctx.fill();
    ctx.restore();

    // Bird body with gradient
    const birdGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, bird.radius);
    birdGradient.addColorStop(0, "#FFE135");
    birdGradient.addColorStop(1, "#FFB000");

    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fillStyle = birdGradient;
    ctx.fill();
    ctx.strokeStyle = "#FFA500";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Eye with highlight
    ctx.beginPath();
    ctx.arc(5, -5, 4, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -5, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "black";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, -6, 1, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();

    // Enhanced beak
    ctx.beginPath();
    ctx.moveTo(bird.radius - 5, 0);
    ctx.lineTo(bird.radius + 8, -4);
    ctx.lineTo(bird.radius + 8, 4);
    ctx.closePath();
    ctx.fillStyle = "#FF8C00";
    ctx.fill();
    ctx.strokeStyle = "#FF6347";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }, []);

  const drawPipe = useCallback((ctx: CanvasRenderingContext2D, pipe: Pipe) => {
    // Animate pipe entrance
    const animScale = Math.min(pipe.animationOffset, 1);
    const easeOut = 1 - Math.pow(1 - animScale, 3);
    const currentWidth = pipe.width * easeOut;
    const offsetX = (pipe.width - currentWidth) / 2;

    // Pipe shadows
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(pipe.x + offsetX + 3, 3, currentWidth, pipe.topHeight);
    ctx.fillRect(
      pipe.x + offsetX + 3,
      pipe.bottomY + 3,
      currentWidth,
      CANVAS_HEIGHT - pipe.bottomY
    );

    // Main pipe gradient
    const pipeGradient = ctx.createLinearGradient(
      pipe.x + offsetX,
      0,
      pipe.x + offsetX + currentWidth,
      0
    );
    pipeGradient.addColorStop(0, pipe.pipeColor);
    pipeGradient.addColorStop(0.3, "#5CBF60");
    pipeGradient.addColorStop(0.7, pipe.pipeColor);
    pipeGradient.addColorStop(1, "#2E7D32");

    // Top pipe
    ctx.fillStyle = pipeGradient;
    ctx.fillRect(pipe.x + offsetX, 0, currentWidth, pipe.topHeight);

    // Bottom pipe
    ctx.fillRect(
      pipe.x + offsetX,
      pipe.bottomY,
      currentWidth,
      CANVAS_HEIGHT - pipe.bottomY
    );

    // Pipe highlights and shadows for 3D effect
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(pipe.x + offsetX, 0, 8, pipe.topHeight);
    ctx.fillRect(
      pipe.x + offsetX,
      pipe.bottomY,
      8,
      CANVAS_HEIGHT - pipe.bottomY
    );

    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(pipe.x + offsetX + currentWidth - 8, 0, 8, pipe.topHeight);
    ctx.fillRect(
      pipe.x + offsetX + currentWidth - 8,
      pipe.bottomY,
      8,
      CANVAS_HEIGHT - pipe.bottomY
    );

    // Pipe borders
    ctx.strokeStyle = "#1B5E20";
    ctx.lineWidth = 2;
    ctx.strokeRect(pipe.x + offsetX, 0, currentWidth, pipe.topHeight);
    ctx.strokeRect(
      pipe.x + offsetX,
      pipe.bottomY,
      currentWidth,
      CANVAS_HEIGHT - pipe.bottomY
    );
  }, []);

  const drawGust = useCallback((ctx: CanvasRenderingContext2D, gust: Gust) => {
    const alpha = gust.life / gust.maxLife;
    const pulseRadius = gust.radius * (1 + Math.sin(Date.now() * 0.01) * 0.1);

    // Gust circle with animated rings
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(gust.x, gust.y, pulseRadius - i * 15, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * (0.4 - i * 0.1)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Enhanced direction arrow
    const arrowLength = 45;
    const endX = gust.x + gust.direction.x * arrowLength;
    const endY = gust.y + gust.direction.y * arrowLength;

    const arrowGradient = ctx.createLinearGradient(gust.x, gust.y, endX, endY);
    arrowGradient.addColorStop(0, `rgba(0, 200, 255, ${alpha * 0.8})`);
    arrowGradient.addColorStop(1, `rgba(0, 150, 255, ${alpha})`);

    ctx.beginPath();
    ctx.moveTo(gust.x, gust.y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = arrowGradient;
    ctx.lineWidth = 5;
    ctx.stroke();

    // Enhanced arrow head
    const headLength = 15;
    const angle = Math.atan2(gust.direction.y, gust.direction.x);

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle - Math.PI / 6),
      endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      endX - headLength * Math.cos(angle + Math.PI / 6),
      endY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = `rgba(0, 200, 255, ${alpha * 1.2})`;
    ctx.fill();
  }, []);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach((particle) => {
      const alpha = particle.life / particle.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();

      // Particle glow effect
      ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }, []);

  const drawWindStroke = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!isDrawing || !drawStartRef.current || !drawCurrentRef.current)
        return;

      const pulseWidth = 4 + Math.sin(Date.now() * 0.015) * 1.5;

      // Stroke with glow
      ctx.save();
      ctx.shadowColor = "rgba(0, 200, 255, 0.8)";
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.moveTo(drawStartRef.current.x, drawStartRef.current.y);
      ctx.lineTo(drawCurrentRef.current.x, drawCurrentRef.current.y);
      ctx.strokeStyle = "rgba(0, 200, 255, 0.9)";
      ctx.lineWidth = pulseWidth;
      ctx.stroke();

      ctx.restore();

      // Preview circle with animation
      const pulseRadius =
        GUST_RADIUS * (1 + Math.sin(Date.now() * 0.02) * 0.15);
      ctx.beginPath();
      ctx.arc(
        drawStartRef.current.x,
        drawStartRef.current.y,
        pulseRadius,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 3;
      ctx.stroke();
    },
    [isDrawing]
  );

  // Enhanced UI with arcade styling
  const drawUI = useCallback((ctx: CanvasRenderingContext2D) => {
    // Pixel-style score
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = "white";
    ctx.font = "bold 36px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `SCORE: ${scoreRef.current.toString().padStart(3, "0")}`,
      CANVAS_WIDTH / 2,
      60
    );

    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.restore();

    // Best score with retro styling
    if (bestScoreRef.current > 0) {
      ctx.fillStyle = "rgba(255, 215, 0, 0.9)";
      ctx.font = "bold 18px 'Courier New', monospace";
      ctx.fillText(
        `BEST: ${bestScoreRef.current.toString().padStart(3, "0")}`,
        CANVAS_WIDTH / 2,
        85
      );
    }

    // Enhanced Wind Energy Bar
    const barWidth = 220;
    const barHeight = 24;
    const barX = CANVAS_WIDTH - barWidth - 30;
    const barY = 50; // Moved down to make room for label above
    const energyPercent = windEnergyRef.current / MAX_WIND_ENERGY;

    // Energy label above the bar
    ctx.fillStyle = "white";
    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("WIND ENERGY", barX + barWidth / 2, barY - 8);

    // Bar background with border
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(barX - 4, barY - 4, barWidth + 8, barHeight + 8);

    ctx.fillStyle = "rgba(40, 40, 40, 0.9)";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Animated energy fill with gradient
    const fillWidth = barWidth * energyPercent;
    const energyGradient = ctx.createLinearGradient(
      barX,
      barY,
      barX + fillWidth,
      barY
    );

    if (energyPercent > 0.6) {
      energyGradient.addColorStop(0, "#4CAF50");
      energyGradient.addColorStop(1, "#8BC34A");
    } else if (energyPercent > 0.3) {
      energyGradient.addColorStop(0, "#FF9800");
      energyGradient.addColorStop(1, "#FFC107");
    } else {
      energyGradient.addColorStop(0, "#F44336");
      energyGradient.addColorStop(1, "#FF5722");
    }

    ctx.fillStyle = energyGradient;
    ctx.fillRect(barX, barY, fillWidth, barHeight);

    // Energy bar segments
    const segments = 10;
    const segmentWidth = barWidth / segments;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 1; i < segments; i++) {
      const segmentX = barX + i * segmentWidth;
      ctx.beginPath();
      ctx.moveTo(segmentX, barY);
      ctx.lineTo(segmentX, barY + barHeight);
      ctx.stroke();
    }

    // Bar border with glow
    ctx.save();
    ctx.shadowColor = energyPercent > 0.5 ? "#4CAF50" : "#F44336";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    ctx.restore();

    // Energy percentage inside the bar
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.fillText(
      `${Math.round(energyPercent * 100)}%`,
      barX + barWidth / 2,
      barY + 17
    );

    // Instructions with retro styling
    if (!isGameRunningRef.current && !gameOverRef.current) {
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 28px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText("CLICK TO FLAP", CANVAS_WIDTH / 2, 200);

      ctx.fillStyle = "#00BFFF";
      ctx.font = "bold 24px 'Courier New', monospace";
      ctx.fillText("DRAG TO CREATE WIND", CANVAS_WIDTH / 2, 235);

      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = "18px 'Courier New', monospace";
      ctx.fillText("MANAGE YOUR ENERGY WISELY!", CANVAS_WIDTH / 2, 265);

      ctx.restore();
    }
  }, []);

  // Game Over card overlay
  const drawGameOverCard = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!gameOverRef.current) return;

      const cardWidth = 400;
      const cardHeight = 300;
      const cardX = (CANVAS_WIDTH - cardWidth) / 2;
      const cardY = (CANVAS_HEIGHT - cardHeight) / 2;

      ctx.save();
      ctx.globalAlpha = gameOverOpacity;

      // Card shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(cardX + 8, cardY + 8, cardWidth, cardHeight);

      // Card background with gradient
      const cardGradient = ctx.createLinearGradient(
        cardX,
        cardY,
        cardX,
        cardY + cardHeight
      );
      cardGradient.addColorStop(0, "rgba(60, 60, 60, 0.95)");
      cardGradient.addColorStop(1, "rgba(30, 30, 30, 0.95)");

      ctx.fillStyle = cardGradient;
      ctx.fillRect(cardX, cardY, cardWidth, cardHeight);

      // Card border with red glow
      ctx.save();
      ctx.shadowColor = "#FF0000";
      ctx.shadowBlur = 15;
      ctx.strokeStyle = "#FF4444";
      ctx.lineWidth = 4;
      ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);
      ctx.restore();

      // Game Over title
      ctx.fillStyle = "#FF4444";
      ctx.font = "bold 48px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, cardY + 80);

      // Final score
      ctx.fillStyle = "white";
      ctx.font = "bold 24px 'Courier New', monospace";
      ctx.fillText(
        `FINAL SCORE: ${scoreRef.current}`,
        CANVAS_WIDTH / 2,
        cardY + 130
      );

      // Best score indicator
      if (bestScoreRef.current > 0) {
        ctx.fillStyle =
          scoreRef.current === bestScoreRef.current
            ? "#FFD700"
            : "rgba(255, 255, 255, 0.7)";
        ctx.font = "20px 'Courier New', monospace";
        ctx.fillText(
          `BEST: ${bestScoreRef.current}`,
          CANVAS_WIDTH / 2,
          cardY + 160
        );
      }

      // New best score celebration
      if (scoreRef.current === bestScoreRef.current && scoreRef.current > 0) {
        const pulseScale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
        ctx.save();
        ctx.scale(pulseScale, pulseScale);
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 20px 'Courier New', monospace";
        ctx.fillText(
          "NEW BEST SCORE!",
          CANVAS_WIDTH / 2 / pulseScale,
          (cardY + 190) / pulseScale
        );
        ctx.restore();
      }

      // Restart instruction with pulsing effect
      const pulseAlpha = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;
      ctx.fillStyle = `rgba(0, 255, 0, ${pulseAlpha})`;
      ctx.font = "bold 22px 'Courier New', monospace";
      ctx.fillText("CLICK TO RESTART", CANVAS_WIDTH / 2, cardY + 240);

      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.restore();
    },
    [gameOverOpacity]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Apply screen shake
    ctx.save();
    ctx.translate(shakeRef.current.x, shakeRef.current.y);

    // Clear and draw background
    drawBackground(ctx);

    // Draw game objects
    pipesRef.current.forEach((pipe) => drawPipe(ctx, pipe));
    gustsRef.current.forEach((gust) => drawGust(ctx, gust));
    drawParticles(ctx);
    drawBird(ctx, birdRef.current);
    drawWindStroke(ctx);

    ctx.restore();

    // Draw UI (not affected by screen shake)
    drawUI(ctx);
    drawGameOverCard(ctx);
  }, [
    drawBackground,
    drawPipe,
    drawGust,
    drawParticles,
    drawBird,
    drawWindStroke,
    drawUI,
    drawGameOverCard,
  ]);

  // Game loop
  const gameLoop = useCallback(
    (currentTime: number) => {
      const deltaTime = lastTimeRef.current
        ? (currentTime - lastTimeRef.current) / 1000
        : 0;

      if (deltaTime > 0 && deltaTime < 0.1) {
        updateScreenShake(deltaTime);
        updateClouds(deltaTime);
        updateGameTime(deltaTime);

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
      updateClouds,
      updateGameTime,
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
      <h1
        style={{
          background: "linear-gradient(45deg, #FFD700, #FF6B35)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontSize: "3em",
          textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
          marginBottom: "20px",
        }}
      >
        🌪️ FLAPPY WIND
      </h1>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{
          border: "4px solid #333",
          background: "linear-gradient(to bottom, #87CEEB, #98D8E8)",
          cursor: "crosshair",
          borderRadius: "15px",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1)",
          transition: "transform 0.2s ease",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleCanvasClick}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        Your browser doesn't support HTML5 Canvas
      </canvas>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "30px",
          marginTop: "20px",
          fontSize: "20px",
          fontWeight: "bold",
          fontFamily: "'Courier New', monospace",
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
          🎯 SCORE: {score.toString().padStart(3, "0")}
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
          🏆 BEST: {bestScore.toString().padStart(3, "0")}
        </div>
        <div
          style={{
            background: `linear-gradient(135deg, ${
              windEnergy > 50
                ? "#4facfe 0%, #00f2fe 100%"
                : "#fa709a 0%, #fee140 100%"
            })`,
            padding: "10px 20px",
            borderRadius: "25px",
            color: "white",
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
          }}
        >
          🌪️ WIND: {Math.round(windEnergy)}%
        </div>
      </div>
      <p
        style={{
          textAlign: "center",
          margin: "20px 0",
          fontSize: "18px",
          color: "#333",
          fontFamily: "'Courier New', monospace",
          fontWeight: "bold",
          textShadow: "1px 1px 2px rgba(0,0,0,0.1)",
        }}
      >
        CLICK TO FLAP • DRAG TO CREATE WIND GUSTS • MANAGE YOUR ENERGY WISELY!
      </p>
    </div>
  );
}

export default App;

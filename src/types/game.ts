export interface Bird {
  x: number;
  y: number;
  radius: number;
  color: string;
  vy: number;
  vx: number;
  rotation: number;
}

export interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  width: number;
  gap: number;
  passed: boolean;
  pipeColor: string;
  animationOffset: number;
}

export interface Gust {
  x: number;
  y: number;
  direction: { x: number; y: number };
  magnitude: number;
  radius: number;
  life: number;
  maxLife: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

export interface GameState {
  isRunning: boolean;
  gameOver: boolean;
  score: number;
  bestScore: number;
  windEnergy: number;
  gameOverOpacity: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

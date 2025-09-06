import type { Bird, Gust, Particle, Pipe, Cloud } from "../types/game";
import { GAME_PHYSICS, PIPE_COLORS } from "./constants";
import { distance } from "./gameHelpers";

export const applyGustForce = (bird: Bird, gust: Gust) => {
  const dist = distance(bird, gust);
  if (dist < gust.radius) {
    const influence = 1 - (dist / gust.radius) ** 2;
    const force = gust.magnitude * influence * 0.5;
    bird.vx += gust.direction.x * force;
    bird.vy += gust.direction.y * force;
  }
};

export const updateBird = (
  bird: Bird,
  deltaTime: number,
  gusts: Gust[],
  canvasWidth: number,
  canvasHeight: number,
  onGameOver: () => void,
  isGameOver: boolean = false
) => {
  // If game is over, freeze the bird in place
  if (isGameOver) {
    bird.vx = 0;
    bird.vy = 0;
    return;
  }

  bird.vy += GAME_PHYSICS.GRAVITY * deltaTime;

  gusts.forEach((gust) => {
    applyGustForce(bird, gust);
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
  if (bird.x > canvasWidth - bird.radius) {
    bird.x = canvasWidth - bird.radius;
    bird.vx = 0;
  }

  if (bird.y < bird.radius || bird.y > canvasHeight - bird.radius) {
    onGameOver();
    bird.vx = 0;
    bird.vy = 0;
  }
};

export const updateParticles = (
  particles: Particle[],
  deltaTime: number
): Particle[] => {
  return particles.filter((particle) => {
    particle.x += particle.vx * deltaTime;
    particle.y += particle.vy * deltaTime;
    particle.vy += 200 * deltaTime;
    particle.life -= deltaTime;
    return particle.life > 0;
  });
};

export const updateGusts = (gusts: Gust[], deltaTime: number): Gust[] => {
  return gusts.filter((gust) => {
    gust.life -= deltaTime;
    return gust.life > 0;
  });
};

export const updateClouds = (
  clouds: Cloud[],
  deltaTime: number,
  canvasWidth: number,
  canvasHeight: number
) => {
  clouds.forEach((cloud) => {
    cloud.x -= cloud.speed * deltaTime;
    if (cloud.x < -cloud.size - 50) {
      cloud.x = canvasWidth + cloud.size;
      cloud.y = Math.random() * canvasHeight * 0.4 + 50;
    }
  });
};

export const createPipe = (
  x: number,
  canvasHeight: number,
  pipeWidth: number,
  pipeGap: number
): Pipe => {
  const minTopHeight = canvasHeight * 0.15;
  const maxTopHeight = canvasHeight - pipeGap - canvasHeight * 0.15;
  const topHeight =
    Math.random() * (maxTopHeight - minTopHeight) + minTopHeight;

  return {
    x,
    topHeight,
    bottomY: topHeight + pipeGap,
    width: pipeWidth,
    gap: pipeGap,
    passed: false,
    pipeColor: PIPE_COLORS[Math.floor(Math.random() * PIPE_COLORS.length)],
    animationOffset: 0,
  };
};

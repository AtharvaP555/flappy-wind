export const distance = (
  p1: { x: number; y: number },
  p2: { x: number; y: number }
) => {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
};

export const normalize = (vec: { x: number; y: number }) => {
  const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
  return len > 0 ? { x: vec.x / len, y: vec.y / len } : { x: 0, y: 0 };
};

export const getCanvasMousePos = (
  e: MouseEvent | TouchEvent,
  canvas: HTMLCanvasElement,
  canvasWidth: number,
  canvasHeight: number
) => {
  const rect = canvas.getBoundingClientRect();
  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

  const scaleX = canvasWidth / rect.width;
  const scaleY = canvasHeight / rect.height;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
};

export const checkCollision = (
  bird: import("../types/game").Bird,
  pipe: import("../types/game").Pipe
): boolean => {
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
};

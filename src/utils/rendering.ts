import type { Bird, Pipe, Gust, Particle, Cloud } from "../types/game";

// Day/night color calculation
export const getDayNightColors = (gameTime: number, score: number) => {
  const cycleProgress = (gameTime * 0.1 + score * 0.3) % 10;
  const dayProgress = Math.sin(cycleProgress) * 0.5 + 0.5;

  const skyTop = { day: "#87CEEB", night: "#191970" };
  const skyBottom = { day: "#98D8E8", night: "#4B0082" };

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
};

export const drawBackground = (
  ctx: CanvasRenderingContext2D,
  clouds: Cloud[],
  canvasWidth: number,
  canvasHeight: number,
  gameTime: number,
  score: number
) => {
  const colors = getDayNightColors(gameTime, score);

  const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  gradient.addColorStop(0, colors.skyTop);
  gradient.addColorStop(1, colors.skyBottom);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  clouds.forEach((cloud) => {
    ctx.save();
    ctx.globalAlpha = cloud.opacity * colors.cloudOpacity;
    ctx.fillStyle = "#FFFFFF";

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
};

export const drawBird = (ctx: CanvasRenderingContext2D, bird: Bird) => {
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
  ctx.lineWidth = Math.max(2, bird.radius * 0.15);
  ctx.stroke();

  // Responsive eye
  const eyeSize = Math.max(2, bird.radius * 0.2);
  ctx.beginPath();
  ctx.arc(bird.radius * 0.25, -bird.radius * 0.25, eyeSize, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    bird.radius * 0.25,
    -bird.radius * 0.25,
    eyeSize * 0.6,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "black";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    bird.radius * 0.3,
    -bird.radius * 0.3,
    eyeSize * 0.25,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "white";
  ctx.fill();

  // Enhanced beak
  const beakSize = bird.radius * 0.4;
  ctx.beginPath();
  ctx.moveTo(bird.radius - 5, 0);
  ctx.lineTo(bird.radius + beakSize, -beakSize * 0.5);
  ctx.lineTo(bird.radius + beakSize, beakSize * 0.5);
  ctx.closePath();
  ctx.fillStyle = "#FF8C00";
  ctx.fill();
  ctx.strokeStyle = "#FF6347";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
};

export const drawPipe = (
  ctx: CanvasRenderingContext2D,
  pipe: Pipe,
  canvasHeight: number
) => {
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
    canvasHeight - pipe.bottomY
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

  ctx.fillStyle = pipeGradient;
  ctx.fillRect(pipe.x + offsetX, 0, currentWidth, pipe.topHeight);
  ctx.fillRect(
    pipe.x + offsetX,
    pipe.bottomY,
    currentWidth,
    canvasHeight - pipe.bottomY
  );

  // 3D highlights
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillRect(
    pipe.x + offsetX,
    0,
    Math.max(4, currentWidth * 0.15),
    pipe.topHeight
  );
  ctx.fillRect(
    pipe.x + offsetX,
    pipe.bottomY,
    Math.max(4, currentWidth * 0.15),
    canvasHeight - pipe.bottomY
  );

  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(
    pipe.x + offsetX + currentWidth - Math.max(4, currentWidth * 0.15),
    0,
    Math.max(4, currentWidth * 0.15),
    pipe.topHeight
  );
  ctx.fillRect(
    pipe.x + offsetX + currentWidth - Math.max(4, currentWidth * 0.15),
    pipe.bottomY,
    Math.max(4, currentWidth * 0.15),
    canvasHeight - pipe.bottomY
  );

  // Borders
  ctx.strokeStyle = "#1B5E20";
  ctx.lineWidth = 2;
  ctx.strokeRect(pipe.x + offsetX, 0, currentWidth, pipe.topHeight);
  ctx.strokeRect(
    pipe.x + offsetX,
    pipe.bottomY,
    currentWidth,
    canvasHeight - pipe.bottomY
  );
};

export const drawGust = (ctx: CanvasRenderingContext2D, gust: Gust) => {
  const alpha = gust.life / gust.maxLife;
  const pulseRadius = gust.radius * (1 + Math.sin(Date.now() * 0.01) * 0.1);

  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(gust.x, gust.y, pulseRadius - i * 15, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * (0.4 - i * 0.1)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const arrowLength = Math.max(30, gust.radius * 0.5);
  const endX = gust.x + gust.direction.x * arrowLength;
  const endY = gust.y + gust.direction.y * arrowLength;

  ctx.beginPath();
  ctx.moveTo(gust.x, gust.y);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = `rgba(0, 200, 255, ${alpha})`;
  ctx.lineWidth = Math.max(3, gust.radius * 0.06);
  ctx.stroke();

  const headLength = Math.max(10, arrowLength * 0.3);
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
};

export const drawParticles = (
  ctx: CanvasRenderingContext2D,
  particles: Particle[]
) => {
  particles.forEach((particle) => {
    const alpha = particle.life / particle.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = alpha * 0.3;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
};

export const drawWindStroke = (
  ctx: CanvasRenderingContext2D,
  isDrawing: boolean,
  drawStart: { x: number; y: number } | null,
  drawCurrent: { x: number; y: number } | null,
  gustRadius: number,
  canvasWidth: number
) => {
  if (!isDrawing || !drawStart || !drawCurrent) return;

  const pulseWidth =
    Math.max(2, canvasWidth * 0.006) + Math.sin(Date.now() * 0.015) * 1.5;

  ctx.save();
  ctx.shadowColor = "rgba(0, 200, 255, 0.8)";
  ctx.shadowBlur = 15;

  ctx.beginPath();
  ctx.moveTo(drawStart.x, drawStart.y);
  ctx.lineTo(drawCurrent.x, drawCurrent.y);
  ctx.strokeStyle = "rgba(0, 200, 255, 0.9)";
  ctx.lineWidth = pulseWidth;
  ctx.stroke();

  ctx.restore();

  const pulseRadius = gustRadius * (1 + Math.sin(Date.now() * 0.02) * 0.15);
  ctx.beginPath();
  ctx.arc(drawStart.x, drawStart.y, pulseRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 3;
  ctx.stroke();
};

export const drawUI = (
  ctx: CanvasRenderingContext2D,
  score: number,
  bestScore: number,
  windEnergy: number,
  maxWindEnergy: number,
  canvasWidth: number,
  canvasHeight: number,
  isGameRunning: boolean,
  gameOver: boolean,
  isMobile: boolean
) => {
  const fontSize = Math.max(16, canvasWidth * 0.045);
  const smallFontSize = Math.max(12, canvasWidth * 0.025);

  // Score - responsive positioning and sizing
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = Math.max(2, canvasWidth * 0.005);
  ctx.shadowOffsetY = Math.max(2, canvasWidth * 0.005);

  ctx.fillStyle = "white";
  ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
  ctx.textAlign = "center";
  ctx.fillText(
    `SCORE: ${score.toString().padStart(3, "0")}`,
    canvasWidth / 2,
    fontSize + 10
  );

  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.restore();

  // Best score
  if (bestScore > 0) {
    ctx.fillStyle = "rgba(255, 215, 0, 0.9)";
    ctx.font = `bold ${smallFontSize}px 'Courier New', monospace`;
    ctx.fillText(
      `BEST: ${bestScore.toString().padStart(3, "0")}`,
      canvasWidth / 2,
      fontSize + 30
    );
  }

  // Responsive Wind Energy Bar
  const barWidth = Math.min(220, canvasWidth * 0.35);
  const barHeight = Math.max(16, canvasHeight * 0.035);
  const barX = canvasWidth - barWidth - canvasWidth * 0.05;
  const barY = canvasHeight * 0.08;
  const energyPercent = windEnergy / maxWindEnergy;

  // Energy label above the bar
  ctx.fillStyle = "white";
  ctx.font = `bold ${Math.max(
    10,
    canvasWidth * 0.02
  )}px 'Courier New', monospace`;
  ctx.textAlign = "center";
  ctx.fillText("WIND ENERGY", barX + barWidth / 2, barY - 8);

  // Bar background
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(barX - 4, barY - 4, barWidth + 8, barHeight + 8);

  ctx.fillStyle = "rgba(40, 40, 40, 0.9)";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Energy fill
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

  // Bar border
  ctx.save();
  ctx.shadowColor = energyPercent > 0.5 ? "#4CAF50" : "#F44336";
  ctx.shadowBlur = 8;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
  ctx.restore();

  // Energy percentage
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.font = `bold ${Math.max(
    8,
    canvasWidth * 0.015
  )}px 'Courier New', monospace`;
  ctx.fillText(
    `${Math.round(energyPercent * 100)}%`,
    barX + barWidth / 2,
    barY + barHeight - 4
  );

  // Responsive instructions
  if (!isGameRunning && !gameOver) {
    const instructionY = canvasHeight * 0.4;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = "#FFD700";
    ctx.font = `bold ${Math.max(
      18,
      canvasWidth * 0.035
    )}px 'Courier New', monospace`;
    ctx.textAlign = "center";
    ctx.fillText(
      isMobile ? "TAP TO FLAP" : "CLICK TO FLAP",
      canvasWidth / 2,
      instructionY
    );

    ctx.fillStyle = "#00BFFF";
    ctx.font = `bold ${Math.max(
      16,
      canvasWidth * 0.03
    )}px 'Courier New', monospace`;
    ctx.fillText(
      isMobile ? "DRAG TO CREATE WIND" : "DRAG TO CREATE WIND",
      canvasWidth / 2,
      instructionY + 35
    );

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = `${Math.max(
      12,
      canvasWidth * 0.025
    )}px 'Courier New', monospace`;
    ctx.fillText(
      "MANAGE YOUR ENERGY WISELY!",
      canvasWidth / 2,
      instructionY + 65
    );

    ctx.restore();
  }
};

export const drawGameOverCard = (
  ctx: CanvasRenderingContext2D,
  score: number,
  bestScore: number,
  gameOverOpacity: number,
  canvasWidth: number,
  canvasHeight: number,
  isMobile: boolean
) => {
  const cardWidth = Math.min(400, canvasWidth * 0.8);
  const cardHeight = Math.min(300, canvasHeight * 0.6);
  const cardX = (canvasWidth - cardWidth) / 2;
  const cardY = (canvasHeight - cardHeight) / 2;

  ctx.save();
  ctx.globalAlpha = gameOverOpacity;

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(cardX + 8, cardY + 8, cardWidth, cardHeight);

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

  ctx.save();
  ctx.shadowColor = "#FF0000";
  ctx.shadowBlur = 15;
  ctx.strokeStyle = "#FF4444";
  ctx.lineWidth = 4;
  ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);
  ctx.restore();

  const titleFontSize = Math.max(24, cardWidth * 0.08);
  const textFontSize = Math.max(16, cardWidth * 0.05);

  ctx.fillStyle = "#FF4444";
  ctx.font = `bold ${titleFontSize}px 'Courier New', monospace`;
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.fillText("GAME OVER", canvasWidth / 2, cardY + titleFontSize + 20);

  ctx.fillStyle = "white";
  ctx.font = `bold ${textFontSize}px 'Courier New', monospace`;
  ctx.fillText(
    `FINAL SCORE: ${score}`,
    canvasWidth / 2,
    cardY + titleFontSize + 60
  );

  if (bestScore > 0) {
    ctx.fillStyle =
      score === bestScore ? "#FFD700" : "rgba(255, 255, 255, 0.7)";
    ctx.font = `${textFontSize * 0.8}px 'Courier New', monospace`;
    ctx.fillText(
      `BEST: ${bestScore}`,
      canvasWidth / 2,
      cardY + titleFontSize + 90
    );
  }

  if (score === bestScore && score > 0) {
    const pulseScale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
    ctx.save();
    ctx.scale(pulseScale, pulseScale);
    ctx.fillStyle = "#FFD700";
    ctx.font = `bold ${textFontSize * 0.7}px 'Courier New', monospace`;
    ctx.fillText(
      "NEW BEST SCORE!",
      canvasWidth / 2 / pulseScale,
      (cardY + titleFontSize + 120) / pulseScale
    );
    ctx.restore();
  }

  const pulseAlpha = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;
  ctx.fillStyle = `rgba(0, 255, 0, ${pulseAlpha})`;
  ctx.font = `bold ${textFontSize * 0.9}px 'Courier New', monospace`;
  ctx.fillText(
    isMobile ? "TAP TO RESTART" : "CLICK TO RESTART",
    canvasWidth / 2,
    cardY + cardHeight - 30
  );

  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.restore();
};

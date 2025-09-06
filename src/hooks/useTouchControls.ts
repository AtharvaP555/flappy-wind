import { useRef, useEffect, useState, useCallback } from "react";

interface TouchControlsProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  onTap: () => void;
  onDragEnd: (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => void;
  gameRunning: boolean;
  gameOver: boolean;
}

export const useTouchControls = ({
  canvasRef,
  canvasWidth,
  canvasHeight,
  onTap,
  onDragEnd,
  gameRunning,
  gameOver,
}: TouchControlsProps) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawCurrentRef = useRef<{ x: number; y: number } | null>(null);

  const getCanvasMousePos = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Scale coordinates to match internal canvas dimensions
      const scaleX = canvasWidth / rect.width;
      const scaleY = canvasHeight / rect.height;

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [canvasRef, canvasWidth, canvasHeight]
  );

  // Event handlers
  const handleStart = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!gameRunning && !gameOver) {
        onTap();
        return;
      }

      if (gameOver) {
        onTap();
        return;
      }

      if (!gameRunning) return;

      const pos = getCanvasMousePos(e);
      setIsDrawing(true);
      drawStartRef.current = pos;
      drawCurrentRef.current = pos;
    },
    [getCanvasMousePos, gameRunning, gameOver, onTap]
  );

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;

      const pos = getCanvasMousePos(e);
      drawCurrentRef.current = pos;
    },
    [isDrawing, getCanvasMousePos]
  );

  const handleEnd = useCallback(() => {
    if (!isDrawing || !drawStartRef.current || !drawCurrentRef.current) {
      // This was a tap
      if (gameRunning && !gameOver) {
        onTap();
      }
      return;
    }

    // This was a drag - create wind gust
    const distance = Math.sqrt(
      Math.pow(drawCurrentRef.current.x - drawStartRef.current.x, 2) +
        Math.pow(drawCurrentRef.current.y - drawStartRef.current.y, 2)
    );

    if (distance > 20) {
      onDragEnd(drawStartRef.current, drawCurrentRef.current);
    } else {
      // Short drag treated as tap
      if (gameRunning && !gameOver) {
        onTap();
      }
    }

    setIsDrawing(false);
    drawStartRef.current = null;
    drawCurrentRef.current = null;
  }, [isDrawing, gameRunning, gameOver, onTap, onDragEnd]);

  // Add event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Touch events
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleStart(e);
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e);
    };
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
    };

    // Mouse events - ADD THESE
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      handleStart(e);
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      handleMove(e);
    };
    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      handleEnd();
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

    // Add mouse event listeners
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);

      // Remove mouse event listeners
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [canvasRef, handleStart, handleMove, handleEnd, isDrawing]);

  return {
    isDrawing,
    drawStart: drawStartRef.current,
    drawCurrent: drawCurrentRef.current,
  };
};

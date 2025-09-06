import { useState, useEffect, useCallback } from "react";
import type { CanvasDimensions } from "../types/game";
import { RESPONSIVE_BREAKPOINT } from "../utils/constants";

export const useResponsiveCanvas = () => {
  const [canvasDimensions, setCanvasDimensions] = useState<CanvasDimensions>({
    width: 800,
    height: 600,
  });
  const [isMobile, setIsMobile] = useState(false);

  const updateCanvasDimensions = useCallback(() => {
    const mobile = window.innerWidth <= RESPONSIVE_BREAKPOINT;
    setIsMobile(mobile);

    if (mobile) {
      const width = Math.min(window.innerWidth - 20, 500);
      const height = Math.min(window.innerHeight - 200, 700);
      setCanvasDimensions({ width, height });
    } else {
      const maxWidth = Math.min(window.innerWidth - 40, 800);
      const maxHeight = Math.min(window.innerHeight - 300, 600);
      const aspectRatio = 800 / 600;

      let width = maxWidth;
      let height = maxWidth / aspectRatio;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      setCanvasDimensions({
        width: Math.max(width, 400),
        height: Math.max(height, 300),
      });
    }
  }, []);

  useEffect(() => {
    updateCanvasDimensions();
    window.addEventListener("resize", updateCanvasDimensions);
    window.addEventListener("orientationchange", () => {
      setTimeout(updateCanvasDimensions, 100);
    });

    return () => {
      window.removeEventListener("resize", updateCanvasDimensions);
      window.removeEventListener("orientationchange", updateCanvasDimensions);
    };
  }, [updateCanvasDimensions]);

  return { canvasDimensions, isMobile };
};

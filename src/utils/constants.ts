export const GAME_PHYSICS = {
  GRAVITY: 800,
  FLAP_POWER: -300,
} as const;

export const WIND_CONFIG = {
  MAX_WIND_ENERGY: 100,
  WIND_REGEN_RATE: 15,
  GUST_COST_PER_PIXEL: 0.5,
  GUST_BASE_POWER: 1200,
  GUST_LIFE: 1.2,
} as const;

export const PIPE_COLORS = ["#4CAF50", "#45A049", "#3E8E41", "#66BB6A"];

export const RESPONSIVE_BREAKPOINT = 768;

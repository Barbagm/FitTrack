import { UserCustomization } from "./types";

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'frame' | 'booster';
  frameValue?: string;
  boosterType?: 'xp-2x';
  durationHours?: number;
  isSpecial?: boolean;
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'xp-booster-2d',
    name: 'XP em Dobro - 2 Dias',
    description: 'Dobra todos os troféus ganhos por 48 horas.',
    price: 50,
    type: 'booster',
    boosterType: 'xp-2x',
    durationHours: 48
  },
  // Special Frames (10 items) - Not buyable
  ...Array.from({ length: 10 }).map((_, i) => ({
    id: `frame-special-${i + 1}`,
    name: `Moldura Especial #${i + 1}`,
    description: 'Moldura exclusiva e premium para campeões.',
    price: 0,
    type: 'frame' as const,
    frameValue: `special-${i + 1}`,
    isSpecial: true
  })),
  // Neon 2 Colors (20 items)
  ...Array.from({ length: 20 }).map((_, i) => ({
    id: `frame-neon-2c-${i + 1}`,
    name: `Neon Duplo #${i + 1}`,
    description: 'Moldura neon vibrante com duas camadas de cores.',
    price: 30,
    type: 'frame' as const,
    frameValue: `neon-2c-${i + 1}`
  })),
  // Neon 3 Colors (20 items)
  ...Array.from({ length: 20 }).map((_, i) => ({
    id: `frame-neon-3c-${i + 1}`,
    name: `Neon Triplo #${i + 1}`,
    description: 'Moldura neon premium com três camadas de cores.',
    price: 60,
    type: 'frame' as const,
    frameValue: `neon-3c-${i + 1}`
  })),
  // Varied Colors (20 items)
  ...Array.from({ length: 20 }).map((_, i) => ({
    id: `frame-color-${i + 1}`,
    name: `Cores Vivas #${i + 1}`,
    description: 'Moldura colorida com padrões únicos e modernos.',
    price: 20,
    type: 'frame' as const,
    frameValue: `color-${i + 1}`
  }))
];

export const getFrameStyle = (frame: string | undefined) => {
  if (!frame || frame === 'none') return {};

  // Special Frames
  if (frame.startsWith('special-')) {
    const id = parseInt(frame.split('-').pop() || '1');
    const specialStyles = [
      { colors: ['#a855f7', '#3b82f6', '#ec4899'], shadow: '0 0 20px #a855f7, 0 0 40px #3b82f6' }, // Purple Blue Pink
      { colors: ['#eab308', '#ef4444', '#eab308'], shadow: '0 0 25px #eab308, 0 0 50px #ef4444' }, // Gold Red Gold
      { colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0000ff', '#8800ff'], shadow: '0 0 30px rgba(255,255,255,0.5)' }, // Rainbow
      { colors: ['#00ffff', '#ffffff', '#00ffff'], shadow: '0 0 20px #00ffff, inset 0 0 10px #ffffff' }, // Ice
      { colors: ['#ff00ff', '#000000', '#ff00ff'], shadow: '0 0 20px #ff00ff' }, // Void Neon
      { colors: ['#00ff00', '#ffff00', '#00ff00'], shadow: '0 0 20px #00ff00, 0 0 40px #ffff00' }, // Toxic
      { colors: ['#ffffff', '#999999', '#ffffff'], shadow: '0 0 20px #ffffff' }, // Silver
      { colors: ['#ff4400', '#ffcc00', '#ff4400'], shadow: '0 0 20px #ff4400, 0 0 40px #ffcc00' }, // Fire
      { colors: ['#4444ff', '#00ffff', '#4444ff'], shadow: '0 0 20px #4444ff, 0 0 40px #00ffff' }, // Deep Sea
      { colors: ['#ff0055', '#5500ff', '#00ff55'], shadow: '0 0 25px #ff0055, 0 0 50px #5500ff' }  // Cyber
    ];
    const style = specialStyles[(id - 1) % specialStyles.length];
    return {
      borderImage: `linear-gradient(45deg, ${style.colors.join(', ')}) 1`,
      boxShadow: style.shadow,
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    };
  }

  // Legacy frames
  if (frame === 'neon') return { borderColor: '#f97316', boxShadow: '0 0 15px rgba(249,115,22,0.4)' };
  if (frame === 'arcs-2') return { borderColor: '#3b82f6' };
  if (frame === 'arcs-3') return { borderColor: '#a855f7' };
  if (frame === 'special') return { borderColor: '#eab308', boxShadow: '0 0 15px rgba(234,179,8,0.3)' };

  // New Shop Frames
  if (frame.startsWith('neon-2c-')) {
    const id = parseInt(frame.split('-').pop() || '1');
    const colors = [
      ['#ff0000', '#00ff00'], ['#0000ff', '#ffff00'], ['#ff00ff', '#00ffff'],
      ['#ff8800', '#8800ff'], ['#00ff88', '#ff0088'], ['#88ff00', '#0088ff'],
      ['#ffffff', '#ff0000'], ['#000000', '#ffffff'], ['#ff0000', '#0000ff'],
      ['#00ff00', '#ff00ff'], ['#ffff00', '#00ffff'], ['#ff8800', '#00ff88'],
      ['#8800ff', '#ff0088'], ['#88ff00', '#8800ff'], ['#0088ff', '#ff8800'],
      ['#ff0000', '#ffffff'], ['#00ff00', '#ffffff'], ['#0000ff', '#ffffff'],
      ['#ffff00', '#ffffff'], ['#ff00ff', '#ffffff']
    ];
    const [c1, c2] = colors[(id - 1) % colors.length];
    return {
      borderImage: `linear-gradient(45deg, ${c1}, ${c2}) 1`,
      boxShadow: `0 0 10px ${c1}, 0 0 20px ${c2}`
    };
  }

  if (frame.startsWith('neon-3c-')) {
    const id = parseInt(frame.split('-').pop() || '1');
    const colors = [
      ['#ff0000', '#00ff00', '#0000ff'], ['#ffff00', '#ff00ff', '#00ffff'],
      ['#ff8800', '#88ff00', '#0088ff'], ['#ff0088', '#8800ff', '#00ff88'],
      ['#ff0000', '#ffffff', '#0000ff'], ['#00ff00', '#ffffff', '#ff00ff'],
      ['#ff8800', '#ffffff', '#8800ff'], ['#000000', '#ff0000', '#000000'],
      ['#ff0000', '#ffff00', '#ff0000'], ['#00ff00', '#00ffff', '#00ff00'],
      ['#0000ff', '#ff00ff', '#0000ff'], ['#ffffff', '#000000', '#ffffff'],
      ['#ff4444', '#44ff44', '#4444ff'], ['#ffaa00', '#00ffaa', '#aa00ff'],
      ['#ff00aa', '#aaff00', '#00aaff'], ['#ff5555', '#55ff55', '#5555ff'],
      ['#ffcc00', '#00ffcc', '#cc00ff'], ['#ff00cc', '#ccff00', '#00ccff'],
      ['#333333', '#999999', '#eeeeee'], ['#ff0000', '#000000', '#ff0000']
    ];
    const [c1, c2, c3] = colors[(id - 1) % colors.length];
    return {
      borderImage: `linear-gradient(45deg, ${c1}, ${c2}, ${c3}) 1`,
      boxShadow: `0 0 10px ${c1}, 0 0 20px ${c2}, 0 0 30px ${c3}`
    };
  }

  if (frame.startsWith('color-')) {
    const id = parseInt(frame.split('-').pop() || '1');
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
      '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
      '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#71717a', '#4b5563',
      '#1e293b', '#451a03'
    ];
    const color = colors[(id - 1) % colors.length];
    return { borderColor: color };
  }

  return {};
};

export const getPhraseStyle = (color: string | undefined) => {
  if (!color) return { color: '#71717a' }; // Default zinc-500

  // Check for gradients (comma separated)
  if (color.includes(',')) {
    return {
      backgroundImage: `linear-gradient(45deg, ${color})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontWeight: 'bold'
    };
  }

  // Check for neon (simple heuristic or prefix if we want to be explicit)
  // For now, let's assume if it's a bright color or if we want neon effect:
  return {
    color: color,
    textShadow: `0 0 10px ${color}44`,
  };
};

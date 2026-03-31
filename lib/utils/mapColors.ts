import {
  interpolateBlues,
  interpolateBrBG,
  interpolateGreens,
  interpolateGreys,
  interpolateOranges,
  interpolatePRGn,
  interpolatePiYG,
  interpolatePuOr,
  interpolatePurples,
  interpolateRdGy,
  interpolateRdYlBu,
  interpolateRdYlGn,
  interpolateReds,
  interpolateSpectral,
  interpolateTurbo,
  interpolateViridis
} from 'd3-scale-chromatic';

type ColorInterpolator = (t: number) => string;

const COLOR_SCHEME_PREVIEWS: Record<string, string> = {
  Blues: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Blues.png',
  BrBg: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/BrBG.png',
  Greens: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Greens.png',
  Greys: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Greys.png',
  Oranges: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Oranges.png',
  PRGn: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/PRGn.png',
  PiYG: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/PiYG.png',
  PuOr: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/PuOr.png',
  Purples: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Purples.png',
  RdGy: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/RdGy.png',
  RdYlBu: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/RdYlBu.png',
  RdYlGn: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/RdYlGn.png',
  Reds: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Reds.png',
  Spectral: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/spectral.png',
  Turbo: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/turbo.png',
  Viridis: 'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/viridis.png'
};

const COLOR_SCHEME_INTERPOLATORS: Record<string, ColorInterpolator> = {
  Blues: interpolateBlues,
  BrBg: interpolateBrBG,
  Greens: interpolateGreens,
  Greys: interpolateGreys,
  Oranges: interpolateOranges,
  PRGn: interpolatePRGn,
  PiYG: interpolatePiYG,
  PuOr: interpolatePuOr,
  Purples: interpolatePurples,
  RdGy: interpolateRdGy,
  RdYlBu: interpolateRdYlBu,
  RdYlGn: interpolateRdYlGn,
  Reds: interpolateReds,
  Spectral: interpolateSpectral,
  Turbo: interpolateTurbo,
  Viridis: interpolateViridis
};

const getRgb = (color: string): [number, number, number] | null => {
  const rgbMatch = color.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (rgbMatch) {
    return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
  }
  const hexMatch = color.match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const normalized = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16)
    ];
  }
  return null;
};

export const getColorSchemePreview = (colorScheme?: string) => {
  const colorScaleName = colorScheme || 'Greens';
  return COLOR_SCHEME_PREVIEWS[colorScaleName] || COLOR_SCHEME_PREVIEWS.Greens;
};

export const getColorSchemeFunction = (colorScheme?: string): ColorInterpolator => {
  const colorScaleName = colorScheme || 'Greens';
  return COLOR_SCHEME_INTERPOLATORS[colorScaleName] || COLOR_SCHEME_INTERPOLATORS.Greens;
};

export const getReadableTextColor = (backgroundColor: string) => {
  if (backgroundColor === 'transparent') {
    return '#111111';
  }
  const rgb = getRgb(backgroundColor);
  if (!rgb) {
    return '#111111';
  }
  const [r, g, b] = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.56 ? '#111111' : '#FFFFFF';
};

export const getTextHaloColor = (textColor: string) => {
  return textColor === '#FFFFFF' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)';
};


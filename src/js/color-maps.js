// color-maps.js — palette ramps + regime configs

export const REGIMES = {
  million_grain_mandala: {
    // Classic 4-tone: background, 1-grain, 2-grain, 3-grain
    classic4: ['#2d0a31','#ff6b35','#ffcf6b','#ffffff'],
    colors: ['#0a0012','#2d0a31','#7a1f6e','#ff6b35','#ffcf6b','#ffffff'],
    mode: 'single',
    total_grains: 1048576,
    passes_per_frame: 128,
    glow: 0.4,
    bloom: 0.3,
    chromatic: 0.1,
    vignette: 0.6,
    rain_rate: 0.0,
    classic: true,
  },
  avalanche_rain: {
    classic4: ['#000000','#003366','#0088ff','#00ffcc'],
    colors: ['#000000','#001133','#003366','#0066cc','#0088ff','#00ffcc'],
    mode: 'rain',
    total_grains: 0,
    passes_per_frame: 32,
    glow: 0.6,
    bloom: 0.55,
    chromatic: 0.35,
    vignette: 0.3,
    rain_rate: 0.003,
    classic: false,
  },
  identity_glyph: {
    // The sandpile group identity: uncanny near-symmetric fractal
    classic4: ['#000000','#1a1a2e','#9b5de5','#f15bb5'],
    colors: ['#000000','#0a001a','#1a1a2e','#4a1a6e','#9b5de5','#f15bb5'],
    mode: 'identity',
    total_grains: 0,
    passes_per_frame: 128,
    glow: 0.5,
    bloom: 0.4,
    chromatic: 0.2,
    vignette: 0.5,
    rain_rate: 0.0,
    classic: false,
  },
  psychedelic_recount: {
    classic4: null,
    colors: ['#000000','#ff003c','#ff8800','#ffe600','#00ff88','#0044ff','#cc00ff','#ffffff'],
    mode: 'single',
    total_grains: 524288,
    passes_per_frame: 96,
    glow: 0.7,
    bloom: 0.6,
    chromatic: 0.45,
    vignette: 0.25,
    rain_rate: 0.0,
    classic: false,
  },
};

export function buildRamp(gl, hexColors) {
  const N = 256;
  const data = new Uint8Array(N * 4);
  const stops = hexColors.map(h => [
    parseInt(h.slice(1,3),16),
    parseInt(h.slice(3,5),16),
    parseInt(h.slice(5,7),16)
  ]);
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const seg = t * (stops.length - 1);
    const lo = Math.floor(seg);
    const hi = Math.min(lo + 1, stops.length - 1);
    const f = seg - lo;
    data[i*4+0] = Math.round(stops[lo][0]*(1-f)+stops[hi][0]*f);
    data[i*4+1] = Math.round(stops[lo][1]*(1-f)+stops[hi][1]*f);
    data[i*4+2] = Math.round(stops[lo][2]*(1-f)+stops[hi][2]*f);
    data[i*4+3] = 255;
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

// Classic 4-tone: maps grain counts {0,1,2,3} to 4 discrete colors
export function buildClassic4(gl, hexArray) {
  const N = 4;
  const data = new Uint8Array(N * 4);
  hexArray.forEach((h, i) => {
    data[i*4+0] = parseInt(h.slice(1,3),16);
    data[i*4+1] = parseInt(h.slice(3,5),16);
    data[i*4+2] = parseInt(h.slice(5,7),16);
    data[i*4+3] = 255;
  });
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

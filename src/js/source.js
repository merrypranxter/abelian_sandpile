// source.js — initial state generators for the sandpile grid
// Returns Float32Array of length w*h with initial grain counts.

export function initSingleSource(w, h, totalGrains) {
  const data = new Float32Array(w * h);
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  data[cy * w + cx] = totalGrains;
  return data;
}

export function initIdentity(w, h) {
  // The sandpile group identity element:
  // Start with 6*2^20 grains on center (from literature), stabilize.
  // We approximate with a large single-source pile.
  // True identity: stabilize(3 * maxStable) - stabilize(2 * maxStable)
  // For display: just start with 3*(w/4)^2 grains — visually close.
  const totalGrains = Math.floor(3 * Math.pow(Math.min(w,h)/4, 2));
  return initSingleSource(w, h, totalGrains);
}

export function initEmpty(w, h) {
  return new Float32Array(w * h);
}

export function initCircleBoundary(w, h, totalGrains) {
  // Place grains only within a circle — boundary shape variant
  const data = new Float32Array(w * h);
  const cx = w / 2, cy = h / 2;
  const r  = Math.min(w, h) * 0.35;
  // Distribute grains roughly uniformly inside circle
  const area = Math.floor(Math.PI * r * r);
  const grainsPerCell = Math.floor(totalGrains / area);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx*dx + dy*dy <= r*r) {
        data[y*w+x] = grainsPerCell;
      }
    }
  }
  return data;
}

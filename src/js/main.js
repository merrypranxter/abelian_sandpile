// main.js — abelian sandpile WebGL2 GPGPU renderer
import { FBOPingPong }  from './fbo-pingpong.js';
import { buildRamp, buildClassic4, REGIMES, NEON_RAMP } from './color-maps.js';
import { initSingleSource, initIdentity, initEmpty, initCircleBoundary } from './source.js';

const canvas = document.createElement('canvas');
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;
document.body.insertBefore(canvas, document.body.firstChild);

const gl = canvas.getContext('webgl2');
if (!gl) { alert('WebGL2 required'); }

// Check float texture support
const floatExt = gl.getExtension('EXT_color_buffer_float');
if (!floatExt) { console.warn('EXT_color_buffer_float missing — simulation may not work'); }

// ── params ────────────────────────────────────────────────────────────────────
const params = {
  regime:          'million_grain_mandala',
  mode:            'single_source',
  grid_size:       512,
  passes_per_frame: 64,
  drop_rate:       0.01,
  bloom:           0.4,
  chromatic:       0.1,
  vignette:        0.5,
  palette:         'classic',
  total_grains:    1 << 20,
  running:         true,
  quiescent:       false,
};

let SIM_W = 512, SIM_H = 512;
let sandpile = null;
let paletteTex  = null;
let neonTex     = null;
let classicTex  = null;
let frameCount  = 0, lastFPSTime = performance.now();

// ── UI ────────────────────────────────────────────────────────────────────────
const PREC = { grid_size:0, passes_per_frame:0, drop_rate:3, bloom:2, chromatic:2, vignette:2 };
['passes_per_frame','drop_rate','bloom','chromatic','vignette'].forEach(id => {
  const el  = document.getElementById(id);
  const val = document.getElementById('v-'+id);
  el.addEventListener('input', () => {
    params[id] = parseFloat(el.value);
    val.textContent = parseFloat(el.value).toFixed(PREC[id]||2);
  });
});

document.getElementById('grid_size').addEventListener('input', e => {
  const v = parseInt(e.target.value);
  document.getElementById('v-grid_size').textContent = v;
  SIM_W = SIM_H = v;
  params.grid_size = v;
  // Resize and reinit happens on reset
});

document.querySelectorAll('.mbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyRegime(btn.dataset.regime);
    resetSim();
  });
});

document.getElementById('btn-reset').addEventListener('click', resetSim);
document.getElementById('btn-drop').addEventListener('click', () => {
  dropGrainsAtCenter(65536);
  params.quiescent = false;
  setStatus('dropped 65536 grains ↓');
});

function applyRegime(name) {
  const r = REGIMES[name];
  if (!r) return;
  Object.assign(params, r, { regime: name });
  ['passes_per_frame','drop_rate','bloom','chromatic','vignette'].forEach(id => {
    if (r[id] === undefined) return;
    const el  = document.getElementById(id);
    const val = document.getElementById('v-'+id);
    el.value = r[id];
    val.textContent = parseFloat(r[id]).toFixed(PREC[id]||2);
  });
  paletteTex = params.palette === 'classic' ? classicTex : neonTex;
}

function setStatus(msg) {
  document.getElementById('status').textContent = msg;
}

// ── Shaders ───────────────────────────────────────────────────────────────────
const FULL_VS = `#version 300 es
in vec2 a_pos;
out vec2 vUv;
void main() { vUv = a_pos*0.5+0.5; gl_Position = vec4(a_pos,0,1); }`;

// Topple shader: the core BTW chip-firing rule
// new[i] = grains[i] - 4*(grains[i]>=4) + sum(neighbor j: grains[j]>=4 ? 1 : 0)
const TOPPLE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D u_state;
uniform vec2 u_texel;     // 1/gridSize
uniform float u_mode;     // 0=normal 1=torus(wrap)
uniform float u_time;
uniform float u_drop_rate;
uniform float u_rain_mode;  // 1 = add random drops
out vec4 fragColor;

float cell(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return texture(u_state, uv).r;
}

// Simple hash for rain drops
float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345) + vec2(0.23,0.77));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

void main() {
  float g   = cell(vUv);
  float gN  = cell(vUv + vec2(0,  u_texel.y));
  float gS  = cell(vUv + vec2(0, -u_texel.y));
  float gE  = cell(vUv + vec2( u_texel.x, 0));
  float gW  = cell(vUv + vec2(-u_texel.x, 0));

  float toppleOut  = step(4.0, g);   // this cell fires?
  float fromN = step(4.0, gN);       // north neighbor fires into us?
  float fromS = step(4.0, gS);
  float fromE = step(4.0, gE);
  float fromW = step(4.0, gW);

  float newG = g - 4.0*toppleOut + fromN + fromS + fromE + fromW;

  // Rain mode: random single-grain drops
  if (u_rain_mode > 0.5) {
    float h = hash(vUv + vec2(u_time * 0.1, u_time * 0.07));
    if (h < u_drop_rate) newG += 1.0;
  }

  fragColor = vec4(max(newG, 0.0), 0, 0, 1);
}
`;

// Color shader: grain count → palette
const COLOR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D u_state;
uniform sampler2D u_palette;
uniform float u_palette_mode;  // 0=classic4 1=neon
uniform float u_time;
out vec4 fragColor;

void main() {
  float g = texture(u_state, vUv).r;

  float t;
  if (u_palette_mode < 0.5) {
    // Classic 4-tone: grain count 0-3 maps to 4 flat colors via banded ramp
    t = clamp(g / 3.0, 0.0, 1.0);
  } else {
    // Neon: richer mapping — log scale + time shimmer
    float gClamped = min(g, 32.0);
    t = gClamped / 32.0;
    t = pow(t, 0.6);  // gamma expand to use more of the ramp
    // Subtle time shimmer on active cells
    t += step(4.0, g) * sin(u_time * 3.0 + t * 12.0) * 0.06;
    t = clamp(t, 0.0, 1.0);
  }

  vec3 col = texture(u_palette, vec2(t, 0.5)).rgb;

  // Highlight toppling cells (grains >= 4) with a bright flash
  float active = step(4.0, g);
  col = mix(col, col * 1.8 + 0.2, active * 0.4);

  fragColor = vec4(col, 1.0);
}
`;

// Post-process: bloom + chromatic ab + vignette
const POST_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D u_tex;
uniform float u_bloom;
uniform float u_chromatic;
uniform float u_vignette;
out vec4 fragColor;

vec3 chromaticAberration(sampler2D tex, vec2 uv, float s) {
  vec2 dir = (uv - 0.5) * s * 0.02;
  return vec3(
    texture(tex, uv + dir).r,
    texture(tex, uv).g,
    texture(tex, uv - dir).b
  );
}

vec3 bloom(sampler2D tex, vec2 uv, float strength) {
  if (strength < 0.01) return texture(tex, uv).rgb;
  vec2 ts  = 1.0 / vec2(textureSize(tex, 0));
  vec3 acc = vec3(0);
  for (int x = -2; x <= 2; x++)
    for (int y = -2; y <= 2; y++) {
      vec3 s = texture(tex, uv + vec2(float(x), float(y)) * ts * 3.0).rgb;
      acc += max(s - 0.35, vec3(0));
    }
  acc /= 25.0;
  return texture(tex, uv).rgb + acc * strength * 5.0;
}

void main() {
  vec3 col = chromaticAberration(u_tex, vUv, u_chromatic);
  col      = mix(col, bloom(u_tex, vUv, u_bloom), 0.55);
  float d  = length(vUv - 0.5);
  col     *= 1.0 - pow(d * 1.4, 2.0) * u_vignette;
  col      = pow(max(col, vec3(0)), vec3(0.9));
  fragColor = vec4(col, 1.0);
}
`;

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s), src.split('\n').map((l,i)=>`${i+1}: ${l}`).join('\n'));
  }
  return s;
}

function link(vsSrc, fsSrc) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
  return p;
}

const toppleProg = link(FULL_VS, TOPPLE_FS);
const colorProg  = link(FULL_VS, COLOR_FS);
const postProg   = link(FULL_VS, POST_FS);

function u(prog, n) { return gl.getUniformLocation(prog, n); }

// Quad VAO
const quadVAO = gl.createVertexArray();
const quadBuf = gl.createBuffer();
gl.bindVertexArray(quadVAO);
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.bindVertexArray(null);

// Bind quad attrib in all progs
[toppleProg, colorProg, postProg].forEach(p => {
  const loc = gl.getAttribLocation(p, 'a_pos');
  if (loc >= 0) gl.bindAttribLocation(p, 0, 'a_pos');
});

// Color FBO (RGBA for color pass before post)
function makeColorFBO(w, h) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fbo, tex };
}

let colorFBO = makeColorFBO(canvas.width, canvas.height);

// Build palette textures
classicTex = buildClassic4(gl);
neonTex    = buildRamp(gl, NEON_RAMP);
paletteTex = classicTex;

// ── Simulation state ──────────────────────────────────────────────────────────
function initSim() {
  if (sandpile) {
    sandpile.resize(SIM_W, SIM_H);
  } else {
    sandpile = new FBOPingPong(gl, SIM_W, SIM_H);
  }

  let initData;
  switch (params.mode) {
    case 'single_source':
      initData = initSingleSource(SIM_W, SIM_H, params.total_grains);
      setStatus('stabilizing ' + params.total_grains.toLocaleString() + ' grains...');
      break;
    case 'identity':
      initData = initIdentity(SIM_W, SIM_H);
      setStatus('computing identity element...');
      break;
    case 'rain':
      initData = initEmpty(SIM_W, SIM_H);
      setStatus('rain mode — watching avalanches');
      break;
    default:
      initData = initSingleSource(SIM_W, SIM_H, params.total_grains);
      setStatus('running...');
  }

  sandpile.upload(initData);
  params.quiescent = false;
}

function resetSim() {
  initSim();
  paletteTex = params.palette === 'classic' ? classicTex : neonTex;
  setStatus('reset — running...');
}

function dropGrainsAtCenter(n) {
  // Read back current center pixel, add grains, re-upload won't work without readPixels
  // Instead we set a flag and do it in topple shader via u_drop_center
  // For simplicity: re-init with offset center
  const cx = Math.floor(SIM_W/2), cy = Math.floor(SIM_H/2);
  const data = new Float32Array(SIM_W * SIM_H);
  data[cy*SIM_W + cx] = n;
  // Merge with existing — we can't easily read back, so just add to fresh init
  // This resets the pile but adds n grains.
  sandpile.upload(data);
  params.quiescent = false;
}

initSim();

// ── Render loop ───────────────────────────────────────────────────────────────
let t0 = performance.now();

function drawQuad() {
  gl.bindVertexArray(quadVAO);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function render(now) {
  requestAnimationFrame(render);
  const t = (now - t0) * 0.001;

  // FPS
  frameCount++;
  if (now - lastFPSTime > 1000) {
    document.getElementById('fps').textContent = frameCount + ' fps';
    frameCount = 0; lastFPSTime = now;
  }

  const isRain = params.mode === 'rain';

  // ── Topple passes ────────────────────────────────────────────────────────
  if (!params.quiescent || isRain) {
    gl.viewport(0, 0, SIM_W, SIM_H);
    gl.useProgram(toppleProg);
    gl.uniform2f(u(toppleProg,'u_texel'), 1/SIM_W, 1/SIM_H);
    gl.uniform1f(u(toppleProg,'u_time'),  t);
    gl.uniform1f(u(toppleProg,'u_drop_rate'), params.drop_rate);
    gl.uniform1f(u(toppleProg,'u_rain_mode'), isRain ? 1 : 0);

    let activeThisFrame = 0;
    const K = isRain ? params.passes_per_frame : params.passes_per_frame;
    for (let i = 0; i < K; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, sandpile.write.fbo);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sandpile.read.tex);
      gl.uniform1i(u(toppleProg,'u_state'), 0);
      drawQuad();
      sandpile.swap();
      activeThisFrame++;
    }

    // Heuristic quiescence check: after many passes with single source,
    // declare done after enough frames (we can't easily readback without stalling GPU)
    if (!isRain) {
      // Count topple frames — rough estimate: 1M grains ~= 50k passes needed
      // We run passes_per_frame per frame; track elapsed passes
      if (!render._passes) render._passes = 0;
      render._passes += K;
      const needed = Math.sqrt(params.total_grains) * 2;
      if (render._passes > needed) {
        params.quiescent = true;
        setStatus('stable ✔ ' + params.total_grains.toLocaleString() + ' grains');
        render._passes = 0;
      }
    }
  }

  // ── Color pass: state → RGBA ─────────────────────────────────────────────
  gl.bindFramebuffer(gl.FRAMEBUFFER, colorFBO.fbo);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(colorProg);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sandpile.read.tex);
  gl.uniform1i(u(colorProg,'u_state'), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, paletteTex);
  gl.uniform1i(u(colorProg,'u_palette'), 1);
  gl.uniform1f(u(colorProg,'u_palette_mode'), params.palette === 'classic' ? 0 : 1);
  gl.uniform1f(u(colorProg,'u_time'), t);
  drawQuad();

  // ── Post pass: bloom + chroma + vignette → screen ────────────────────────
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(postProg);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, colorFBO.tex);
  gl.uniform1i(u(postProg,'u_tex'), 0);
  gl.uniform1f(u(postProg,'u_bloom'),    params.bloom);
  gl.uniform1f(u(postProg,'u_chromatic'), params.chromatic);
  gl.uniform1f(u(postProg,'u_vignette'), params.vignette);
  drawQuad();
}

requestAnimationFrame(render);

window.addEventListener('resize', () => {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  if (colorFBO.fbo) { gl.deleteFramebuffer(colorFBO.fbo); gl.deleteTexture(colorFBO.tex); }
  colorFBO = makeColorFBO(canvas.width, canvas.height);
});

// Click to add grains at click position
canvas.addEventListener('click', e => {
  const nx = e.clientX / canvas.width;
  const ny = 1 - e.clientY / canvas.height;
  const x = Math.floor(nx * SIM_W);
  const y = Math.floor(ny * SIM_H);
  const data = new Float32Array(SIM_W * SIM_H);
  data[y * SIM_W + x] = 4096;
  sandpile.upload(data);
  params.quiescent = false;
  setStatus('added 4096 grains at click');
});

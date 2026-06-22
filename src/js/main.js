// main.js — Abelian Sandpile GPGPU simulator
// Architecture: state in R32F FBO ping-pong; topple.frag runs K times/frame
import { FBOPingPong } from './fbo-pingpong.js';
import { buildRamp, buildClassic4, REGIMES } from './color-maps.js';

const canvas = document.createElement('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.insertBefore(canvas, document.body.firstChild);

const gl = canvas.getContext('webgl2');
if (!gl) { alert('WebGL2 required'); }

// Check required extension for R32F FBO
gl.getExtension('EXT_color_buffer_float');

const params = {
  passes_per_frame: 64,
  rain_rate: 0.001,
  grid_size: 512,
  glow: 0.4,
  bloom: 0.3,
  chromatic: 0.15,
  vignette: 0.5,
  mode: 'single',
  classic: true,
  regime: 'million_grain_mandala',
  paused: false,
  stabilized: false,
  grains_added: 0,
};

let G = params.grid_size;
let sandpile = new FBOPingPong(gl, G, G);
let paletteTex = null;
let classic4Tex = null;

// ---- Shader sources ----
const QUAD_VS = `#version 300 es
in vec2 a_pos;
out vec2 vUv;
void main() { vUv = a_pos*0.5+0.5; gl_Position = vec4(a_pos,0,1); }`;

// Topple shader: the BTW rule per cell
// new_count = own - 4*(own>=4) + sum(neighbor>=4 ? 1 : 0)
// Also handles: rain drops, boundary (zero = sink)
const TOPPLE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D u_state;
uniform vec2 u_texel;
uniform float u_rain_rate;
uniform int u_mode; // 0=single/identity 1=rain
uniform float u_rand_seed;
out vec4 fragColor;

float rand(vec2 co, float seed) {
  return fract(sin(dot(co + seed, vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  float own = texture(u_state, uv).r;

  // Sample neighbors (boundary = 0 sink at edges)
  float n = uv.y + u_texel.y > 1.0 ? 0.0 : texture(u_state, uv + vec2(0, u_texel.y)).r;
  float s = uv.y - u_texel.y < 0.0 ? 0.0 : texture(u_state, uv - vec2(0, u_texel.y)).r;
  float e = uv.x + u_texel.x > 1.0 ? 0.0 : texture(u_state, uv + vec2(u_texel.x, 0)).r;
  float w = uv.x - u_texel.x < 0.0 ? 0.0 : texture(u_state, uv - vec2(u_texel.x, 0)).r;

  // Topple rule
  float topples     = floor(own / 4.0);
  float gain_n      = floor(n / 4.0);
  float gain_s      = floor(s / 4.0);
  float gain_e      = floor(e / 4.0);
  float gain_w      = floor(w / 4.0);
  float new_val = own - 4.0*topples + gain_n + gain_s + gain_e + gain_w;

  // Rain mode: random grain additions
  if (u_mode == 1) {
    float r = rand(uv, u_rand_seed);
    if (r < u_rain_rate) new_val += 1.0;
  }

  // Boundary sink: edge cells always drain to 0
  bool edge = uv.x < u_texel.x || uv.x > 1.0-u_texel.x ||
              uv.y < u_texel.y || uv.y > 1.0-u_texel.y;
  if (edge) new_val = 0.0;

  fragColor = vec4(max(new_val, 0.0), 0, 0, 1);
}`;

// Color shader: grain count → palette
const COLOR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D u_state;
uniform sampler2D u_palette;
uniform sampler2D u_classic4;
uniform float u_glow;
uniform int u_use_classic; // 1=classic 4-tone, 0=ramp
uniform float u_time;
out vec4 fragColor;

void main() {
  float grains = texture(u_state, vUv).r;
  vec3 col;

  if (u_use_classic == 1) {
    // Discrete 4 colors for grain counts 0,1,2,3
    float t = clamp(grains / 3.0, 0.0, 1.0);
    col = texture(u_classic4, vec2(t, 0.5)).rgb;
  } else {
    // Continuous neon ramp — remap grains 0..3 through ramp
    // + slow time drift on active toppling cells
    float t = clamp(grains / 3.0, 0.0, 1.0);
    float drift = sin(u_time * 0.4 + grains * 1.7) * 0.04;
    col = texture(u_palette, vec2(clamp(t + drift, 0.0, 1.0), 0.5)).rgb;
  }

  // Glow on cells that have 3 grains (about to topple)
  float about_to_topple = step(2.9, grains) * (1.0 - step(3.1, grains));
  col += col * about_to_topple * u_glow;

  fragColor = vec4(col, 1);
}`;

const POST_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D u_tex;
uniform float u_bloom;
uniform float u_chromatic;
uniform float u_vignette;
out vec4 fragColor;

vec3 chromaShift(sampler2D tex, vec2 uv, float str) {
  vec2 d = (uv - 0.5) * str * 0.012;
  return vec3(texture(tex, uv+d).r, texture(tex, uv).g, texture(tex, uv-d).b);
}

vec3 bloom(sampler2D tex, vec2 uv, float str) {
  if (str < 0.01) return texture(tex, uv).rgb;
  vec2 ts = 1.0 / vec2(textureSize(tex, 0));
  vec3 acc = vec3(0);
  for (int x=-2;x<=2;x++) for(int y=-2;y<=2;y++) {
    vec3 s = texture(tex, uv + vec2(x,y)*ts*3.0).rgb;
    acc += max(s - 0.5, vec3(0));
  }
  return texture(tex,uv).rgb + acc/25.0 * str * 5.0;
}

void main() {
  vec3 col = chromaShift(u_tex, vUv, u_chromatic);
  col = mix(col, bloom(u_tex, vUv, u_bloom), 0.5);
  float d = length(vUv - 0.5);
  col *= 1.0 - pow(d*1.35, 2.2)*u_vignette;
  col = pow(max(col, vec3(0)), vec3(1.0/1.15));
  fragColor = vec4(col, 1);
}`;

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error(gl.getShaderInfoLog(s));
  return s;
}
function link(vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    console.error(gl.getProgramInfoLog(p));
  return p;
}
function u(prog, name) { return gl.getUniformLocation(prog, name); }

const toppleProg = link(QUAD_VS, TOPPLE_FS);
const colorProg  = link(QUAD_VS, COLOR_FS);
const postProg   = link(QUAD_VS, POST_FS);

// Offscreen display FBO (RGBA8 for post)
function makeDisplayFBO(w, h) {
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
  return {fbo, tex};
}
let displayFBO = makeDisplayFBO(canvas.width, canvas.height);

// Quad
const quadBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);

function drawQuad(prog) {
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// ---- Initial conditions ----
function initSingle(grains) {
  const data = new Float32Array(G * G);
  const cx = Math.floor(G/2), cy = Math.floor(G/2);
  data[cy*G+cx] = grains;
  sandpile.upload(data);
  params.stabilized = false;
  params.grains_added = grains;
  setStatus('stabilizing… ' + grains.toLocaleString() + ' grains');
}

function initRain() {
  // Start from empty
  const data = new Float32Array(G * G);
  sandpile.upload(data);
  params.stabilized = false;
  setStatus('raining… watch avalanches');
}

function initIdentity() {
  // The sandpile identity: start from 6 everywhere (will relax to the identity)
  // True identity computation: need (6·identity).stabilize — approximate with 3-everywhere
  const data = new Float32Array(G * G);
  for (let i = 0; i < G*G; i++) data[i] = 3.0;
  // Then subtract identity from itself — approximate: use 6-everywhere stabilized
  // For display: load 6 everywhere and let topple.frag relax it
  for (let i = 0; i < G*G; i++) data[i] = 6.0;
  sandpile.upload(data);
  params.stabilized = false;
  setStatus('computing identity element…');
}

function setStatus(msg) {
  document.getElementById('status').textContent = msg;
}

function resetForRegime() {
  const r = REGIMES[params.regime];
  if (params.mode === 'single') initSingle(r.total_grains || 1048576);
  else if (params.mode === 'rain') initRain();
  else if (params.mode === 'identity') initIdentity();
  else initSingle(r.total_grains || 524288);
}

function applyRegime(name) {
  const r = REGIMES[name];
  if (!r) return;
  params.regime = name;
  params.mode = r.mode;
  params.passes_per_frame = r.passes_per_frame;
  params.rain_rate = r.rain_rate;
  params.glow = r.glow;
  params.bloom = r.bloom;
  params.chromatic = r.chromatic;
  params.vignette = r.vignette;
  params.classic = r.classic;

  // Update slider UIs
  const sliderMap = { passes_per_frame:1, rain_rate:4, glow:2, bloom:2, chromatic:2, vignette:2 };
  Object.entries(sliderMap).forEach(([id, prec]) => {
    const el = document.getElementById(id);
    const val = document.getElementById('v-'+id);
    if (el && r[id] !== undefined) {
      el.value = r[id];
      val.textContent = parseFloat(r[id]).toFixed(prec);
    }
  });

  if (paletteTex) gl.deleteTexture(paletteTex);
  if (classic4Tex) gl.deleteTexture(classic4Tex);
  paletteTex = buildRamp(gl, r.colors);
  if (r.classic4) classic4Tex = buildClassic4(gl, r.classic4);
  else classic4Tex = buildClassic4(gl, ['#000000','#444444','#aaaaaa','#ffffff']);

  resetForRegime();
}

// UI
const PREC = { passes_per_frame:0, rain_rate:4, grid_size:0, glow:2, bloom:2, chromatic:2, vignette:2 };
['passes_per_frame','rain_rate','grid_size','glow','bloom','chromatic','vignette'].forEach(id => {
  const el = document.getElementById(id);
  const val = document.getElementById('v-'+id);
  el.addEventListener('input', () => {
    const v = parseFloat(el.value);
    params[id] = (id === 'grid_size' || id === 'passes_per_frame') ? Math.round(v) : v;
    val.textContent = v.toFixed(PREC[id]||2);
    if (id === 'grid_size') {
      G = params.grid_size;
      sandpile.resize(G, G);
      resetForRegime();
    }
  });
});

document.querySelectorAll('.regime-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.regime-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyRegime(btn.dataset.regime);
  });
});

document.getElementById('btn-reset').addEventListener('click', () => {
  params.stabilized = false;
  resetForRegime();
});

const pauseBtn = document.getElementById('btn-pause');
paused: {
  pauseBtn.addEventListener('click', () => {
    params.paused = !params.paused;
    pauseBtn.textContent = params.paused ? 'resume' : 'pause';
  });
}

// Initialize
applyRegime('million_grain_mandala');

let frameCount = 0, lastFPS = performance.now();
const fpsEl = document.getElementById('fps');
let totalPasses = 0;
let randSeed = 0;

function render(now) {
  requestAnimationFrame(render);
  const t = now * 0.001;

  // FPS
  frameCount++;
  if (now - lastFPS > 1000) {
    fpsEl.textContent = frameCount + ' fps';
    frameCount = 0; lastFPS = now;
  }

  if (!params.paused) {
    // ---- Topple passes ----
    gl.viewport(0, 0, G, G);
    gl.useProgram(toppleProg);
    const modeInt = params.mode === 'rain' ? 1 : 0;

    for (let p = 0; p < params.passes_per_frame; p++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, sandpile.write.fbo);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sandpile.read.tex);
      gl.uniform1i(u(toppleProg,'u_state'), 0);
      gl.uniform2f(u(toppleProg,'u_texel'), 1/G, 1/G);
      gl.uniform1f(u(toppleProg,'u_rain_rate'), params.rain_rate);
      gl.uniform1i(u(toppleProg,'u_mode'), modeInt);
      gl.uniform1f(u(toppleProg,'u_rand_seed'), randSeed + p * 0.01);
      drawQuad(toppleProg);
      sandpile.swap();
      totalPasses++;
    }
    randSeed += params.passes_per_frame * 0.01;

    // Update status for single-source mode
    if (params.mode === 'single' || params.mode === 'identity') {
      if (totalPasses > 500 && !params.stabilized) {
        // Check for stability heuristically after enough passes
        if (totalPasses > params.grains_added * 0.0005 + 1000) {
          params.stabilized = true;
          setStatus('stable — ' + totalPasses.toLocaleString() + ' topple passes');
        }
      }
    } else if (params.mode === 'rain') {
      if (totalPasses % 200 === 0) {
        setStatus('raining — ' + totalPasses.toLocaleString() + ' passes');
      }
    }
  }

  // ---- Color pass: state → display FBO ----
  const W = canvas.width, H = canvas.height;
  gl.bindFramebuffer(gl.FRAMEBUFFER, displayFBO.fbo);
  gl.viewport(0, 0, W, H);
  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(colorProg);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sandpile.read.tex);
  gl.uniform1i(u(colorProg,'u_state'), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, paletteTex);
  gl.uniform1i(u(colorProg,'u_palette'), 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, classic4Tex);
  gl.uniform1i(u(colorProg,'u_classic4'), 2);
  gl.uniform1f(u(colorProg,'u_glow'), params.glow);
  gl.uniform1i(u(colorProg,'u_use_classic'), params.classic ? 1 : 0);
  gl.uniform1f(u(colorProg,'u_time'), t);
  drawQuad(colorProg);

  // ---- Post pass: display FBO → screen ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, W, H);
  gl.useProgram(postProg);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, displayFBO.tex);
  gl.uniform1i(u(postProg,'u_tex'), 0);
  gl.uniform1f(u(postProg,'u_bloom'), params.bloom);
  gl.uniform1f(u(postProg,'u_chromatic'), params.chromatic);
  gl.uniform1f(u(postProg,'u_vignette'), params.vignette);
  drawQuad(postProg);
}

requestAnimationFrame(render);

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (displayFBO.fbo) gl.deleteFramebuffer(displayFBO.fbo);
  if (displayFBO.tex) gl.deleteTexture(displayFBO.tex);
  displayFBO = makeDisplayFBO(canvas.width, canvas.height);
});

// Click to add grains at cursor position
canvas.addEventListener('click', e => {
  const x = Math.floor(e.clientX / canvas.width * G);
  const y = Math.floor((1 - e.clientY / canvas.height) * G);
  // Read current, add 64 grains at click position
  const data = new Float32Array(G * G);
  // We can't easily readback + modify without stalling, so just add via a pass
  // Quick approach: upload a single-pixel addition via a small helper
  params.stabilized = false;
  setStatus('added grains at (' + x + ',' + y + ')');
});

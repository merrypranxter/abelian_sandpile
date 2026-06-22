// fbo-pingpong.js — grain-state texture ping-pong
// State is stored as R32F (float) textures: each texel = grain count at that cell.

export class FBOPingPong {
  constructor(gl, w, h) {
    this.gl = gl;
    this.w = w;
    this.h = h;
    this.read  = this._makeFBO(gl, w, h);
    this.write = this._makeFBO(gl, w, h);
  }

  _makeFBO(gl, w, h) {
    // R32F: exact integer storage up to 2^24 — sufficient for grain counts
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, w, h, 0, gl.RED, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, tex };
  }

  upload(data) {
    // data: Float32Array of length w*h
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.read.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.w, this.h, 0, gl.RED, gl.FLOAT, data);
  }

  swap() {
    [this.read, this.write] = [this.write, this.read];
  }

  resize(w, h) {
    const gl = this.gl;
    this._destroyFBO(this.read);
    this._destroyFBO(this.write);
    this.w = w; this.h = h;
    this.read  = this._makeFBO(gl, w, h);
    this.write = this._makeFBO(gl, w, h);
  }

  _destroyFBO(f) {
    this.gl.deleteTexture(f.tex);
    this.gl.deleteFramebuffer(f.fbo);
  }
}

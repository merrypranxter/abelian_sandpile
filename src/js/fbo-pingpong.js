// fbo-pingpong.js — integer-valued GPGPU ping-pong for grain counts
// Grain counts stored as floats (exact up to 2^24 with RGBA32F)
export class FBOPingPong {
  constructor(gl, w, h) {
    this.gl = gl;
    this.w = w; this.h = h;
    [this.read, this.write] = [this._makeFBO(w,h), this._makeFBO(w,h)];
  }

  _makeFBO(w, h) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // R32F: single channel float — stores grain count per cell
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

  swap() { [this.read, this.write] = [this.write, this.read]; }

  // Upload initial grain data (Float32Array, one value per cell)
  upload(data) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.read.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.w, this.h, 0, gl.RED, gl.FLOAT, data);
  }

  resize(w, h) {
    const gl = this.gl;
    // Delete old
    for (const f of [this.read, this.write]) {
      gl.deleteTexture(f.tex);
      gl.deleteFramebuffer(f.fbo);
    }
    this.w = w; this.h = h;
    [this.read, this.write] = [this._makeFBO(w,h), this._makeFBO(w,h)];
  }
}

// source.js — optional image upload / custom seed texture
export class Source {
  constructor(gl) { this.gl = gl; this.tex = null; this.active = false; }
  fromImage(file) {
    const gl = this.gl;
    const img = new Image();
    img.onload = () => {
      if (!this.tex) this.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      this.active = true;
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  }
}

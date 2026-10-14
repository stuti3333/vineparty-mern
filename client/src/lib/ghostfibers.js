const GhostFibers = (() => {
  const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;
  const FRAGMENT = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uDpr;
uniform float uTime;
uniform float uAngle;
uniform float uScale;
uniform float uLayers;
uniform float uWaves;
uniform float uTwist;
uniform float uThreads;
uniform float uSpread;
uniform float uThickness;
uniform float uGlow;
uniform float uBrightness;
uniform float uVignette;
uniform float uGrain;
uniform float uIntro;
uniform vec3 uGlowColor;
uniform vec3 uLineColor;
uniform vec4 uLens;
uniform float uLight;
const float PI = 3.14159265359;
mat2 rotate2d(float angle) { float s = sin(angle); float c = cos(angle); return mat2(c, -s, s, c); }
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float hairline(float value, float width, float px) {
  px = max(px, 1e-5);
  float w = 0.5 * width * uDpr * px;
  float draw = max(w, 0.75 * px);
  return exp(-value * value / (draw * draw)) * (w / draw);
}
void main() {
  vec2 resolution = uResolution * uDpr;
  vec2 uv = (2.0 * gl_FragCoord.xy - resolution) / resolution.y;
  float time = uTime;
  vec2 p = uv / max(uScale, 0.05);
  p = rotate2d(uAngle) * p;
  vec2 lensPoint = (2.0 * vec2(uLens.x, uResolution.y - uLens.y) * uDpr - resolution) / resolution.y;
  float lens = exp(-dot(uv - lensPoint, uv - lensPoint) / (uLens.z * uLens.z)) * uLens.w;
  float threads = 0.0; float ghosts = 0.0; float halo = 0.0;
  for (int index = 0; index < 10; index++) {
    float fi = float(index) + 1.0;
    if (fi > uLayers) break;
    p += uWaves * sin(p.yx * fi * 3.0 + time * (0.15 + fi * 0.08));
    float radius = length(p);
    float polarAngle = atan(p.y, p.x);
    polarAngle += sin(radius * 5.0 - time * 1.2 + fi) * uTwist;
    p = vec2(cos(polarAngle), sin(polarAngle)) * radius;
    float strand = p.x * 3.0 + time + fi;
    float center = PI * floor(strand / PI + 0.5);
    float offset = strand - center;
    float strandId = center / PI;
    halo += exp(-8.0 * abs(sin(strand))) / fi;
    float count = max(uThreads, 1.0);
    float even = 1.0 - mod(count, 2.0);
    float spacing = 0.03 * uSpread;
    float slot = offset / spacing + 0.5 * even;
    float slotPx = fwidth(strand) / spacing;
    float thread = floor(slot + 0.5);
    float rank = thread - 0.5 * even;
    float inside = step(abs(rank), 0.5 * (count - 1.0) + 0.01);
    float seed = hash(vec2(strandId * 7.13 + fi * 3.7, thread * 1.91 + fi));
    float shimmer = 0.55 + 0.45 * sin(p.y * (1.6 + seed * 1.8) + time * (0.6 + seed) + seed * 6.283);
    float taper = 1.0 - smoothstep(0.0, 0.5 * count + 0.6, abs(rank)) * 0.65;
    float appear = smoothstep(seed * 0.6, seed * 0.6 + 0.4, uIntro);
    threads += hairline(slot - thread, uThickness, slotPx) * inside * mix(0.35, 1.0, seed) * shimmer * taper * appear / sqrt(fi);
    float ghostPhase = p.x * (5.0 + fi * 2.0) + sin(p.y * 3.0 + time);
    float ghostLine = sin(ghostPhase) / max(fwidth(sin(ghostPhase)), 1e-5);
    ghosts += exp(-ghostLine * ghostLine / (0.8 * uThickness * uDpr + 0.6)) / fi;
  }
  float center = exp(-2.2 * dot(uv, uv));
  float cloud = exp(-1.5 * length(uv + vec2(sin(time * 0.3) * 0.25, cos(time * 0.25) * 0.18)));
  float vignette = 1.0 - smoothstep(0.35, 1.45, length(uv));
  float edge = mix(1.0 - uVignette, 1.0, vignette);
  float intro = smoothstep(0.0, 1.0, uIntro);
  float grain = (hash(gl_FragCoord.xy + fract(time * 13.7) * 91.0) - 0.5) * uGrain;
  float threadLight = threads * 2.2 * (1.0 + 0.6 * lens);
  float ghostLight = ghosts * 0.1 * intro * (1.0 + 1.5 * lens);
  float glowLight = halo * 0.6 * uGlow * intro;
  float airLight = (center * 0.07 + cloud * 0.1) * uGlow * intro;
  if (uLight > 0.5) {
    float ink = (1.0 - exp(-(threadLight * 1.1 + ghostLight * 1.4) * uBrightness)) * edge;
    float wash = (1.0 - exp(-(glowLight + airLight * 0.6) * 0.9 * uBrightness)) * 0.5 * edge;
    ink = clamp(ink * (1.0 + grain * 2.0), 0.0, 1.0);
    vec3 color = uLineColor * ink + uGlowColor * wash * (1.0 - ink);
    outColor = vec4(color, ink + wash * (1.0 - ink));
  } else {
    vec3 light = uLineColor * (threadLight + ghostLight) + uGlowColor * (glowLight + airLight);
    light *= uBrightness * edge;
    vec3 color = 1.0 - exp(-light);
    float peak = max(color.r, max(color.g, color.b));
    color = max(color + grain * peak, 0.0);
    outColor = vec4(color, max(color.r, max(color.g, color.b)));
  }
}`;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)),
    MAXD = 2048;
  const sh = (gl, t, s) => {
    const h = gl.createShader(t);
    gl.shaderSource(h, s);
    gl.compileShader(h);
    return gl.getShaderParameter(h, gl.COMPILE_STATUS) ? h : null;
  };
  return function (container, opts) {
    const S = {
      glowColor: '#b01230',
      lineColor: '',
      speed: 0.2,
      scale: 2,
      rotation: 0,
      rotationSpeed: 0.25,
      layers: 4,
      waves: 0.015,
      twist: 0.1,
      threads: 1,
      spread: 1,
      thickness: 1,
      glow: 2,
      brightness: 1.4,
      vignette: 0.8,
      grain: 0.03,
      mouseInteraction: true,
      intro: true,
      lightMode: false,
      paused: false,
      dpr: 1.25,
      ...opts,
    };
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;display:block';
    container.appendChild(canvas);
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    });
    const none = { set() {}, destroy() {} };
    if (!gl) return none;
    const vs = sh(gl, gl.VERTEX_SHADER, VERTEX),
      fs = sh(gl, gl.FRAGMENT_SHADER, FRAGMENT),
      prog = gl.createProgram();
    if (!vs || !fs) return none;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return none;
    const U = {};
    [
      'uResolution',
      'uDpr',
      'uTime',
      'uAngle',
      'uScale',
      'uLayers',
      'uWaves',
      'uTwist',
      'uThreads',
      'uSpread',
      'uThickness',
      'uGlow',
      'uBrightness',
      'uVignette',
      'uGrain',
      'uIntro',
      'uGlowColor',
      'uLineColor',
      'uLens',
      'uLight',
    ].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
    const vao = gl.createVertexArray(),
      buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, 'aPosition');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    const probe = document.createElement('canvas');
    probe.width = probe.height = 1;
    const pc = probe.getContext('2d', { willReadFrequently: true });
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const st = {
      time: 0,
      spin: 0,
      intro: S.intro && !reduce ? 0 : 10,
      w: 1,
      h: 1,
      ratio: 1,
      key: '',
      glow: [0.2, 0.22, 0.63],
      line: [0.8, 0.82, 1],
      ptr: { x: 0, y: 0, inside: false },
      lens: { x: 0, y: 0, vx: 0, vy: 0, s: 0, placed: false },
    };
    let raf = 0,
      last = 0,
      vis = true,
      alive = true;
    const rgb = (v, f) => {
      if (!pc || !v) return f;
      pc.clearRect(0, 0, 1, 1);
      pc.fillStyle = '#000';
      pc.fillStyle = v;
      pc.fillRect(0, 0, 1, 1);
      const d = pc.getImageData(0, 0, 1, 1).data;
      return [d[0] / 255, d[1] / 255, d[2] / 255];
    };
    const colors = () => {
      const k = S.glowColor + '|' + S.lineColor + '|' + S.lightMode;
      if (k === st.key) return;
      st.key = k;
      st.glow = rgb(S.glowColor, [0.2, 0.22, 0.63]);
      st.line = S.lineColor
        ? rgb(S.lineColor, st.glow)
        : S.lightMode
          ? st.glow.map((c) => c * 0.6)
          : st.glow.map((c) => c + (1 - c) * 0.78);
    };
    const render = () => {
      colors();
      const ip = clamp(st.intro / 2.2, 0, 1);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform2f(U.uResolution, st.w, st.h);
      gl.uniform1f(U.uDpr, st.ratio);
      gl.uniform1f(U.uTime, st.time);
      gl.uniform1f(U.uAngle, (S.rotation * Math.PI) / 180 + st.spin);
      gl.uniform1f(U.uScale, Math.max(0.05, S.scale));
      gl.uniform1f(U.uLayers, clamp(Math.round(S.layers), 1, 10));
      gl.uniform1f(U.uWaves, S.waves);
      gl.uniform1f(U.uTwist, S.twist);
      gl.uniform1f(U.uThreads, clamp(Math.round(S.threads), 1, 16));
      gl.uniform1f(U.uSpread, Math.max(0.1, S.spread));
      gl.uniform1f(U.uThickness, clamp(S.thickness, 0.2, 6));
      gl.uniform1f(U.uGlow, S.glow);
      gl.uniform1f(U.uBrightness, S.brightness);
      gl.uniform1f(U.uVignette, clamp(S.vignette, 0, 1));
      gl.uniform1f(U.uGrain, S.grain);
      gl.uniform1f(U.uIntro, 1 - Math.pow(1 - ip, 3));
      gl.uniform3f(U.uGlowColor, ...st.glow);
      gl.uniform3f(U.uLineColor, ...st.line);
      gl.uniform4f(U.uLens, st.lens.x, st.lens.y, 0.32, st.lens.s);
      gl.uniform1f(U.uLight, S.lightMode ? 1 : 0);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    };
    const resize = () => {
      const w = Math.max(1, container.clientWidth),
        h = Math.max(1, container.clientHeight),
        b = Math.min(S.dpr || devicePixelRatio || 1, 2),
        l = Math.max(w, h) * b,
        r = l > MAXD ? (b * MAXD) / l : b;
      const pw = Math.max(1, Math.round(w * r)),
        ph = Math.max(1, Math.round(h * r));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      st.w = w;
      st.h = h;
      st.ratio = canvas.width / w;
      render();
    };
    const frame = (now) => {
      raf = 0;
      if (!alive || !vis || document.hidden) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const moving = !S.paused && !reduce;
      if (moving) {
        st.time += dt * S.speed;
        st.spin += dt * S.speed * S.rotationSpeed;
      }
      const introducing = st.intro < 2.2;
      if (introducing) st.intro += dt;
      const { ptr, lens } = st,
        active = S.mouseInteraction && ptr.inside && !reduce;
      if (active && !lens.placed) {
        lens.x = ptr.x;
        lens.y = ptr.y;
        lens.vx = lens.vy = 0;
        lens.placed = true;
      }
      lens.vx += (110 * (ptr.x - lens.x) - 19 * lens.vx) * dt;
      lens.vy += (110 * (ptr.y - lens.y) - 19 * lens.vy) * dt;
      lens.x += lens.vx * dt;
      lens.y += lens.vy * dt;
      const goal = active ? 1 : 0;
      lens.s +=
        (goal - lens.s) * (1 - Math.exp(-dt / (goal > lens.s ? 0.3 : 0.55)));
      if (!active && lens.s < 0.001) lens.placed = false;
      render();
      const settling =
        Math.abs(goal - lens.s) > 0.002 || Math.hypot(lens.vx, lens.vy) > 0.5;
      if (moving || introducing || settling) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = () => {
      if (!raf && alive && vis && !document.hidden)
        raf = requestAnimationFrame(frame);
    };
    const pm = (e) => {
      const r = container.getBoundingClientRect(),
        x = e.clientX - r.left,
        y = e.clientY - r.top;
      st.ptr.x = x;
      st.ptr.y = y;
      st.ptr.inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      wake();
    };
    const pl = () => {
        st.ptr.inside = false;
        wake();
      },
      vc = () => {
        last = 0;
        wake();
      };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    const io = new IntersectionObserver((es) => {
      vis = es.some((e) => e.isIntersecting);
      if (vis) {
        last = 0;
        wake();
      }
    });
    io.observe(container);
    window.addEventListener('pointermove', pm, { passive: true });
    document.documentElement.addEventListener('pointerleave', pl);
    document.addEventListener('visibilitychange', vc);
    resize();
    wake();
    return {
      set(o) {
        Object.assign(S, o);
        if (!raf) render();
        wake();
      },
      destroy() {
        alive = false;
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener('pointermove', pm);
        document.removeEventListener('visibilitychange', vc);
        document.documentElement.removeEventListener('pointerleave', pl);
        canvas.remove();
      },
    };
  };
})();

export default GhostFibers;

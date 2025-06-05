import { useEffect, useRef } from "react";
import {
  Renderer,
  Program,
  Mesh,
  Triangle,
  Transform,
  Vec3,
  Camera,
} from "ogl";

import "../styles/MetaBalls.css";

function parseHexColor(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  return [r, g, b];
}

function fract(x) {
  return x - Math.floor(x);
}

function hash31(p) {
  let r = [p * 0.1031, p * 0.1030, p * 0.0973].map(fract);
  const r_yzx = [r[1], r[2], r[0]];
  const dotVal = r[0] * (r_yzx[0] + 33.33) + r[1] * (r_yzx[1] + 33.33) + r[2] * (r_yzx[2] + 33.33);
  for (let i = 0; i < 3; i++) {
    r[i] = fract(r[i] + dotVal);
  }
  return r;
}

function hash33(v) {
  let p = [v[0] * 0.1031, v[1] * 0.1030, v[2] * 0.0973].map(fract);
  const p_yxz = [p[1], p[0], p[2]];
  const dotVal = p[0] * (p_yxz[0] + 33.33) + p[1] * (p_yxz[1] + 33.33) + p[2] * (p_yxz[2] + 33.33);
  for (let i = 0; i < 3; i++) {
    p[i] = fract(p[i] + dotVal);
  }
  const p_xxy = [p[0], p[0], p[1]];
  const p_yxx = [p[1], p[0], p[0]];
  const p_zyx = [p[2], p[1], p[0]];
  const result = [];
  for (let i = 0; i < 3; i++) {
    result[i] = fract((p_xxy[i] + p_yxx[i]) * p_zyx[i]);
  }
  return result;
}

const vertex = `#version 300 es
precision highp float;
layout(location = 0) in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragment = `#version 300 es
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec3 iMouse;
uniform vec3 iColor;
uniform vec3 iCursorColor;
uniform float iAnimationSize;
uniform int iBallCount;
uniform float iCursorBallSize;
uniform vec3 iMetaBalls[50];
uniform float iClumpFactor;
uniform bool enableTransparency;
out vec4 outColor;

float getMetaBallValue(vec2 c, float r, vec2 p) {
  vec2 d = p - c;
  float dist2 = dot(d, d);
  return (r * r) / dist2;
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  float scale = iAnimationSize / iResolution.y;
  vec2 coord = (fc - iResolution.xy * 0.5) * scale;
  vec2 mouseW = (iMouse.xy - iResolution.xy * 0.5) * scale;
  float m1 = 0.0;
  for (int i = 0; i < 50; i++) {
    if (i >= iBallCount) break;
    m1 += getMetaBallValue(iMetaBalls[i].xy, iMetaBalls[i].z, coord);
  }
  float m2 = getMetaBallValue(mouseW, iCursorBallSize, coord);
  float total = m1 + m2;
  float f = smoothstep(-1.0, 1.0, (total - 1.3) / min(1.0, fwidth(total)));
  vec3 cFinal = vec3(0.0);
  if (total > 0.0) {
    float alpha1 = m1 / total;
    float alpha2 = m2 / total;
    cFinal = iColor * alpha1 + iCursorColor * alpha2;
  }
  outColor = vec4(cFinal * f, enableTransparency ? f : 1.0);
}`;

const MetaBalls = ({
  color = "#ffffff",
  speed = 0.3,
  enableMouseInteraction = true,
  hoverSmoothness = 0.05,
  animationSize = 30,
  ballCount = 15,
  clumpFactor = 1,
  cursorBallSize = 3,
  cursorBallColor = "#ffffff",
  enableTransparency = false,
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dpr = 1;
    const renderer = new Renderer({ dpr, alpha: true, premultipliedAlpha: false });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, enableTransparency ? 0 : 1);
    container.appendChild(gl.canvas);

    const camera = new Camera(gl, {
      left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 10,
    });
    camera.position.z = 1;

    const geometry = new Triangle(gl);
    const [r1, g1, b1] = parseHexColor(color);
    const [r2, g2, b2] = parseHexColor(cursorBallColor);

    const metaBallsUniform = Array.from({ length: 50 }, () => new Vec3(0, 0, 0));

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Vec3() },
        iMouse: { value: new Vec3() },
        iColor: { value: new Vec3(r1, g1, b1) },
        iCursorColor: { value: new Vec3(r2, g2, b2) },
        iAnimationSize: { value: animationSize },
        iBallCount: { value: ballCount },
        iCursorBallSize: { value: cursorBallSize },
        iMetaBalls: { value: metaBallsUniform },
        iClumpFactor: { value: clumpFactor },
        enableTransparency: { value: enableTransparency },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    const scene = new Transform();
    mesh.setParent(scene);

    const ballParams = Array.from({ length: Math.min(ballCount, 50) }, (_, i) => {
      const h1 = hash31(i + 1);
      const st = h1[0] * 2 * Math.PI;
      const dtFactor = 0.1 * Math.PI + h1[1] * 0.3 * Math.PI;
      const baseScale = 5 + h1[1] * 5;
      const h2 = hash33(h1);
      const toggle = Math.floor(h2[0] * 2);
      const radius = 0.5 + h2[2] * 1.5;
      return { st, dtFactor, baseScale, toggle, radius };
    });

    const mouseBallPos = { x: 0, y: 0 };
    let pointerInside = false;
    let pointerX = 0, pointerY = 0;

    function resize() {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width * dpr, height * dpr);
      gl.canvas.style.width = width + "px";
      gl.canvas.style.height = height + "px";
      program.uniforms.iResolution.value.set(gl.canvas.width, gl.canvas.height, 0);
    }
    window.addEventListener("resize", resize);
    resize();

    function onPointerMove(e) {
      if (!enableMouseInteraction) return;
      const rect = container.getBoundingClientRect();
      pointerX = (e.clientX - rect.left) / rect.width * gl.canvas.width;
      pointerY = (1 - (e.clientY - rect.top) / rect.height) * gl.canvas.height;
    }

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerenter", () => (pointerInside = true));
    container.addEventListener("pointerleave", () => (pointerInside = false));

    const startTime = performance.now();
    let animationFrameId;

    function update(t) {
      animationFrameId = requestAnimationFrame(update);
      const elapsed = (t - startTime) / 1000;
      program.uniforms.iTime.value = elapsed;

      ballParams.forEach((p, i) => {
        const th = p.st + elapsed * speed * p.dtFactor;
        const x = Math.cos(th);
        const y = Math.sin(th + elapsed * p.toggle);
        metaBallsUniform[i].set(x * p.baseScale * clumpFactor, y * p.baseScale * clumpFactor, p.radius);
      });

      let tx = pointerInside ? pointerX : gl.canvas.width / 2 + Math.cos(elapsed) * 100;
      let ty = pointerInside ? pointerY : gl.canvas.height / 2 + Math.sin(elapsed) * 100;

      mouseBallPos.x += (tx - mouseBallPos.x) * hoverSmoothness;
      mouseBallPos.y += (ty - mouseBallPos.y) * hoverSmoothness;
      program.uniforms.iMouse.value.set(mouseBallPos.x, mouseBallPos.y, 0);

      renderer.render({ scene, camera });
    }

    animationFrameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      container.removeEventListener("pointermove", onPointerMove);
      container.innerHTML = "";
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [
    color,
    speed,
    enableMouseInteraction,
    hoverSmoothness,
    animationSize,
    ballCount,
    clumpFactor,
    cursorBallSize,
    cursorBallColor,
    enableTransparency,
  ]);

  return <div ref={containerRef} className="metaballs-container" />;
};

export default MetaBalls;

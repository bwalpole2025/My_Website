const canvas = document.querySelector("#field");
const ctx = canvas.getContext("2d", { alpha: true });
const sections = document.querySelectorAll("[data-section]");

let width = 0;
let height = 0;
let dpr = 1;
let time = 0;
let pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
let particles = [];
let traces = [];

const palette = [
  [142, 240, 183],
  [244, 201, 109],
  [255, 143, 112],
  [119, 216, 255],
];

function renderMath() {
  if (!window.katex) return;

  document.querySelectorAll("[data-latex]").forEach((equation) => {
    window.katex.render(equation.dataset.latex, equation, {
      displayMode: true,
      throwOnError: false,
    });
  });
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildParticles();
  buildTraces();
}

function buildParticles() {
  const count = Math.floor(Math.min(210, Math.max(90, width * height * 0.00016)));
  particles = Array.from({ length: count }, (_, i) => {
    const color = palette[i % palette.length];
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      ox: Math.random() * width,
      oy: Math.random() * height,
      vx: 0,
      vy: 0,
      r: 0.7 + Math.random() * 1.8,
      color,
      phase: Math.random() * Math.PI * 2,
    };
  });
}

function buildTraces() {
  traces = Array.from({ length: 5 }, (_, i) => ({
    phase: i * 0.78,
    color: palette[(i + 1) % palette.length],
  }));
}

function drawGrid() {
  const gap = Math.max(54, Math.min(86, width / 18));
  const offsetX = ((time * 12) % gap) - gap;
  const offsetY = ((time * 8) % gap) - gap;
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "rgba(245,247,239,0.18)";
  ctx.lineWidth = 1;

  for (let x = offsetX; x < width + gap; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + pointer.x * 18, height);
    ctx.stroke();
  }

  for (let y = offsetY; y < height + gap; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + pointer.y * 14);
    ctx.stroke();
  }
  ctx.restore();
}

function attractorPoint(t, scale, phase) {
  const a = 2.08;
  const b = 1.68;
  const x =
    Math.sin(a * t + phase) * Math.cos(b * t) +
    0.42 * Math.sin(3.1 * t + pointer.x * 2.2);
  const y =
    Math.cos(b * t - phase) * Math.sin(a * t) +
    0.32 * Math.cos(2.7 * t + pointer.y * 2.4);
  return {
    x: width * 0.54 + x * scale,
    y: height * 0.49 + y * scale * 0.72,
  };
}

function drawTraces() {
  const scale = Math.min(width, height) * 0.34;
  traces.forEach((trace, traceIndex) => {
    ctx.save();
    ctx.lineWidth = traceIndex === 0 ? 1.9 : 1.1;
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = `rgba(${trace.color[0]},${trace.color[1]},${trace.color[2]},${0.34 - traceIndex * 0.035})`;
    ctx.shadowColor = `rgba(${trace.color[0]},${trace.color[1]},${trace.color[2]},0.45)`;
    ctx.shadowBlur = 22;
    ctx.beginPath();

    const steps = 310;
    for (let i = 0; i < steps; i += 1) {
      const t = i * 0.035 + time * (0.18 + traceIndex * 0.025);
      const p = attractorPoint(t, scale * (0.72 + traceIndex * 0.05), trace.phase);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }

    ctx.stroke();
    ctx.restore();
  });
}

function drawParticles() {
  const mx = pointer.x * width;
  const my = pointer.y * height;

  particles.forEach((p, i) => {
    const driftX = Math.sin(time * 0.42 + p.phase) * 60;
    const driftY = Math.cos(time * 0.35 + p.phase * 1.3) * 42;
    const targetX = p.ox + driftX + (pointer.x - 0.5) * 80;
    const targetY = p.oy + driftY + (pointer.y - 0.5) * 54;
    const dx = p.x - mx;
    const dy = p.y - my;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const force = Math.max(0, 1 - dist / 250);

    p.vx += (targetX - p.x) * 0.0025 + (dx / dist) * force * 0.34;
    p.vy += (targetY - p.y) * 0.0025 + (dy / dist) * force * 0.34;
    p.vx *= 0.93;
    p.vy *= 0.93;
    p.x += p.vx;
    p.y += p.vy;

    ctx.beginPath();
    ctx.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${0.48 + force * 0.35})`;
    ctx.arc(p.x, p.y, p.r + force * 1.4, 0, Math.PI * 2);
    ctx.fill();

    for (let j = i + 1; j < particles.length; j += 1) {
      const q = particles[j];
      const link = Math.hypot(p.x - q.x, p.y - q.y);
      if (link < 105) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(245,247,239,${(1 - link / 105) * 0.08})`;
        ctx.lineWidth = 1;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }
  });
}

function drawBloom() {
  const grd = ctx.createRadialGradient(
    pointer.x * width,
    pointer.y * height,
    0,
    pointer.x * width,
    pointer.y * height,
    Math.max(width, height) * 0.72,
  );
  grd.addColorStop(0, "rgba(142,240,183,0.12)");
  grd.addColorStop(0.42, "rgba(244,201,109,0.07)");
  grd.addColorStop(1, "rgba(5,7,5,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);
}

function animate() {
  time += 0.016;
  pointer.x += (pointer.tx - pointer.x) * 0.06;
  pointer.y += (pointer.ty - pointer.y) * 0.06;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(5,7,5,0.7)";
  ctx.fillRect(0, 0, width, height);
  drawBloom();
  drawGrid();
  drawTraces();
  drawParticles();

  requestAnimationFrame(animate);
}

function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    },
    { threshold: 0.12 },
  );

  sections.forEach((section) => observer.observe(section));
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => {
  pointer.tx = event.clientX / width;
  pointer.ty = event.clientY / height;
});
window.addEventListener("pointerleave", () => {
  pointer.tx = 0.5;
  pointer.ty = 0.5;
});

renderMath();
resize();
initReveal();
requestAnimationFrame(animate);

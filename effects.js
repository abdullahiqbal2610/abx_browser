// ═══════════════════════════════════════════
// ABX-One — Background Effects Engine
// Sci-fi nebula + cursor spotlight + dust
// ═══════════════════════════════════════════

(function () {
  "use strict";

  // === COLOR PALETTE ===
  const COLORS = {
    deepPurple: { r: 60, g: 20, b: 150 },
    faintBlue: { r: 30, g: 60, b: 140 },
    subtleWhite: { r: 180, g: 180, b: 200 },
  };

  // === 1. NEBULA CANVAS — Animated smoky aurora ===
  const nebulaCanvas = document.getElementById("nebulaCanvas");
  if (nebulaCanvas) {
    const ctx = nebulaCanvas.getContext("2d");
    let w, h;

    function resize() {
      w = nebulaCanvas.width = window.innerWidth;
      h = nebulaCanvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Mouse tracking for interactive nebula
    let mouseX = w / 2,
      mouseY = h / 2;
    document.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    // Nebula orbs — large, slow-moving colored blobs
    class NebOrb {
      constructor() {
        this.reset();
      }
      reset() {
        const palette = [COLORS.deepPurple, COLORS.faintBlue, COLORS.subtleWhite];
        this.color = palette[Math.floor(Math.random() * palette.length)];
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.radius = Math.random() * 150 + 100;
        this.vx = (Math.random() - 0.5) * 0.15; // Slower
        this.vy = (Math.random() - 0.5) * 0.15; // Slower
        this.alpha = Math.random() * 0.015 + 0.008; // slightly brighter
        this.phase = Math.random() * Math.PI * 2;
        this.pulseSpeed = Math.random() * 0.005 + 0.003;
      }
      update() {
        this.phase += this.pulseSpeed;

        // Gentle drift toward mouse (very subtle attraction)
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1;
        this.vx += (dx / dist) * 0.002;
        this.vy += (dy / dist) * 0.002;

        // Dampen velocity
        this.vx *= 0.998;
        this.vy *= 0.998;

        this.x += this.vx;
        this.y += this.vy;

        // Wrap around edges
        if (this.x < -this.radius) this.x = w + this.radius;
        if (this.x > w + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = h + this.radius;
        if (this.y > h + this.radius) this.y = -this.radius;
      }
      draw(ctx) {
        const pulse = 0.7 + Math.sin(this.phase) * 0.3;
        const a = this.alpha * pulse;
        const r = this.radius * (0.9 + Math.sin(this.phase * 0.7) * 0.1);
        const grad = ctx.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          r
        );
        grad.addColorStop(
          0,
          `rgba(${this.color.r},${this.color.g},${this.color.b},${a})`
        );
        grad.addColorStop(
          0.5,
          `rgba(${this.color.r},${this.color.g},${this.color.b},${a * 0.4})`
        );
        grad.addColorStop(
          1,
          `rgba(${this.color.r},${this.color.g},${this.color.b},0)`
        );
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const orbs = [];
    for (let i = 0; i < 6; i++) {
      orbs.push(new NebOrb());
    }

    // Mouse glow — brighter orb near cursor (made smaller and dimmer)
    function drawMouseGlow(ctx) {
      const grad = ctx.createRadialGradient(
        mouseX,
        mouseY,
        0,
        mouseX,
        mouseY,
        150 // Smaller radius
      );
      grad.addColorStop(0, "rgba(80,80,150,0.015)");
      grad.addColorStop(0.5, "rgba(50,50,100,0.005)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 150, 0, Math.PI * 2);
      ctx.fill();
    }

    function nebulaLoop() {
      // Fade previous frame (creates trail/smoke effect)
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(10,10,10,0.15)";
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";

      // Draw nebula orbs
      for (const orb of orbs) {
        orb.update();
        orb.draw(ctx);
      }

      // Draw mouse glow
      drawMouseGlow(ctx);

      requestAnimationFrame(nebulaLoop);
    }
    nebulaLoop();
  }

  // === 2. NOISE GRAIN OVERLAY ===
  const noiseEl = document.getElementById("noiseOverlay");
  if (noiseEl) {
    const nc = document.createElement("canvas");
    const nctx = nc.getContext("2d");
    nc.width = 200;
    nc.height = 200;
    const imageData = nctx.createImageData(200, 200);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
    nctx.putImageData(imageData, 0, 0);
    noiseEl.style.backgroundImage = "url(" + nc.toDataURL("image/png") + ")";
    noiseEl.style.backgroundRepeat = "repeat";
  }

  // === 3. FLOATING DUST PARTICLES ===
  const dustField = document.getElementById("dustField");
  if (dustField) {
    const DUST_COUNT = 800;
    const dustColors = [
      "rgba(150,150,200,0.8)",
      "rgba(100,100,180,0.6)",
      "rgba(200,200,220,0.5)",
    ];
    for (let i = 0; i < DUST_COUNT; i++) {
      const d = document.createElement("div");
      d.className = "dust";
      const size = Math.random() * 2 + 0.5;
      d.style.width = size + "px";
      d.style.height = size + "px";
      d.style.left = Math.random() * 100 + "%";
      d.style.background =
        dustColors[Math.floor(Math.random() * dustColors.length)];
      d.style.animationDuration = Math.random() * 40 + 35 + "s"; // Much slower
      d.style.animationDelay = Math.random() * -80 + "s";
      dustField.appendChild(d);
    }
  }
})();

export function createSignature(canvas, onChange) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, drawing = false, last = null, lastMid = null, gen = 0; // gen: verhoogd door wissen/tekenen, laat een trage restore vervallen

  function setup(dataUrl) {
    const dpr = window.devicePixelRatio || 1;
    w = canvas.offsetWidth;
    h = canvas.offsetHeight;
    canvas.width = w * dpr; // reset ook de context-state
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ctx.fillStyle = '#15171A';
    if (dataUrl) {
      const img = new Image(), g = ++gen;
      img.onload = () => { if (g === gen) ctx.drawImage(img, 0, 0, w, h); };
      img.src = dataUrl;
    }
  }

  const pt = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return; // palm of tweede vinger
    gen++;
    drawing = true;
    last = lastMid = pt(e);
    canvas.setPointerCapture(e.pointerId);
    ctx.beginPath();
    ctx.arc(last.x, last.y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing || !e.isPrimary) return;
    const p = pt(e);
    const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(lastMid.x, lastMid.y);
    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
    ctx.stroke();
    last = p;
    lastMid = mid;
  });
  const end = (e) => {
    if (!drawing || !e.isPrimary) return;
    drawing = false;
    ctx.beginPath(); // laatste halve segment: middelpunt → eindpunt
    ctx.moveTo(lastMid.x, lastMid.y);
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    onChange(canvas.toDataURL('image/png'));
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  return {
    setup,
    clear() {
      gen++;
      ctx.clearRect(0, 0, w, h);
      onChange(null);
    },
  };
}

// ─── LINK GRAPH (lazy) ───
let graphNodes = [], graphSlugIndex = {}, graphEdges = 0;
let graphZoom = 1, graphPanX = 0, graphPanY = 0;
let graphDragging = null, graphPanning = false, lastMouse = null;
let graphPhysics = true, graphAnimFrame = null;
let graphW = 1100, graphH = 400;
const graphColors = {concept: '#22d3ee', person: '#a78bfa', company: '#34d399', meeting: '#fbbf24', daily: '#fb7185'};

function resizeCanvas() {
  const canvas = document.getElementById('graphCanvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0) return;
  const dpr = window.devicePixelRatio || 1;
  const newW = Math.round(rect.width * dpr);
  const newH = Math.round(rect.height * dpr);
  if (newW === graphW && newH === graphH) return;
  const sx = newW / (graphW || 1), sy = newH / (graphH || 1);
  graphNodes.forEach(n => { n.x *= sx; n.y *= sy; });
  graphW = newW; graphH = newH;
  canvas.width = graphW; canvas.height = graphH;
  drawGraphFrame();
}

function initGraph() {
  const pages = DATA.pages || [];
  if (!pages.length) return;
  graphSlugIndex = {};
  pages.forEach((p,i) => graphSlugIndex[p.slug] = i);
  if (graphNodes.length !== pages.length) {
    const canvas = document.getElementById('graphCanvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) {
        const dpr = window.devicePixelRatio || 1;
        graphW = Math.round(rect.width * dpr);
        graphH = Math.round(rect.height * dpr);
        canvas.width = graphW; canvas.height = graphH;
      }
    }
    graphNodes = pages.map((p,i) => ({ id: i, slug: p.slug, title: p.title, type: p.type, links: p.links_out || [], vx: 0, vy: 0 }));
    layoutCircle();
    runPhysics(80);
    graphZoom = 1; graphPanX = 0; graphPanY = 0;
  }
  drawGraphFrame();
  if (graphPhysics) startPhysicsLoop();
}

function layoutCircle() {
  const cx = graphW/2, cy = graphH/2, rx = graphW/2 - 60, ry = graphH/2 - 50;
  graphNodes.forEach((n,i) => {
    const angle = (i / graphNodes.length) * 2 * Math.PI - Math.PI/2;
    n.x = cx + rx * Math.cos(angle); n.y = cy + ry * Math.sin(angle);
  });
}

function runPhysics(iterations) {
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < graphNodes.length; i++) {
      for (let j = i+1; j < graphNodes.length; j++) {
        const dx = graphNodes[i].x - graphNodes[j].x, dy = graphNodes[i].y - graphNodes[j].y;
        const dist = Math.sqrt(dx*dx+dy*dy) || 1, force = 400 / (dist*dist);
        graphNodes[i].vx += (dx/dist) * force; graphNodes[i].vy += (dy/dist) * force;
        graphNodes[j].vx -= (dx/dist) * force; graphNodes[j].vy -= (dy/dist) * force;
      }
    }
    graphNodes.forEach(n => {
      n.links.forEach(l => {
        const j = graphSlugIndex[l.to]; if (j === undefined) return;
        const dx = n.x - graphNodes[j].x, dy = n.y - graphNodes[j].y;
        const dist = Math.sqrt(dx*dx+dy*dy) || 1, force = dist * 0.001;
        n.vx -= (dx/dist) * force; n.vy -= (dy/dist) * force;
        graphNodes[j].vx += (dx/dist) * force; graphNodes[j].vy += (dy/dist) * force;
      });
    });
    graphNodes.forEach(n => {
      n.vx += (graphW/2 - n.x) * 0.001; n.vy += (graphH/2 - n.y) * 0.001;
      n.vx *= 0.85; n.vy *= 0.85;
      n.x += n.vx; n.y += n.vy;
    });
  }
  graphNodes.forEach(n => { n.vx = 0; n.vy = 0; });
}

function startPhysicsLoop() {
  if (graphAnimFrame) cancelAnimationFrame(graphAnimFrame);
  function tick() {
    if (!graphPhysics) { graphAnimFrame = null; return; }
    let energy = 0;
    for (let i = 0; i < graphNodes.length; i++) {
      for (let j = i+1; j < graphNodes.length; j++) {
        const dx = graphNodes[i].x - graphNodes[j].x, dy = graphNodes[i].y - graphNodes[j].y;
        const dist = Math.sqrt(dx*dx+dy*dy) || 1, force = 200 / (dist*dist);
        graphNodes[i].vx += (dx/dist) * force * 0.3; graphNodes[i].vy += (dy/dist) * force * 0.3;
        graphNodes[j].vx -= (dx/dist) * force * 0.3; graphNodes[j].vy -= (dy/dist) * force * 0.3;
      }
    }
    graphNodes.forEach(n => {
      n.links.forEach(l => {
        const j = graphSlugIndex[l.to]; if (j === undefined) return;
        const dx = n.x - graphNodes[j].x, dy = n.y - graphNodes[j].y;
        const dist = Math.sqrt(dx*dx+dy*dy) || 1, force = dist * 0.0005;
        n.vx -= (dx/dist) * force; n.vy -= (dy/dist) * force;
        graphNodes[j].vx += (dx/dist) * force; graphNodes[j].vy += (dy/dist) * force;
      });
    });
    graphNodes.forEach(n => {
      if (n === graphDragging) return;
      n.vx += (graphW/2 - n.x) * 0.0003; n.vy += (graphH/2 - n.y) * 0.0003;
      n.vx *= 0.92; n.vy *= 0.92;
      n.x += n.vx; n.y += n.vy;
      energy += Math.abs(n.vx) + Math.abs(n.vy);
    });
    drawGraphFrame();
    if (energy > 3) graphAnimFrame = requestAnimationFrame(tick);
    else graphAnimFrame = null;
  }
  graphAnimFrame = requestAnimationFrame(tick);
}

function drawGraph() { initGraph(); }

function drawGraphFrame() {
  const canvas = document.getElementById('graphCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(148,163,184,0.04)'; ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.save();
  ctx.translate(graphPanX, graphPanY);
  ctx.scale(graphZoom, graphZoom);
  const drawnEdges = new Set();
  graphNodes.forEach(n => {
    n.links.forEach(l => {
      const j = graphSlugIndex[l.to]; if (j === undefined) return;
      const key = [Math.min(n.id,j), Math.max(n.id,j)].join('-');
      if (drawnEdges.has(key)) return;
      drawnEdges.add(key);
      const src = graphNodes[j];
      ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(src.x, src.y);
      ctx.strokeStyle = 'rgba(148,163,184,0.4)'; ctx.lineWidth = 1.6 / graphZoom;
      ctx.stroke();
    });
  });
  graphEdges = drawnEdges.size;
  graphNodes.forEach(n => {
    const color = graphColors[n.type] || '#94a3b8';
    const size = Math.max(4, 3 + n.links.length);
    const isHovered = canvas._hoveredNode === n;
    const r = isHovered ? size + 3 : size;
    if (isHovered) { ctx.beginPath(); ctx.arc(n.x, n.y, r+6, 0, Math.PI*2); ctx.fillStyle = 'rgba(34,211,238,0.3)'; ctx.fill(); }
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2);
    ctx.fillStyle = isHovered ? '#fff' : color; ctx.fill();
    ctx.strokeStyle = isHovered ? color : 'rgba(255,255,255,0)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.5; ctx.stroke();
    if (isHovered) {
      const maxLen = W < 800 ? 14 : 20;
      const label = n.title.length > maxLen ? n.title.slice(0,maxLen-1)+'…' : n.title;
      const labelColor = getComputedStyle(document.body).getPropertyValue('--text').trim() || '#e2e8f0';
      ctx.font = '10px "Inter", sans-serif';
      ctx.fillStyle = labelColor;
      ctx.textAlign = 'center';
      const metrics = ctx.measureText(label);
      const pad = 4;
      const lx = n.x - metrics.width/2 - pad, ly = n.y + r + 16;
      ctx.fillStyle = 'rgba(15,23,42,0.85)';
      ctx.beginPath(); ctx.roundRect(lx, ly, metrics.width + pad*2, 16, 4); ctx.fill();
      ctx.fillStyle = labelColor;
      ctx.fillText(label, n.x, n.y + r + 27);
    }
  });
  ctx.restore();
  if (graphZoom !== 1) {
    ctx.fillStyle = 'rgba(148,163,184,0.5)'; ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(graphZoom * 100) + '%', W - 12, H - 12);
  }
  document.getElementById('graphCount').textContent = `${graphNodes.length} nodes, ${graphEdges} edges`;
}

// ─── GRAPH MOUSE + TOUCH ───
(function setupGraphInput() {
  const canvas = document.getElementById('graphCanvas');
  canvas._hoveredNode = null;
  let dragStartNode = null, dragDist = 0, dragStartW = null;

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const sx = (clientX - rect.left) * (graphW / rect.width);
    const sy = (clientY - rect.top) * (graphH / rect.height);
    return { x: (sx - graphPanX) / graphZoom, y: (sy - graphPanY) / graphZoom };
  }

  function hitTest(wx, wy) {
    for (let i = graphNodes.length-1; i >= 0; i--) {
      const n = graphNodes[i];
      const size = Math.max(4, 3 + n.links.length) + 4;
      const dx = wx - n.x, dy = wy - n.y;
      if (dx*dx + dy*dy < size*size) return n;
    }
    return null;
  }

  // Desktop mouse
  canvas.addEventListener('mousedown', function(e) {
    const w = screenToWorld(e.clientX, e.clientY);
    const hit = hitTest(w.x, w.y);
    if (hit) {
      dragStartNode = hit; dragDist = 0; dragStartW = w;
      graphDragging = hit; graphPanning = false;
      canvas.classList.add('dragging-node'); e.preventDefault();
    } else {
      dragStartNode = null; dragDist = 0;
      graphPanning = true; lastMouse = {x: e.clientX, y: e.clientY};
    }
  });

  window.addEventListener('mousemove', function(e) {
    if (graphDragging) {
      const w = screenToWorld(e.clientX, e.clientY);
      if (dragStartW) { const dx = w.x - dragStartW.x, dy = w.y - dragStartW.y; dragDist = Math.sqrt(dx*dx + dy*dy); }
      graphDragging.x = w.x; graphDragging.y = w.y; graphDragging.vx = 0; graphDragging.vy = 0;
      drawGraphFrame(); return;
    }
    if (graphPanning && lastMouse) {
      graphPanX += e.clientX - lastMouse.x; graphPanY += e.clientY - lastMouse.y;
      lastMouse = {x: e.clientX, y: e.clientY}; drawGraphFrame(); return;
    }
    const w = screenToWorld(e.clientX, e.clientY);
    const hit = hitTest(w.x, w.y);
    const prev = canvas._hoveredNode;
    canvas._hoveredNode = hit;
    if (prev !== hit) drawGraphFrame();
    canvas.style.cursor = hit ? 'pointer' : 'grab';
  });

  window.addEventListener('mouseup', function(e) {
    if (graphDragging) {
      canvas.classList.remove('dragging-node');
      if (graphPhysics) startPhysicsLoop();
      graphDragging = null;
    }
    if (graphPanning) { graphPanning = false; lastMouse = null; }
  });

  canvas.addEventListener('click', function(e) {
    const dragged = dragDist > 5;
    dragStartNode = null; dragDist = 0; dragStartW = null;
    if (graphPanning) { graphPanning = false; lastMouse = null; return; }
    if (dragged) return;
    const w = screenToWorld(e.clientX, e.clientY);
    const hit = hitTest(w.x, w.y);
    if (hit) openPageModal(hit.slug);
  });

  canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(3, graphZoom * delta));
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (graphW / rect.width);
    const my = (e.clientY - rect.top) * (graphH / rect.height);
    graphPanX = mx - (mx - graphPanX) * (newZoom / graphZoom);
    graphPanY = my - (my - graphPanY) * (newZoom / graphZoom);
    graphZoom = newZoom; drawGraphFrame();
  });

  // Pinch zoom for touch
  let touchDist0 = 0, touchMid0 = null;
  let singleTouchStart = null, singleTouchWorld = null;

  canvas.addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDist0 = Math.sqrt(dx*dx+dy*dy);
      touchMid0 = {x: graphPanX, y: graphPanY, z: graphZoom};
      e.preventDefault();
    } else if (e.touches.length === 1) {
      singleTouchStart = {x: e.touches[0].clientX, y: e.touches[0].clientY};
      const w = screenToWorld(e.touches[0].clientX, e.touches[0].clientY);
      const hit = hitTest(w.x, w.y);
      if (hit) {
        dragStartNode = hit; dragDist = 0; dragStartW = w;
        graphDragging = hit; graphPanning = false;
      } else {
        graphPanning = true; lastMouse = {x: e.touches[0].clientX, y: e.touches[0].clientY};
      }
    }
  }, {passive: false});

  canvas.addEventListener('touchmove', function(e) {
    if (e.touches.length === 2 && touchDist0 > 0 && touchMid0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx*dx+dy*dy);
      graphZoom = Math.max(0.3, Math.min(3, touchMid0.z * (dist / touchDist0)));
      drawGraphFrame();
      e.preventDefault();
    } else if (e.touches.length === 1) {
      if (graphDragging) {
        const w = screenToWorld(e.touches[0].clientX, e.touches[0].clientY);
        if (dragStartW) { const dx = w.x - dragStartW.x, dy = w.y - dragStartW.y; dragDist = Math.sqrt(dx*dx+dy*dy); }
        graphDragging.x = w.x; graphDragging.y = w.y;
        drawGraphFrame();
      } else if (graphPanning && lastMouse) {
        graphPanX += e.touches[0].clientX - lastMouse.x;
        graphPanY += e.touches[0].clientY - lastMouse.y;
        lastMouse = {x: e.touches[0].clientX, y: e.touches[0].clientY};
        drawGraphFrame();
      }
    }
  }, {passive: false});

  canvas.addEventListener('touchend', function(e) {
    if (graphDragging && dragDist <= 5) {
      // Tap → open modal
      const hit = dragStartNode;
      graphDragging = null; dragStartNode = null; dragDist = 0;
      canvas.classList.remove('dragging-node');
      if (hit) openPageModal(hit.slug);
    } else {
      if (graphDragging) { canvas.classList.remove('dragging-node'); graphDragging = null; }
    }
    graphPanning = false; lastMouse = null;
    touchDist0 = 0; touchMid0 = null;
  });
})();

// ─── GRAPH FULLSCREEN ───
function toggleGraphFullscreen() {
  const gc = document.getElementById('graphContainer');
  if (gc.classList.contains('graph-fullscreen')) {
    gc.classList.remove('graph-fullscreen');
    const closeBtn = gc.querySelector('.graph-close');
    if (closeBtn) closeBtn.remove();
  } else {
    gc.classList.add('graph-fullscreen');
    const btn = document.createElement('button');
    btn.className = 'graph-close'; btn.textContent = '✕ Close';
    btn.onclick = toggleGraphFullscreen;
    gc.appendChild(btn);
    setTimeout(resizeCanvas, 100);
  }
}

// ─── RESIZE ───
window.addEventListener('resize', () => { resizeCanvas(); if (graphPhysics && !graphAnimFrame) startPhysicsLoop(); });
if (window.ResizeObserver) {
  new ResizeObserver(() => { resizeCanvas(); }).observe(document.getElementById('graphCanvas'));
}

function resetGraph() {
  graphZoom = 1; graphPanX = 0; graphPanY = 0;
  layoutCircle(); runPhysics(80); drawGraphFrame();
  if (graphPhysics) startPhysicsLoop();
}

function togglePhysics() {
  graphPhysics = document.getElementById('physicsToggle').checked;
  if (graphPhysics) startPhysicsLoop();
  else { if (graphAnimFrame) { cancelAnimationFrame(graphAnimFrame); graphAnimFrame = null; } }
}


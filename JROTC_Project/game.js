const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const briefing = document.getElementById('briefing');
const startBtn = document.getElementById('startBtn');
const questList = document.getElementById('questList');
const hint = document.getElementById('hint');
const alertFill = document.getElementById('alertFill');

const map = [
  '####################',
  '#......#...........#',
  '#.####.#.#####.###.#',
  '#....#.#.....#...#.#',
  '###..#.###.#.###.#.#',
  '#....#.....#.....#.#',
  '#.###########.###..#',
  '#.................X#',
  '####################'
];

const quests = [
  { id: 'infiltrate', label: 'Infiltrate White House set undetected', done: false },
  { id: 'retrieve', label: 'Retrieve cardboard President cutout from Oval Office set', done: false },
  { id: 'exfil', label: 'Exfiltrate to National Mall with the cutout', done: false },
];

const objective = { x: 16.8, y: 2.4, name: 'Cardboard President', collected: false };
const exfil = { x: 18.2, y: 7.2, name: 'Extraction Zone' };

const guards = [
  { x: 4.6, y: 1.8, dir: 0.2, speed: 0.9, color: '#ff8e73', name: 'Guard A', patrol: [[4.6, 1.8], [6.8, 1.8], [6.8, 3.2], [4.6, 3.2]], p: 0 },
  { x: 10.8, y: 5.8, dir: -1.2, speed: 1.0, color: '#ff8e73', name: 'Guard B', patrol: [[10.8, 5.8], [13.8, 5.8], [13.8, 3.8], [10.8, 3.8]], p: 0 },
  { x: 15.5, y: 6.5, dir: -1.3, speed: 0.8, color: '#ff8e73', name: 'Guard C', patrol: [[15.5, 6.5], [17.6, 6.2], [17.5, 4.2], [15.2, 4.4]], p: 0 },
];

const state = {
  x: 2.1,
  y: 7.2,
  dir: -0.25,
  fov: Math.PI / 3,
  keys: new Set(),
  running: false,
  crouch: false,
  alert: 0,
  message: 'Move slowly and stay out of guard vision cones.'
};

function wallAt(x, y) {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  return map[gy]?.[gx] === '#';
}

function renderQuests() {
  questList.innerHTML = '';
  for (const q of quests) {
    const li = document.createElement('li');
    li.textContent = q.label;
    if (q.done) li.classList.add('complete');
    questList.append(li);
  }
  hint.textContent = state.message;
  alertFill.style.width = `${Math.min(100, state.alert)}%`;
}

function completeQuest(id, msg) {
  const q = quests.find((item) => item.id === id);
  if (!q || q.done) return;
  q.done = true;
  state.message = msg;
  renderQuests();
}

function resetPlayerAfterDetection() {
  state.x = 2.1;
  state.y = 7.2;
  state.dir = -0.25;
  state.alert = 0;
  state.message = 'Detected! Repositioned at start. Try a quieter route.';
  renderQuests();
}

function lineOfSight(x1, y1, x2, y2) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 0.06);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (wallAt(x, y)) return false;
  }
  return true;
}

function updateGuards(dt) {
  for (const guard of guards) {
    const [tx, ty] = guard.patrol[guard.p];
    const gx = tx - guard.x;
    const gy = ty - guard.y;
    const dist = Math.hypot(gx, gy);

    if (dist < 0.1) {
      guard.p = (guard.p + 1) % guard.patrol.length;
    } else {
      guard.dir = Math.atan2(gy, gx);
      const step = Math.min(dist, guard.speed * dt);
      const nx = guard.x + Math.cos(guard.dir) * step;
      const ny = guard.y + Math.sin(guard.dir) * step;
      if (!wallAt(nx, ny)) {
        guard.x = nx;
        guard.y = ny;
      }
    }
  }
}

function updateStealth(dt) {
  const visibilityScale = state.crouch ? 0.5 : 1;
  let spotted = false;

  for (const guard of guards) {
    const dx = state.x - guard.x;
    const dy = state.y - guard.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 7) continue;
    const angleToPlayer = Math.atan2(dy, dx);
    let diff = angleToPlayer - guard.dir;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    const inCone = Math.abs(diff) < 0.6;
    const visible = inCone && lineOfSight(guard.x, guard.y, state.x, state.y);

    if (visible) {
      const gain = ((1.2 - Math.min(dist, 6) / 6) * 34 + 7) * visibilityScale;
      state.alert += gain * dt;
      spotted = true;
    }
  }

  if (!spotted) state.alert = Math.max(0, state.alert - 20 * dt);

  if (state.alert >= 100) {
    resetPlayerAfterDetection();
  } else {
    renderQuests();
  }
}

function updateObjectives() {
  const distToObjective = Math.hypot(objective.x - state.x, objective.y - state.y);
  if (distToObjective < 1.1 && !objective.collected) {
    objective.collected = true;
    completeQuest('retrieve', 'Cardboard President secured. Exfiltrate to the National Mall extraction point.');
  }

  if (objective.collected && !quests.find((q) => q.id === 'infiltrate').done) {
    completeQuest('infiltrate', 'Infiltration successful. Cutout in hand.');
  }

  const atExfil = Math.hypot(exfil.x - state.x, exfil.y - state.y) < 1.2;
  if (objective.collected && atExfil) {
    completeQuest('exfil', 'Mission complete. You executed a clean stealth extraction.');
  }
}

function update(dt) {
  state.crouch = state.keys.has('shift');

  const moveSpeed = (state.crouch ? 1.35 : 2.4) * dt;
  const turnSpeed = 1.8 * dt;

  if (state.keys.has('arrowleft')) state.dir -= turnSpeed;
  if (state.keys.has('arrowright')) state.dir += turnSpeed;

  let dx = 0;
  let dy = 0;
  if (state.keys.has('w')) { dx += Math.cos(state.dir) * moveSpeed; dy += Math.sin(state.dir) * moveSpeed; }
  if (state.keys.has('s')) { dx -= Math.cos(state.dir) * moveSpeed; dy -= Math.sin(state.dir) * moveSpeed; }
  if (state.keys.has('a')) { dx += Math.cos(state.dir - Math.PI / 2) * moveSpeed; dy += Math.sin(state.dir - Math.PI / 2) * moveSpeed; }
  if (state.keys.has('d')) { dx += Math.cos(state.dir + Math.PI / 2) * moveSpeed; dy += Math.sin(state.dir + Math.PI / 2) * moveSpeed; }

  const nx = state.x + dx;
  const ny = state.y + dy;
  if (!wallAt(nx, state.y)) state.x = nx;
  if (!wallAt(state.x, ny)) state.y = ny;

  updateGuards(dt);
  updateStealth(dt);
  updateObjectives();
}

function drawScene() {
  const { width, height } = canvas;
  ctx.fillStyle = '#8eaac8';
  ctx.fillRect(0, 0, width, height / 2);
  ctx.fillStyle = '#2f4531';
  ctx.fillRect(0, height / 2, width, height / 2);

  for (let x = 0; x < width; x++) {
    const rayAngle = state.dir - state.fov / 2 + (x / width) * state.fov;
    let dist = 0;
    let hit = false;
    while (!hit && dist < 22) {
      dist += 0.03;
      const rx = state.x + Math.cos(rayAngle) * dist;
      const ry = state.y + Math.sin(rayAngle) * dist;
      hit = wallAt(rx, ry);
    }

    const correctedDist = dist * Math.cos(rayAngle - state.dir);
    const wallHeight = Math.min(height, (height * 0.9) / Math.max(correctedDist, 0.01));
    const shade = Math.max(45, 195 - correctedDist * 15);
    ctx.fillStyle = `rgb(${shade - 12}, ${shade - 18}, ${shade + 15})`;
    ctx.fillRect(x, (height - wallHeight) / 2, 1, wallHeight);
  }

  const sprites = [];

  sprites.push({ x: objective.x, y: objective.y, color: objective.collected ? '#5f6e81' : '#ffe082', name: objective.collected ? 'President Cutout Secured' : objective.name, guard: false });
  sprites.push({ x: exfil.x, y: exfil.y, color: '#74d1ff', name: exfil.name, guard: false });

  for (const g of guards) {
    sprites.push({ x: g.x, y: g.y, color: g.color, name: g.name, guard: true, dir: g.dir });
  }

  const projected = [];
  for (const sprite of sprites) {
    const dx = sprite.x - state.x;
    const dy = sprite.y - state.y;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) - state.dir;
    let wrapped = angle;
    while (wrapped < -Math.PI) wrapped += Math.PI * 2;
    while (wrapped > Math.PI) wrapped -= Math.PI * 2;
    if (Math.abs(wrapped) < state.fov / 1.8 && dist > 0.3) projected.push({ sprite, dist, wrapped });
  }

  projected.sort((a, b) => b.dist - a.dist);
  for (const p of projected) {
    const s = p.sprite;
    const size = Math.min(height * 0.62, 290 / p.dist);
    const sx = (0.5 + p.wrapped / state.fov) * width;
    const sy = height / 2 + size * 0.18;

    ctx.fillStyle = '#b58f67';
    ctx.fillRect(sx - size * 0.11, sy - size * 0.22, size * 0.22, size * 0.3);
    ctx.fillStyle = s.color;
    ctx.fillRect(sx - size * 0.16, sy - size * 0.55, size * 0.32, size * 0.35);

    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(sx - size * 0.06, sy - size * 0.42, size * 0.018, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + size * 0.06, sy - size * 0.42, size * 0.018, 0, Math.PI * 2); ctx.fill();

    if (s.guard) {
      const px = sx + Math.cos(s.dir - state.dir) * size * 0.12;
      const py = sy - size * 0.31 + Math.sin(s.dir - state.dir) * size * 0.06;
      ctx.fillStyle = '#ffd95a';
      ctx.fillRect(px - size * 0.015, py - size * 0.015, size * 0.03, size * 0.03);
    }

    ctx.fillStyle = '#f1f6ff';
    ctx.font = `bold ${Math.max(12, size * 0.12)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(s.name, sx, sy - size * 0.62);
  }

  ctx.fillStyle = state.crouch ? '#a4f0b6' : '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.fillText('Stealth: WASD + ← →. Hold Shift to crouch and reduce detection.', 20, 30);
}

let previous = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - previous) / 1000);
  previous = now;

  if (state.running) update(dt);
  drawScene();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  state.keys.add(e.key.toLowerCase());
});

window.addEventListener('keyup', (e) => {
  state.keys.delete(e.key.toLowerCase());
});

function startSimulation() {
  briefing.style.display = 'none';
  state.running = true;
  renderQuests();
}

startBtn.addEventListener('click', startSimulation);

const params = new URLSearchParams(window.location.search);
if (params.get('autostart') === '1') {
  startSimulation();
}

renderQuests();
requestAnimationFrame(loop);

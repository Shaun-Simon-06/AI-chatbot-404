/* =========================================================
   Interactive particle background
========================================================= */
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let bursts = [];
const mouse = { x: -9999, y: -9999 };

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function rand(min, max) { return Math.random() * (max - min) + min; }

function createParticle() {
  return {
    x: rand(0, canvas.width),
    y: rand(0, canvas.height),
    vx: rand(-0.15, 0.15),
    vy: rand(-0.15, 0.15),
    r: rand(1, 2.6),
    hue: rand(210, 270),
    baseAlpha: rand(0.25, 0.7),
    phase: rand(0, Math.PI * 2)
  };
}

const PARTICLE_COUNT = 90;
for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(createParticle());

window.addEventListener('pointermove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener('pointerleave', () => {
  mouse.x = -9999;
  mouse.y = -9999;
});

// click anywhere spawns a little burst of particles for extra interactivity
window.addEventListener('pointerdown', e => {
  for (let i = 0; i < 10; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(0.6, 2.2);
    bursts.push({
      x: e.clientX,
      y: e.clientY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: rand(1.5, 3),
      life: 1,
      hue: rand(210, 280)
    });
  }
});

let t = 0;
function animateParticles() {
  t += 0.016;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // connecting lines between nearby particles
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], b = particles[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 110) {
        ctx.strokeStyle = `hsla(230,90%,70%,${0.12 * (1 - dist / 110)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  particles.forEach(p => {
    // gentle repulsion from cursor
    const dx = p.x - mouse.x, dy = p.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 130) {
      const force = (130 - dist) / 130;
      p.vx += (dx / dist) * force * 0.04;
      p.vy += (dy / dist) * force * 0.04;
    }

    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;
    p.vy *= 0.98;

    if (p.x < -10) p.x = canvas.width + 10;
    if (p.x > canvas.width + 10) p.x = -10;
    if (p.y < -10) p.y = canvas.height + 10;
    if (p.y > canvas.height + 10) p.y = -10;

    const twinkle = Math.sin(t * 1.4 + p.phase) * 0.25;
    const alpha = Math.max(0, Math.min(1, p.baseAlpha + twinkle));

    ctx.beginPath();
    ctx.fillStyle = `hsla(${p.hue},90%,70%,${alpha})`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = `hsla(${p.hue},90%,65%,${alpha})`;
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;

  bursts.forEach(b => {
    b.x += b.vx;
    b.y += b.vy;
    b.life -= 0.02;
    ctx.beginPath();
    ctx.fillStyle = `hsla(${b.hue},95%,70%,${Math.max(b.life, 0)})`;
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });
  bursts = bursts.filter(b => b.life > 0);

  requestAnimationFrame(animateParticles);
}
animateParticles();

/* =========================================================
   Chat logic
========================================================= */
const BACKEND_URL = 'https://YOUR-BACKEND.onrender.com/api/chat';
const messagesEl = document.getElementById('messages');
const input = document.getElementById('user-input');
const hero = document.getElementById('hero');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const voiceToggle = document.getElementById('voiceToggle');

let history = [];
let voiceEnabled = true;

function addMessage(role, text) {
  hero.style.display = 'none';
  const el = document.createElement('div');
  el.className = 'message ' + role;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

function addThinkingBubble() {
  hero.style.display = 'none';
  const el = document.createElement('div');
  el.className = 'message bot';
  el.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

function speak(text) {
  if (!voiceEnabled) return;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.onstart = () => voiceToggle.classList.add('speaking');
  utter.onend = () => voiceToggle.classList.remove('speaking');
  utter.onerror = () => voiceToggle.classList.remove('speaking');
  speechSynthesis.speak(utter);
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  addMessage('user', text);
  input.value = '';
  const thinking = addThinkingBubble();
  try {
    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history })
    });
    const data = await res.json();
    thinking.textContent = data.reply;
    speak(data.reply);
    history.push({ role: 'user', content: text }, { role: 'assistant', content: data.reply });
  } catch (e) {
    thinking.textContent = 'Connection error';
  }
}

sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

voiceToggle.addEventListener('click', () => {
  voiceEnabled = !voiceEnabled;
  voiceToggle.classList.toggle('muted', !voiceEnabled);
  if (!voiceEnabled) {
    speechSynthesis.cancel();
    voiceToggle.classList.remove('speaking');
  }
});

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  const recognition = new SR();
  recognition.onstart = () => micBtn.classList.add('listening');
  recognition.onend = () => micBtn.classList.remove('listening');
  recognition.onerror = () => micBtn.classList.remove('listening');
  recognition.onresult = e => { input.value = e.results[0][0].transcript; };
  micBtn.addEventListener('click', () => recognition.start());
} else {
  micBtn.style.display = 'none';
}

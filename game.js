"use strict";

/*
  pling · plong — two people, one keyboard, one Court.
  Everything runs in abstract Court units, so the same game is drawn at whatever
  size the window allows (see docs/adr/0001 for why we draw to a Canvas at all).
*/

// ── Tuning: the only numbers that decide how hard a Rally is to keep alive ──
const COURT_W = 800;
const COURT_H = 600;

const PADDLE_W = 14;
const PADDLE_H = 84;
const BALL_R = 8;

const PADDLE_SPEED = 380; // units/s, constant while a key is held
const BALL_START_SPEED = 250; // units/s at a Serve
const BALL_SPEEDUP = 1.07; // +7% per Paddle deflection
const BALL_MAX_SPEED = 520; // ceiling, so a Rally stays chaseable

const MAX_DEFLECT = Math.PI / 3; // 60° off sideways: a Paddle's edge cannot kick the Ball steeper,
//                                   so vx never vanishes and every Rally eventually ends
const SERVE_ANGLE = Math.PI / 12; // Serves vary by ±15°, so no two openings are identical
const SERVE_FREEZE = 1.2; // seconds the Ball sits at centre between Points

const POINTS_TO_WIN = 7; // odd on purpose: a Match can never end level
const STEP = 1 / 120; // physics tick

const INK = "#ffffff";
const INK_DIM = "rgba(255,255,255,0.55)";
const LEFT_INK = "#cfe8ef";
const RIGHT_INK = "#f2d5a7";
const COURT_BG = "#000000";

// ── State ────────────────────────────────────────────────────────────────
const IDLE = "idle"; // title card, waiting for a Serve key
const FROZEN = "frozen"; // Ball parked at centre, countdown to Serve
const PLAYING = "playing"; // a Rally in flight
const OVER = "over"; // Match finished

let state = IDLE;
let paused = false;
let muted = false;

let score = { left: 0, right: 0 };
let winner = null;

const paddles = {
  left: { y: COURT_H / 2 - PADDLE_H / 2, x: 0 }, // flush against its own edge: no gutter to hide the Ball in
  right: { y: COURT_H / 2 - PADDLE_H / 2, x: COURT_W - PADDLE_W },
};

const ball = { x: COURT_W / 2, y: COURT_H / 2, vx: 0, vy: 0, speed: 0 };

let frozenFor = 0; // seconds left before the Ball is put in play
let serveToward = Math.random() < 0.5 ? -1 : 1; // the opening Serve picks a side at random

const held = new Set();

// ── Canvas ───────────────────────────────────────────────────────────────
const canvas = document.getElementById("court");
const ctx = canvas.getContext("2d");

function text(str, x, y, size, colour, align, weight) {
  ctx.font = `${weight} ${size}px monospace`;
  ctx.fillStyle = colour;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(str, x, y);
}

// ── Sound: synthesised, so nothing is shipped as an asset ────────────────
let audio = null;

function blip(hz, dur, gain) {
  if (muted) return;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    audio = audio || new Ctor();
    const node = audio.createOscillator();
    const volume = audio.createGain();
    node.type = "triangle";
    node.frequency.value = hz;
    volume.gain.value = gain;
    node.connect(volume);
    volume.connect(audio.destination);
    node.start(audio.currentTime);
    node.stop(audio.currentTime + dur);
    volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
  } catch (ignored) {
    /* sound is a nicety: if the browser refuses, play on in silence */
  }
}

// ── Domain actions: a Rally, a Point, a Serve, a Match ───────────────────
function putBallInPlay() {
  ball.x = COURT_W / 2;
  ball.y = COURT_H / 2;
  ball.speed = BALL_START_SPEED;
  const angle = (Math.random() * 2 - 1) * SERVE_ANGLE;
  ball.vx = serveToward * ball.speed * Math.cos(angle);
  ball.vy = ball.speed * Math.sin(angle);
}

function concede(side) {
  // The player who failed to deflect the Ball loses the Rally; the other takes the Point.
  const scorer = side === "left" ? "right" : "left";
  score[scorer] += 1;
  blip(220, 0.16, 0.05);

  if (score[scorer] >= POINTS_TO_WIN) {
    winner = scorer;
    state = OVER;
    return;
  }
  serveToward = side === "left" ? -1 : 1; // the Serve goes back to the player who just lost it
  frozenFor = SERVE_FREEZE;
  state = FROZEN;
}

function deflect(paddle, towardRight) {
  const centre = paddle.y + PADDLE_H / 2;
  const hit = (ball.y - centre) / (PADDLE_H / 2); // where on the Paddle we struck: 0 = flat, ±1 = edge
  const angle = Math.max(-1, Math.min(1, hit)) * MAX_DEFLECT;
  ball.speed = Math.min(ball.speed * BALL_SPEEDUP, BALL_MAX_SPEED);
  const dir = towardRight ? 1 : -1;
  ball.vx = dir * ball.speed * Math.cos(angle);
  ball.vy = ball.speed * Math.sin(angle);
  ball.x = towardRight ? paddle.x + PADDLE_W + BALL_R : paddle.x - BALL_R;
  blip(440 + ball.speed * 0.4, 0.05, 0.04);
}

function resetMatch() {
  score.left = 0;
  score.right = 0;
  winner = null;
  paddles.left.y = paddles.right.y = COURT_H / 2 - PADDLE_H / 2;
  ball.x = COURT_W / 2;
  ball.y = COURT_H / 2;
  ball.vx = ball.vy = 0;
  serveToward = Math.random() < 0.5 ? -1 : 1;
  state = IDLE; // R returns to the title card on purpose: a resting finger must not discard the win card
}

// ── One physics tick ─────────────────────────────────────────────────────
function tick(dt) {
  for (const [side, up, down] of [["left", "KeyW", "KeyS"], ["right", "ArrowUp", "ArrowDown"]]) {
    const drive = (held.has(up) ? -1 : 0) + (held.has(down) ? 1 : 0); // both keys = still, not jitter
    const paddle = paddles[side];
    paddle.y = Math.max(0, Math.min(COURT_H - PADDLE_H, paddle.y + drive * PADDLE_SPEED * dt));
  }

  if (state === FROZEN) {
    frozenFor -= dt;
    if (frozenFor <= 0) {
      putBallInPlay();
      state = PLAYING;
    }
    return;
  }
  if (state !== PLAYING) return;

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.y - BALL_R < 0 && ball.vy < 0) {
    ball.vy = -ball.vy;
    ball.y = BALL_R;
    blip(330, 0.04, 0.03);
  } else if (ball.y + BALL_R > COURT_H && ball.vy > 0) {
    ball.vy = -ball.vy;
    ball.y = COURT_H - BALL_R;
    blip(330, 0.04, 0.03);
  }

  for (const [side, paddle] of [["left", paddles.left], ["right", paddles.right]]) {
    const dx = ball.x - Math.max(paddle.x, Math.min(ball.x, paddle.x + PADDLE_W));
    const dy = ball.y - Math.max(paddle.y, Math.min(ball.y, paddle.y + PADDLE_H));
    if (dx * dx + dy * dy > BALL_R * BALL_R) continue;
    const towardRight = side === "left";
    const approaching = towardRight ? ball.vx < 0 : ball.vx > 0;
    // A Paddle that sweeps onto a slow Ball drives it off: the contact is answered from the face
    // the Ball was heading toward, so the Ball can neither pass through nor stick to a Paddle.
    if (approaching || (towardRight ? ball.x > paddle.x + PADDLE_W : ball.x < paddle.x)) {
      deflect(paddle, towardRight);
      return;
    }
  }

  if (ball.x < -BALL_R) concede("left");
  else if (ball.x > COURT_W + BALL_R) concede("right");
}

// ── Input ────────────────────────────────────────────────────────────────
function press(code) {
  if (state === IDLE) {
    // "any key to Serve" on the title card; Esc stays meaningless until a Rally exists
    if (code !== "Escape") {
      frozenFor = SERVE_FREEZE;
      state = FROZEN;
    }
    return;
  }
  if (code === "Escape" && (state === PLAYING || state === FROZEN)) paused = !paused;
  else if (code === "KeyR") resetMatch(); // mid-Rally too: R never means "resume"
}

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyM") {
    if (!e.repeat) muted = !muted;
  } else if (!e.repeat) {
    press(e.code);
  }
  held.add(e.code); // one-shot actions live here; movement reads the held keys
});
window.addEventListener("keyup", (e) => held.delete(e.code));

// ── Drawing ──────────────────────────────────────────────────────────────
function draw() {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#10131a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scale = Math.min(canvas.width / COURT_W, canvas.height / COURT_H);
  const ox = (canvas.width - COURT_W * scale) / 2;
  const oy = (canvas.height - COURT_H * scale) / 2;
  ctx.setTransform(scale, 0, 0, scale, ox, oy);

  ctx.fillStyle = COURT_BG;
  ctx.fillRect(0, 0, COURT_W, COURT_H);

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.moveTo(COURT_W / 2, 0);
  ctx.lineTo(COURT_W / 2, COURT_H);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = INK;
  for (const paddle of [paddles.left, paddles.right]) {
    ctx.fillRect(paddle.x, paddle.y, PADDLE_W, PADDLE_H);
  }
  if (state === PLAYING || state === FROZEN) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }

  text(`${score.left}`, 26, 40, 46, LEFT_INK, "left", "700");
  text(`${score.right}`, COURT_W - 26, 40, 46, RIGHT_INK, "right", "700");
  text(`first to ${POINTS_TO_WIN}`, COURT_W / 2, COURT_H - 22, 15, "rgba(255,255,255,0.22)", "center", "400");

  if (muted) text("muted", 26, COURT_H - 22, 15, "rgba(255,255,255,0.35)", "left", "400");

  if (state === IDLE) {
    text("pling · plong", COURT_W / 2, COURT_H * 0.24, 58, INK, "center", "300");
    text("Left: W / S        Right: ↑ / ↓", COURT_W / 2, COURT_H * 0.42, 22, INK_DIM, "center", "400");
    text("Esc pause · M mute · R restart", COURT_W / 2, COURT_H * 0.42 + 34, 18, INK_DIM, "center", "400");
    text("any key to serve", COURT_W / 2, COURT_H * 0.68, 26, INK, "center", "700");
  } else if (paused) {
    text("paused", COURT_W / 2, COURT_H * 0.4, 52, INK, "center", "700");
    text("Esc to resume", COURT_W / 2, COURT_H * 0.4 + 40, 20, INK_DIM, "center", "400");
  } else if (state === OVER) {
    const leftWon = winner === "left";
    text(`${leftWon ? "Left" : "Right"} Player wins ${score.left} – ${score.right}`, COURT_W / 2, COURT_H * 0.4, 34, INK, "center", "700");
    text("press R to play again", COURT_W / 2, COURT_H * 0.4 + 44, 22, INK_DIM, "center", "400");
  }
}

let last = performance.now();
let accumulator = 0;

function loop() {
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.1); // a stalled frame must not fast-forward the Rally
  last = now;
  if (!paused) {
    accumulator += dt;
    while (accumulator >= STEP) {
      tick(STEP);
      accumulator -= STEP;
    }
  }
  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

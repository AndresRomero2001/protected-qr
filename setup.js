#!/usr/bin/env node
const crypto = require("crypto");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ── CONFIG ──────────────────────────────────────────────────────────
const ADMIN_CODE = "Chitoadmin1234";
const DEFAULT_USER_CODE = "sorpresa2024";
const DEFAULT_CONTENT =
  "<h2>¡Sorpresa!</h2><p>Este es el contenido protegido. Edítalo desde el panel de administración.</p>";
const PAGE_TITLE = "Contenido Protegido";
const GITHUB_OWNER = "AndresRomero2001";
const GITHUB_REPO = "protected-qr";
// ────────────────────────────────────────────────────────────────────

const ADMIN_HASH = crypto.createHash("sha256").update(ADMIN_CODE).digest("hex");
const GITHUB_API_FILE =
  "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/data.json";
const DEPLOY_URL =
  "https://" + GITHUB_OWNER.toLowerCase() + ".github.io/" + GITHUB_REPO + "/";

// ── Get GitHub token ────────────────────────────────────────────────
let ghToken;
// Accept token as CLI argument, env var, or fall back to gh CLI
if (process.argv[2]) {
  ghToken = process.argv[2];
  console.log("GitHub token provided via argument");
} else if (process.env.GH_TOKEN) {
  ghToken = process.env.GH_TOKEN;
  console.log("GitHub token provided via GH_TOKEN env var");
} else {
  try {
    ghToken = execSync("gh auth token", { encoding: "utf8" }).trim();
    console.log("GitHub token obtained from gh CLI");
  } catch {
    console.error("ERROR: Provide token as argument or run 'gh auth login'.");
    process.exit(1);
  }
}

// ── Encrypt token with admin code (PBKDF2 + AES-256-GCM) ───────────
function encryptToken(token, password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(token, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    salt.toString("hex") + ":" +
    iv.toString("hex") + ":" +
    tag.toString("hex") + ":" +
    encrypted.toString("hex")
  );
}

const encryptedToken = encryptToken(ghToken, ADMIN_CODE);

// ── Write data.json ─────────────────────────────────────────────────
const dataJson = { userCode: DEFAULT_USER_CODE, content: DEFAULT_CONTENT, showCountdown: false, countdownDate: "", countdownText: "" };
fs.writeFileSync(
  path.join(__dirname, "data.json"),
  JSON.stringify(dataJson, null, 2)
);
console.log("data.json created");

// ── HTML template ───────────────────────────────────────────────────
function buildHTML() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${PAGE_TITLE}</title>
<style>
:root {
  --bg1: #0f0c29; --bg2: #302b63; --bg3: #24243e;
  --card: rgba(255,255,255,0.07);
  --border: rgba(255,255,255,0.12);
  --accent: #8b5cf6; --accent-d: #6d28d9;
  --text: #fff; --muted: rgba(255,255,255,0.55);
  --err: #f87171; --ok: #34d399;
}
*{margin:0;padding:0;box-sizing:border-box}
body{
  min-height:100vh;display:flex;align-items:center;justify-content:center;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  background:linear-gradient(135deg,var(--bg1),var(--bg2),var(--bg3));
  color:var(--text);padding:16px;
}
.screen{width:100%;display:flex;align-items:center;justify-content:center}
.card{
  background:var(--card);backdrop-filter:blur(20px);
  border:1px solid var(--border);border-radius:24px;
  padding:40px 32px;max-width:420px;width:100%;text-align:center;
  box-shadow:0 8px 32px rgba(0,0,0,.3);
}
.card.wide{max-width:640px;text-align:left;padding:28px 28px 20px}
.lock{font-size:48px;margin-bottom:12px}
h1{font-size:1.4rem;font-weight:600;margin-bottom:6px}
.sub{color:var(--muted);font-size:.88rem;margin-bottom:28px}
input[type=password],input[type=text]{
  width:100%;padding:14px 18px;border:2px solid rgba(255,255,255,.15);
  border-radius:14px;background:rgba(255,255,255,.06);color:#fff;
  font-size:1.05rem;letter-spacing:2px;text-align:center;outline:none;
  transition:border .3s,box-shadow .3s;margin-bottom:16px;
}
input:focus{border-color:rgba(139,92,246,.8);box-shadow:0 0 0 4px rgba(139,92,246,.15)}
.btn{
  width:100%;padding:14px;border:none;border-radius:14px;
  background:linear-gradient(135deg,var(--accent),var(--accent-d));
  color:#fff;font-size:1rem;font-weight:600;cursor:pointer;
  transition:transform .15s,box-shadow .3s;
}
.btn:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(139,92,246,.4)}
.btn:active{transform:translateY(0)}
.btn-sm{width:auto;padding:10px 20px;font-size:.9rem;border-radius:10px}
.error{color:var(--err);font-size:.85rem;margin-top:8px;min-height:20px}
.shake{animation:shake .4s ease}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
.fade-in{animation:fadeIn .5s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.hidden{display:none!important}

.admin-badge{
  display:inline-block;background:rgba(139,92,246,.2);border:1px solid rgba(139,92,246,.4);
  border-radius:8px;padding:4px 12px;font-size:.8rem;font-weight:600;
  color:var(--accent);margin-bottom:16px;
}
.tabs{display:flex;gap:4px;margin-bottom:20px;flex-wrap:wrap}
.tab{
  padding:8px 16px;border-radius:10px;border:none;background:rgba(255,255,255,.06);
  color:var(--muted);cursor:pointer;font-size:.85rem;font-weight:500;transition:.2s;
}
.tab:hover{background:rgba(255,255,255,.1);color:#fff}
.tab.active{background:rgba(139,92,246,.25);color:var(--accent)}

#content-display{line-height:1.7}
#content-display h2{margin-bottom:10px;font-size:1.3rem}
#content-display p{margin-bottom:10px;color:rgba(255,255,255,.85)}
#content-display a{color:#a78bfa}
#content-display img{max-width:100%;border-radius:12px;margin:8px 0}

.toolbar{
  display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap;
  padding:6px;background:rgba(255,255,255,.05);border-radius:10px;
}
.toolbar button{
  width:36px;height:36px;border:none;border-radius:8px;
  background:rgba(255,255,255,.08);color:#fff;cursor:pointer;
  font-size:.9rem;display:flex;align-items:center;justify-content:center;
  transition:.15s;
}
.toolbar button:hover{background:rgba(139,92,246,.3)}

.richtext{
  min-height:180px;max-height:400px;overflow-y:auto;
  padding:16px;border:2px solid rgba(255,255,255,.1);border-radius:12px;
  background:rgba(255,255,255,.04);outline:none;line-height:1.6;
  font-size:.95rem;color:#fff;
}
.richtext:focus{border-color:rgba(139,92,246,.5)}
.richtext h2{font-size:1.2rem;margin-bottom:8px}
.richtext p{margin-bottom:8px}
.richtext img{max-width:100%;border-radius:12px;margin:8px 0;cursor:pointer}
.richtext img.img-selected{outline:3px solid var(--accent);outline-offset:2px}
input[type=file]{display:none}

.img-resize-popup{
  position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1000;
  background:rgba(30,27,60,.97);border:1px solid rgba(139,92,246,.4);
  border-radius:16px;padding:20px 24px;box-shadow:0 12px 40px rgba(0,0,0,.5);
  min-width:260px;
}
.img-resize-popup h3{font-size:.95rem;margin-bottom:14px;color:#fff}
.img-resize-popup .fields{display:flex;gap:10px;margin-bottom:14px}
.img-resize-popup .fields label{font-size:.8rem;color:var(--muted)}
.img-resize-popup .fields input{
  width:90px;padding:8px 10px;border:2px solid rgba(255,255,255,.15);
  border-radius:10px;background:rgba(255,255,255,.06);color:#fff;
  font-size:.9rem;text-align:center;outline:none;letter-spacing:0;
}
.img-resize-popup .fields input:focus{border-color:rgba(139,92,246,.6)}
.img-resize-popup .btns{display:flex;gap:8px;justify-content:flex-end}
.img-resize-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:999;background:rgba(0,0,0,.4)}

.field{margin-bottom:16px}
.field label{display:block;font-size:.85rem;color:var(--muted);margin-bottom:6px}
.field input{text-align:left;letter-spacing:1px;font-size:.95rem}

.status{font-size:.85rem;margin-top:10px;min-height:20px}
.status.ok{color:var(--ok)}
.status.err{color:var(--err)}

.footer{margin-top:20px;text-align:center;padding-top:16px;border-top:1px solid rgba(255,255,255,.08)}
.link-btn{
  background:none;border:none;color:var(--muted);cursor:pointer;
  font-size:.85rem;text-decoration:underline;
}
.link-btn:hover{color:#fff}

.spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);
  border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:6px}
@keyframes spin{to{transform:rotate(360deg)}}

/* Countdown */
.countdown{text-align:center;padding:20px 0}
.countdown-title{font-size:1.1rem;color:var(--muted);margin-bottom:20px}
.countdown-boxes{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.countdown-box{
  background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.3);
  border-radius:16px;padding:16px 12px;min-width:70px;text-align:center;
}
.countdown-box .num{font-size:2rem;font-weight:700;color:var(--accent);line-height:1}
.countdown-box .label{font-size:.7rem;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:1px}
.countdown-text{margin-top:20px;line-height:1.7;text-align:left}
.countdown-text h2{margin-bottom:10px;font-size:1.3rem}
.countdown-text p{margin-bottom:10px;color:rgba(255,255,255,.85)}
.countdown-text a{color:#a78bfa}
.countdown-text img{max-width:100%;border-radius:12px;margin:8px 0}

/* Toggle switch */
.toggle-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.toggle-row label{font-size:.85rem;color:var(--muted)}
.toggle{position:relative;width:48px;height:26px;cursor:pointer}
.toggle input{opacity:0;width:0;height:0}
.toggle .slider{
  position:absolute;top:0;left:0;right:0;bottom:0;
  background:rgba(255,255,255,.15);border-radius:13px;transition:.3s;
}
.toggle .slider:before{
  content:"";position:absolute;height:20px;width:20px;left:3px;bottom:3px;
  background:#fff;border-radius:50%;transition:.3s;
}
.toggle input:checked+.slider{background:var(--accent)}
.toggle input:checked+.slider:before{transform:translateX(22px)}

input[type=datetime-local]{
  width:100%;padding:12px 14px;border:2px solid rgba(255,255,255,.15);
  border-radius:14px;background:rgba(255,255,255,.06);color:#fff;
  font-size:.95rem;text-align:left;letter-spacing:0;outline:none;
  transition:border .3s,box-shadow .3s;margin-bottom:0;
  color-scheme:dark;
}

@media(max-width:480px){
  .card{padding:28px 20px}
  .card.wide{padding:20px 16px}
  h1{font-size:1.2rem}
}
</style>
</head>
<body>

<!-- GATE -->
<div id="gate" class="screen">
  <div class="card">
    <div class="lock">&#128274;</div>
    <h1>${PAGE_TITLE}</h1>
    <p class="sub">Introduce el código de acceso</p>
    <input type="password" id="code" placeholder="Código" autocomplete="off" autofocus>
    <button class="btn" id="unlock-btn">Desbloquear</button>
    <p class="error" id="error"></p>
  </div>
</div>

<!-- APP -->
<div id="app" class="screen hidden">
  <div class="card wide fade-in">
    <div id="admin-bar" class="hidden">
      <span class="admin-badge">&#128737; Administrador</span>
      <div class="tabs">
        <button class="tab active" data-tab="preview">Vista previa</button>
        <button class="tab" data-tab="edit">Editar contenido</button>
        <button class="tab" data-tab="countdown">Cuenta atrás</button>
        <button class="tab" data-tab="settings">Configuración</button>
      </div>
    </div>

    <div id="panel-preview" class="panel">
      <div id="countdown-display" class="countdown hidden">
        <p class="countdown-title">Cuenta atrás...</p>
        <div class="countdown-boxes">
          <div class="countdown-box"><div class="num" id="cd-days">0</div><div class="label">Días</div></div>
          <div class="countdown-box"><div class="num" id="cd-hours">0</div><div class="label">Horas</div></div>
          <div class="countdown-box"><div class="num" id="cd-mins">0</div><div class="label">Min</div></div>
          <div class="countdown-box"><div class="num" id="cd-secs">0</div><div class="label">Seg</div></div>
        </div>
        <div id="countdown-text-display" class="countdown-text"></div>
      </div>
      <div id="content-display"></div>
    </div>

    <div id="panel-edit" class="panel hidden">
      <div class="toolbar">
        <button onclick="execCmd('bold','editor')" title="Negrita"><b>B</b></button>
        <button onclick="execCmd('italic','editor')" title="Cursiva"><i>I</i></button>
        <button onclick="execCmd('underline','editor')" title="Subrayado"><u>U</u></button>
        <button onclick="addHeading('editor')" title="Título">H</button>
        <button onclick="addLink('editor')" title="Enlace">&#128279;</button>
        <button onclick="addImage('editor')" title="Imagen">&#128247;</button>
      </div>
      <input type="file" id="img-editor" accept="image/*" onchange="insertImage(this,'editor')">
      <div id="editor" class="richtext" contenteditable="true"></div>
      <div style="margin-top:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <button class="btn btn-sm" onclick="saveContent()">Guardar contenido</button>
        <span id="save-status" class="status"></span>
      </div>
    </div>

    <div id="panel-countdown" class="panel hidden">
      <div class="toggle-row">
        <label>Activar cuenta atrás</label>
        <label class="toggle"><input type="checkbox" id="countdown-toggle"><span class="slider"></span></label>
      </div>
      <div id="countdown-settings">
        <div class="field">
          <label>Fecha y hora objetivo (hora de Madrid)</label>
          <input type="datetime-local" id="countdown-date-input">
        </div>
        <div class="field">
          <label>Texto debajo de la cuenta atrás</label>
        </div>
        <div class="toolbar">
          <button onclick="execCmd('bold','cd-editor')" title="Negrita"><b>B</b></button>
          <button onclick="execCmd('italic','cd-editor')" title="Cursiva"><i>I</i></button>
          <button onclick="execCmd('underline','cd-editor')" title="Subrayado"><u>U</u></button>
          <button onclick="addHeading('cd-editor')" title="Título">H</button>
          <button onclick="addLink('cd-editor')" title="Enlace">&#128279;</button>
          <button onclick="addImage('cd-editor')" title="Imagen">&#128247;</button>
        </div>
        <input type="file" id="img-cd-editor" accept="image/*" onchange="insertImage(this,'cd-editor')">
        <div id="cd-editor" class="richtext" contenteditable="true"></div>
      </div>
      <div style="margin-top:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <button class="btn btn-sm" onclick="saveCountdown()">Guardar cuenta atrás</button>
        <span id="cd-save-status" class="status"></span>
      </div>
    </div>

    <div id="panel-settings" class="panel hidden">
      <div class="field">
        <label>Código de acceso para usuarios</label>
        <input type="text" id="user-code-input" placeholder="Código de usuario">
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <button class="btn btn-sm" onclick="saveSettings()">Guardar configuración</button>
        <span id="settings-status" class="status"></span>
      </div>
    </div>

    <div class="footer">
      <button class="link-btn" onclick="logout()">Cerrar sesión</button>
    </div>
  </div>
</div>

<script>
var GITHUB_API = "${GITHUB_API_FILE}";
var ADMIN_HASH = "${ADMIN_HASH}";
var ENC_TOKEN = "${encryptedToken}";

var data = null;
var isAdmin = false;
var ghToken = null;
var fileSha = null;

// ── Crypto helpers ──
function sha256(str) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
    .then(function(buf) {
      return Array.from(new Uint8Array(buf)).map(function(b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
    });
}

function hexToBytes(hex) {
  var bytes = new Uint8Array(hex.length / 2);
  for (var i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function decryptToken(encStr, password) {
  var parts = encStr.split(":");
  var salt = hexToBytes(parts[0]);
  var iv = hexToBytes(parts[1]);
  var tag = hexToBytes(parts[2]);
  var ciphertext = hexToBytes(parts[3]);

  return crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]
  ).then(function(keyMaterial) {
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false, ["decrypt"]
    );
  }).then(function(key) {
    var combined = new Uint8Array(ciphertext.length + tag.length);
    combined.set(ciphertext);
    combined.set(tag, ciphertext.length);
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, combined);
  }).then(function(decrypted) {
    return new TextDecoder().decode(decrypted);
  });
}

// ── GitHub API ──
function fetchData() {
  return fetch(GITHUB_API, {
    headers: { "Accept": "application/vnd.github.v3+json" }
  }).then(function(r) { return r.json(); })
    .then(function(json) {
      fileSha = json.sha;
      // If file > 1MB, content is null — use blob API
      if (!json.content && json.git_url) {
        return fetch(json.git_url, {
          headers: { "Accept": "application/vnd.github.v3+json" }
        }).then(function(r2) { return r2.json(); })
          .then(function(blob) {
            var raw = atob(blob.content.replace(/\\n/g, ""));
            var decoded = decodeURIComponent(escape(raw));
            return JSON.parse(decoded);
          });
      }
      var raw = atob(json.content);
      var decoded = decodeURIComponent(escape(raw));
      return JSON.parse(decoded);
    });
}

function saveData(obj) {
  var content = JSON.stringify(obj, null, 2);
  var encoded = btoa(unescape(encodeURIComponent(content)));
  return fetch(GITHUB_API, {
    method: "PUT",
    headers: {
      "Authorization": "token " + ghToken,
      "Accept": "application/vnd.github.v3+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "update content",
      content: encoded,
      sha: fileSha
    })
  }).then(function(r) { return r.json(); })
    .then(function(result) {
      if (result.content && result.content.sha) {
        fileSha = result.content.sha;
      }
      return result;
    });
}

// ── Unlock ──
function unlock() {
  var code = document.getElementById("code").value;
  if (!code) return;
  var errEl = document.getElementById("error");
  var btn = document.getElementById("unlock-btn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Verificando...';

  sha256(code).then(function(hash) {
    if (hash === ADMIN_HASH) {
      isAdmin = true;
      return decryptToken(ENC_TOKEN, code).then(function(token) {
        ghToken = token;
        return fetchData();
      }).then(function(d) {
        data = d;
        showApp();
      });
    }

    return fetchData().then(function(d) {
      data = d;
      if (code === data.userCode) {
        showApp();
      } else {
        errEl.textContent = "Código incorrecto";
        errEl.classList.add("shake");
        document.getElementById("code").value = "";
        setTimeout(function() { errEl.classList.remove("shake"); }, 500);
        setTimeout(function() { errEl.textContent = ""; }, 2500);
      }
    });
  }).catch(function(e) {
    console.error(e);
    var msg = "Error de conexión. Inténtalo de nuevo.";
    if (e && e.message && e.message.indexOf("decrypt") !== -1) msg = "Código de administrador incorrecto.";
    if (e && e.message && e.message.indexOf("NetworkError") !== -1) msg = "Sin conexión a internet.";
    errEl.textContent = msg;
    setTimeout(function() { errEl.textContent = ""; }, 4000);
  }).finally(function() {
    btn.disabled = false;
    btn.textContent = "Desbloquear";
  });
}

// ── Timezone helpers (always use Europe/Madrid) ──
function madridToUTC(localStr) {
  // localStr is "2026-03-24T09:00" — interpret as Madrid time
  var utcGuess = new Date(localStr + "Z"); // treat as UTC first
  var madridAtUTC = new Date(utcGuess.toLocaleString("en-US", {timeZone: "Europe/Madrid"}));
  var offset = madridAtUTC.getTime() - utcGuess.getTime();
  return new Date(utcGuess.getTime() - offset);
}
function utcToMadridInput(isoStr) {
  // Convert UTC ISO string to "YYYY-MM-DDTHH:MM" in Madrid time for datetime-local input
  if (!isoStr) return "";
  var d = new Date(isoStr);
  var parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(d);
  var o = {};
  parts.forEach(function(p) { o[p.type] = p.value; });
  return o.year + "-" + o.month + "-" + o.day + "T" + o.hour + ":" + o.minute;
}

// ── Countdown ──
var countdownInterval = null;

function updateCountdownDisplay() {
  var target = data.countdownDate ? new Date(data.countdownDate).getTime() : 0;
  var now = Date.now();
  var diff = target - now;
  if (diff <= 0) {
    // Countdown finished — show content
    document.getElementById("countdown-display").classList.add("hidden");
    document.getElementById("content-display").classList.remove("hidden");
    document.getElementById("content-display").innerHTML = data.content || "";
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
    return;
  }
  var d = Math.floor(diff / 86400000);
  var h = Math.floor((diff % 86400000) / 3600000);
  var m = Math.floor((diff % 3600000) / 60000);
  var s = Math.floor((diff % 60000) / 1000);
  document.getElementById("cd-days").textContent = d;
  document.getElementById("cd-hours").textContent = h;
  document.getElementById("cd-mins").textContent = m;
  document.getElementById("cd-secs").textContent = s;
}

function renderPreview() {
  var showCD = data.showCountdown && data.countdownDate && new Date(data.countdownDate).getTime() > Date.now();
  if (showCD) {
    document.getElementById("countdown-display").classList.remove("hidden");
    document.getElementById("content-display").classList.add("hidden");
    document.getElementById("countdown-text-display").innerHTML = data.countdownText || "";
    updateCountdownDisplay();
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdownDisplay, 1000);
  } else {
    document.getElementById("countdown-display").classList.add("hidden");
    document.getElementById("content-display").classList.remove("hidden");
    document.getElementById("content-display").innerHTML = data.content || "";
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  }
}

// ── Show app ──
function showApp() {
  document.getElementById("gate").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  renderPreview();
  if (isAdmin) {
    document.getElementById("admin-bar").classList.remove("hidden");
    document.getElementById("editor").innerHTML = data.content || "";
    document.getElementById("user-code-input").value = data.userCode || "";
    // Countdown settings
    var toggle = document.getElementById("countdown-toggle");
    toggle.checked = !!data.showCountdown;
    document.getElementById("countdown-date-input").value = utcToMadridInput(data.countdownDate);
    document.getElementById("cd-editor").innerHTML = data.countdownText || "";
  }
}

// ── Tabs ──
document.addEventListener("click", function(e) {
  if (!e.target.classList.contains("tab")) return;
  var tabName = e.target.getAttribute("data-tab");
  document.querySelectorAll(".tab").forEach(function(t) { t.classList.remove("active"); });
  e.target.classList.add("active");
  document.querySelectorAll(".panel").forEach(function(p) { p.classList.add("hidden"); });
  var panel = document.getElementById("panel-" + tabName);
  if (panel) panel.classList.remove("hidden");
  if (tabName === "edit") document.getElementById("editor").innerHTML = data.content || "";
  if (tabName === "countdown") document.getElementById("cd-editor").innerHTML = data.countdownText || "";
  if (tabName === "preview") renderPreview();
});

// ── Editor ──
var activeEditor = "editor";
function focusEditor(id) { activeEditor = id; document.getElementById(id).focus(); }
function execCmd(cmd, id) { focusEditor(id); document.execCommand(cmd, false, null); }
function addHeading(id) { focusEditor(id); document.execCommand("formatBlock", false, "h2"); }
function addLink(id) { var url = prompt("URL del enlace:"); if (url) { focusEditor(id); document.execCommand("createLink", false, url); } }
function addImage(id) { activeEditor = id; document.getElementById("img-" + id).click(); }
function compressImage(file, maxW, quality, cb) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var w = img.width, h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      var canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function insertImage(input, id) {
  if (!input.files || !input.files[0]) return;
  compressImage(input.files[0], 800, 0.7, function(dataUrl) {
    document.getElementById(id).focus();
    document.execCommand("insertImage", false, dataUrl);
  });
  input.value = "";
}

// ── Image resize ──
var selectedImg = null;
function closeImgPopup() {
  var ov = document.querySelector(".img-resize-overlay");
  var pp = document.querySelector(".img-resize-popup");
  if (ov) ov.remove();
  if (pp) pp.remove();
  if (selectedImg) { selectedImg.classList.remove("img-selected"); selectedImg = null; }
}
function openImgResize(img) {
  closeImgPopup();
  selectedImg = img;
  img.classList.add("img-selected");
  var natW = img.naturalWidth || img.width;
  var natH = img.naturalHeight || img.height;
  var curW = img.width;
  var curH = img.height;
  var ratio = natW / natH;

  var ov = document.createElement("div");
  ov.className = "img-resize-overlay";
  ov.onclick = closeImgPopup;
  document.body.appendChild(ov);

  var pp = document.createElement("div");
  pp.className = "img-resize-popup";
  pp.innerHTML = '<h3>Tamaño de imagen</h3>'
    + '<div class="fields">'
    + '<div><label>Ancho (px)</label><br><input type="number" id="img-w" value="' + curW + '" min="10"></div>'
    + '<div><label>Alto (px)</label><br><input type="number" id="img-h" value="' + curH + '" min="10"></div>'
    + '</div>'
    + '<div class="btns">'
    + '<button class="btn btn-sm" style="background:rgba(255,255,255,.1)" onclick="closeImgPopup()">Cancelar</button>'
    + '<button class="btn btn-sm" onclick="applyImgSize()">Aplicar</button>'
    + '</div>';
  document.body.appendChild(pp);

  var wIn = document.getElementById("img-w");
  var hIn = document.getElementById("img-h");
  wIn.oninput = function() { hIn.value = Math.round(parseInt(wIn.value) / ratio) || ""; };
  hIn.oninput = function() { wIn.value = Math.round(parseInt(hIn.value) * ratio) || ""; };
}
function applyImgSize() {
  if (!selectedImg) return;
  var w = parseInt(document.getElementById("img-w").value);
  var h = parseInt(document.getElementById("img-h").value);
  if (w > 0) selectedImg.style.width = w + "px";
  if (h > 0) selectedImg.style.height = h + "px";
  selectedImg.removeAttribute("width");
  selectedImg.removeAttribute("height");
  closeImgPopup();
}
document.addEventListener("click", function(e) {
  if (e.target.tagName === "IMG" && e.target.closest(".richtext")) {
    e.preventDefault();
    openImgResize(e.target);
  }
});

// ── Save content ──
function saveContent() {
  var statusEl = document.getElementById("save-status");
  statusEl.className = "status";
  statusEl.innerHTML = '<span class="spinner"></span>Guardando...';
  data.content = document.getElementById("editor").innerHTML;
  saveData(data).then(function(r) {
    if (r.content) {
      statusEl.className = "status ok";
      statusEl.textContent = "Guardado correctamente";
      document.getElementById("content-display").innerHTML = data.content;
    } else {
      statusEl.className = "status err";
      statusEl.textContent = "Error: " + (r.message || "desconocido");
    }
    setTimeout(function() { statusEl.textContent = ""; }, 3000);
  }).catch(function() {
    statusEl.className = "status err";
    statusEl.textContent = "Error de conexión";
    setTimeout(function() { statusEl.textContent = ""; }, 3000);
  });
}

// ── Save countdown ──
function saveCountdown() {
  var statusEl = document.getElementById("cd-save-status");
  statusEl.className = "status";
  statusEl.innerHTML = '<span class="spinner"></span>Guardando...';
  data.showCountdown = document.getElementById("countdown-toggle").checked;
  var cdVal = document.getElementById("countdown-date-input").value;
  data.countdownDate = cdVal ? madridToUTC(cdVal).toISOString() : "";
  data.countdownText = document.getElementById("cd-editor").innerHTML;
  saveData(data).then(function(r) {
    if (r.content) {
      statusEl.className = "status ok";
      statusEl.textContent = "Guardado correctamente";
    } else {
      statusEl.className = "status err";
      statusEl.textContent = "Error: " + (r.message || "desconocido");
    }
    setTimeout(function() { statusEl.textContent = ""; }, 3000);
  }).catch(function() {
    statusEl.className = "status err";
    statusEl.textContent = "Error de conexión";
    setTimeout(function() { statusEl.textContent = ""; }, 3000);
  });
}

// ── Save settings ──
function saveSettings() {
  var statusEl = document.getElementById("settings-status");
  var newCode = document.getElementById("user-code-input").value.trim();
  if (!newCode) {
    statusEl.className = "status err";
    statusEl.textContent = "El código no puede estar vacío";
    setTimeout(function() { statusEl.textContent = ""; }, 2500);
    return;
  }
  statusEl.className = "status";
  statusEl.innerHTML = '<span class="spinner"></span>Guardando...';
  data.userCode = newCode;
  saveData(data).then(function(r) {
    if (r.content) {
      statusEl.className = "status ok";
      statusEl.textContent = "Guardado correctamente";
    } else {
      statusEl.className = "status err";
      statusEl.textContent = "Error: " + (r.message || "desconocido");
    }
    setTimeout(function() { statusEl.textContent = ""; }, 3000);
  }).catch(function() {
    statusEl.className = "status err";
    statusEl.textContent = "Error de conexión";
    setTimeout(function() { statusEl.textContent = ""; }, 3000);
  });
}

// ── Logout ──
function logout() {
  data = null; isAdmin = false; ghToken = null; fileSha = null;
  document.getElementById("code").value = "";
  document.getElementById("app").classList.add("hidden");
  document.getElementById("gate").classList.remove("hidden");
  document.getElementById("admin-bar").classList.add("hidden");
  document.querySelectorAll(".panel").forEach(function(p, i) {
    if (i === 0) p.classList.remove("hidden"); else p.classList.add("hidden");
  });
  document.querySelectorAll(".tab").forEach(function(t, i) {
    t.classList.toggle("active", i === 0);
  });
}

// ── Events ──
document.getElementById("code").addEventListener("keydown", function(e) {
  if (e.key === "Enter") unlock();
});
document.getElementById("unlock-btn").addEventListener("click", unlock);
</script>
</body>
</html>`;
}

// ── Main ────────────────────────────────────────────────────────────
function main() {
  const html = buildHTML();
  fs.writeFileSync(path.join(__dirname, "index.html"), html);
  console.log("index.html generated!");
  console.log('Admin code: "' + ADMIN_CODE + '"');
  console.log('Default user code: "' + DEFAULT_USER_CODE + '"');
  console.log("Deploy URL will be: " + DEPLOY_URL);
}

main();

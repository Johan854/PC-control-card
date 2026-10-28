{ // bloc isolé : aucune variable ne fuit vers les autres cartes
/*
 * PC Control Card (FR)
 * Carte Home Assistant pour piloter vos PC : image de PC, état allumé/éteint, fenêtre active,
 * démarrage (Wake-on-LAN) et extinction. Plusieurs PC, style verre, thème clair/sombre, éditeur visuel.
 */

const CARD_VERSION = "1.1.0";

/* === NUANCE COMMUNE v2 (cartes Johan854) ===
 * Bloc identique dans toutes les cartes. Options : nuance, nuance_perso, intensite.
 * nuance "theme" (par défaut) : suit la variable carte-nuance du thème Home Assistant ;
 * si elle n'existe pas, la carte garde ses couleurs d'origine. Intensité : 0 = neutre, 1 = normal, 2 = très coloré. */
const GV_NUANCES = [["braise", "Braise (rouge)", "#e0524f"], ["ocean", "Océan (bleu)", "#2f8fd8"], ["lagon", "Lagon (turquoise)", "#1fb5a8"], ["foret", "Forêt (vert)", "#3fae5a"], ["lavande", "Lavande (violet)", "#8a63d8"], ["framboise", "Framboise (rose)", "#e05597"], ["ambre", "Ambre (orange)", "#e8902c"], ["ardoise", "Ardoise (neutre)", "#7d8595"]];
const GV_DEFAULTS = { nuance: "theme", intensite: 1 };
const gvAccent = (c) => {
  const p = c && c.nuance_perso;
  if (c && c.nuance === "perso") {
    if (Array.isArray(p) && p.length === 3) return "#" + p.map((v) => Math.max(0, Math.min(255, Math.round(+v || 0))).toString(16).padStart(2, "0")).join("");
    if (typeof p === "string" && /^#?[0-9a-f]{6}$/i.test(p.trim())) return "#" + p.trim().replace("#", "");
  }
  const n = GV_NUANCES.find((x) => x[0] === (c && c.nuance));
  return n ? n[2] : "var(--carte-nuance)";
};
/* Variables posées sur <ha-card> : --g-bg-x (fond dégradé teinté) et --acc-ui-x (couleur d'accent).
 * Sans nuance (thème sans carte-nuance), elles sont invalides : chaque carte retombe alors sur ses couleurs d'origine. */
const gvStyle = (c, dark) => {
  const i = Number(c && c.intensite), ai = Number.isFinite(i) ? Math.max(0, Math.min(2, i)) : 1;
  const m = (pct, base) => `color-mix(in srgb,var(--acc-ui) ${+(pct * ai).toFixed(1)}%,${base})`;
  const bg = dark ? `linear-gradient(160deg,${m(5, "#1b1e32")} 0%,${m(11, "#1f1b2c")} 55%,${m(22, "#1c1620")} 100%)`
    : `linear-gradient(160deg,${m(2, "#f8f9fd")} 0%,${m(5, "#eef1f8")} 55%,${m(11, "#f8f8fa")} 100%)`;
  return `--acc-ui:${gvAccent(c)};--g-bg-x:${bg};--acc-ui-x:color-mix(in srgb,var(--acc-ui) ${dark ? "80%,#fff" : "82%,#000"})`;
};
const GV_FIELDS = [
  { name: "nuance", selector: { select: { mode: "dropdown", options: [{ value: "theme", label: "Selon le thème (couleurs d'origine)" }, ...GV_NUANCES.map((n) => ({ value: n[0], label: n[1] })), { value: "perso", label: "Personnalisée" }] } } },
  { name: "nuance_perso", selector: { color_rgb: {} } },
  { name: "intensite", selector: { number: { min: 0, max: 2, step: 0.1, mode: "slider" } } }];
const GV_LABELS = { nuance: "Nuance de couleur", nuance_perso: "Couleur personnalisée (nuance « Personnalisée »)", intensite: "Intensité de la nuance" };
/* === FIN NUANCE COMMUNE === */

const DEFAULTS = {
  title: "",
  theme: "auto", nuance: "theme", intensite: 1, // auto | light | dark
  columns: 0, // 0 = automatique
  confirm: true,
  pcs: [],
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const bad = (st) => !st || st.state === "unavailable" || st.state === "unknown";
const cut = (t, n) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
let UID = 0;

// Dessin d'un PC (écran + tour). `on` : allumé ; `text` : fenêtre active affichée sur l'écran.
function pcSvg(on, text) {
  return `
<svg viewBox="0 0 200 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="150" y="22" width="34" height="92" rx="5" fill="var(--pc-case)" stroke="var(--pc-line)" stroke-width="1.4"/>
  <rect x="156" y="30" width="22" height="3" rx="1.5" fill="var(--pc-line)" opacity=".7"/>
  <rect x="156" y="37" width="22" height="3" rx="1.5" fill="var(--pc-line)" opacity=".7"/>
  <circle cx="167" cy="62" r="7" fill="none" stroke="var(--pc-line)" stroke-width="1.2"/>
  <circle cx="167" cy="62" r="2.2" fill="${on ? "var(--pc-on)" : "var(--pc-line)"}" class="${on ? "led" : ""}"/>
  <rect x="158" y="96" width="18" height="6" rx="2" fill="var(--pc-line)" opacity=".5"/>
  <rect x="10" y="12" width="128" height="82" rx="7" fill="var(--pc-case)" stroke="var(--pc-line)" stroke-width="1.6"/>
  <rect x="17" y="19" width="114" height="68" rx="3" fill="${on ? "var(--pc-screen-on)" : "var(--pc-screen-off)"}"/>
  ${on ? `<rect x="17" y="19" width="114" height="68" rx="3" fill="url(#pcg)" opacity=".35"/>
  <rect x="17" y="19" width="114" height="9" rx="3" fill="#ffffff" opacity=".12"/>
  <circle cx="23" cy="23.5" r="1.4" fill="#ff6b6b"/><circle cx="28" cy="23.5" r="1.4" fill="#ffd166"/><circle cx="33" cy="23.5" r="1.4" fill="#6bd67a"/>
  <text x="74" y="60" text-anchor="middle" class="scr">${esc(cut(text || "En ligne", 20))}</text>` : `<text x="74" y="57" text-anchor="middle" class="scro">⏻</text>`}
  <path d="M64 94 L60 110 H88 L84 94Z" fill="var(--pc-case)" stroke="var(--pc-line)" stroke-width="1.2"/>
  <rect x="48" y="110" width="52" height="5" rx="2.5" fill="var(--pc-case)" stroke="var(--pc-line)" stroke-width="1.2"/>
  <defs><linearGradient id="pcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7aa7ff"/><stop offset="1" stop-color="#b57aff"/></linearGradient></defs>
</svg>`;
}

class PcControlCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("pc-control-card-editor");
  }

  static getStubConfig() {
    return { ...DEFAULTS, title: "Mes PC", pcs: [{ name: "PC", window_entity: "", shutdown_entity: "", wake_entity: "" }] };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._sig = "";
  }

  setConfig(config) {
    if (!config) throw new Error("Configuration invalide");
    this._config = { ...DEFAULTS, ...config };
    if (!Array.isArray(this._config.pcs)) this._config.pcs = [];
    this._sig = "";
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    const sig = this._config.pcs.map((p) =>
      [p.window_entity, p.shutdown_entity, p.wake_entity, p.state_entity].map((e) => {
        const s = e && hass.states[e];
        return s ? s.state : "x";
      }).join("|")
    ).join(";") + "#" + (this._isDark() ? "d" : "l");
    if (sig !== this._sig) {
      this._sig = sig;
      this._render();
    }
  }

  getCardSize() { return 2 + this._config.pcs.length * 2; }

  _isDark() {
    const t = this._config && this._config.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    const dm = this._hass && this._hass.themes && this._hass.themes.darkMode;
    if (typeof dm === "boolean") return dm;
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  _more(id) {
    if (id) this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: id } }));
  }

  // Allumé : entité d'état si fournie (on/home/connected…), sinon l'extinction est disponible => PC allumé.
  _isOn(p) {
    const h = this._hass;
    if (p.state_entity) {
      const s = h.states[p.state_entity];
      if (bad(s)) return false;
      return ["on", "home", "connected", "online", "playing"].includes(String(s.state).toLowerCase());
    }
    if (p.shutdown_entity) return !bad(h.states[p.shutdown_entity]);
    if (p.window_entity) return !bad(h.states[p.window_entity]);
    return false;
  }

  _press(eid) {
    const domain = eid.split(".")[0];
    const svc = domain === "button" || domain === "input_button" ? "press" : domain === "script" ? "turn_on" : "turn_on";
    this._hass.callService(domain, svc, { entity_id: eid });
  }

  _render() {
    const c = this._config, h = this._hass;
    if (!c || !h) return;
    const dark = this._isDark();
    const cols = Number(c.columns) > 0 ? Number(c.columns) : 0;

    const cards = c.pcs.map((p, i) => {
      const on = this._isOn(p);
      const ws = p.window_entity ? h.states[p.window_entity] : null;
      const win = !bad(ws) ? String(ws.state) : "";
      const name = p.name || `PC ${i + 1}`;
      const photo = p.picture && !/^\s*(javascript|vbscript|data:text)/i.test(String(p.picture));
      const art = photo ? `<img class="photo ${on ? "" : "offimg"}" src="${esc(p.picture)}" alt="${esc(name)}">` : pcSvg(on, win);
      const ww = p.wake_entity && h.states[p.wake_entity]; const canWake = !!ww && ww.state !== "unavailable";
      const canOff = p.shutdown_entity && on;
      return `
      <div class="pc ${on ? "on" : "off"}" data-i="${i}">
        <div class="top"><b>${esc(name)}</b><span class="st"><i></i>${on ? "Allumé" : "Éteint"}</span></div>
        <div class="art">${art}</div>
        <div class="win" title="${esc(win)}">${on ? (win ? "<small>Fenêtre active</small>" + esc(win) : "<small>Fenêtre active</small>—") : "<small>Hors tension</small>"}</div>
        <div class="btns">
          ${p.wake_entity ? `<button class="b wake" data-wake="${i}" ${canWake && !on ? "" : "disabled"}><ha-icon icon="mdi:power"></ha-icon>Démarrer</button>` : ""}
          ${p.shutdown_entity ? `<button class="b stop" data-stop="${i}" ${canOff ? "" : "disabled"}><ha-icon icon="mdi:power-off"></ha-icon>Éteindre</button>` : ""}
        </div>
      </div>`;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        ha-card.dark {
          --pc-text:#f4f6fb; --pc-muted:#a9afc0; --pc-bg:var(--g-bg-x,linear-gradient(160deg,#1b1e32 0%,#241a2a 55%,#2d1519 100%));
          --pc-border:rgba(255,255,255,.14); --pc-shadow:0 .6em 2em rgba(0,0,0,.35);
          --pc-glass:rgba(255,255,255,.07); --pc-glass-b:rgba(255,255,255,.13); --pc-fill:rgba(255,255,255,.09); --pc-fill-b:rgba(255,255,255,.16);
          --pc-on:#3ddc84; --pc-err:#ff5a5f; --pc-off:#8a8f9c; --pc-case:#2c3140; --pc-line:#6f7788; --pc-screen-on:#12162a; --pc-screen-off:#0b0d14;
        }
        ha-card.light {
          --pc-text:#1c2030; --pc-muted:#5d6477; --pc-bg:var(--g-bg-x,linear-gradient(160deg,#f8f9fd 0%,#eef1f8 55%,#f8eff0 100%));
          --pc-border:rgba(20,24,40,.12); --pc-shadow:0 .4em 1.4em rgba(20,24,40,.12);
          --pc-glass:rgba(255,255,255,.7); --pc-glass-b:rgba(20,24,40,.1); --pc-fill:rgba(20,24,40,.06); --pc-fill-b:rgba(20,24,40,.14);
          --pc-on:#1a9d55; --pc-err:#d32f35; --pc-off:#8a8f9c; --pc-case:#e3e7f0; --pc-line:#8d95a8; --pc-screen-on:#1d2440; --pc-screen-off:#c9cedb;
        }
        ha-card { display:flex; flex-direction:column; gap:12px; padding:16px; overflow:hidden; color:var(--pc-text);
          border-radius:24px; border:1px solid var(--pc-border); background:var(--pc-bg); box-shadow:var(--pc-shadow); }
        ha-icon { --mdc-icon-size:1.2em; flex:none; }
        button { font:inherit; color:inherit; cursor:pointer; border:0; background:none; padding:0; -webkit-tap-highlight-color:transparent; }
        h2 { margin:0; font-size:1.1em; font-weight:650; }
        .grid { display:grid; gap:12px; grid-template-columns:${cols ? `repeat(${cols},minmax(0,1fr))` : "repeat(auto-fit,minmax(14em,1fr))"}; }
        .pc { display:flex; flex-direction:column; gap:10px; padding:14px; border-radius:18px; background:var(--pc-glass); border:1px solid var(--pc-glass-b);
          -webkit-backdrop-filter:blur(18px) saturate(140%); backdrop-filter:blur(18px) saturate(140%); min-width:0; }
        .pc.on { box-shadow:inset 0 0 2.4em color-mix(in srgb, var(--pc-on) 14%, transparent); }
        .top { display:flex; justify-content:space-between; align-items:center; gap:8px; }
        .top b { font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .st { display:flex; align-items:center; gap:.4em; font-size:.78em; font-weight:600; color:var(--pc-off); }
        .st i { width:.6em; height:.6em; border-radius:50%; background:currentColor; box-shadow:0 0 .5em currentColor; }
        .pc.on .st { color:var(--pc-on); }
        .art { display:flex; justify-content:center; }
        .art svg { width:100%; max-width:230px; height:auto; }
        .art .photo { max-width:100%; max-height:150px; object-fit:contain; border-radius:12px; }
        .art .offimg { filter:grayscale(1) brightness(.6); }
        .scr { font-size:7.5px; font-weight:600; fill:#e8ecff; font-family:inherit; } .scro { font-size:22px; fill:var(--pc-line); opacity:.6; }
        .win { font-size:.88em; font-weight:600; min-height:2.6em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .win small { display:block; font-size:.78em; font-weight:500; color:var(--pc-muted); text-transform:uppercase; letter-spacing:.06em; }
        .btns { display:flex; gap:.5em; }
        .b { flex:1; display:flex; align-items:center; justify-content:center; gap:.4em; padding:.6em .4em; border-radius:1em; font-size:.85em; font-weight:650;
          background:var(--pc-fill); border:1px solid var(--pc-fill-b); }
        .b.wake { color:var(--pc-on); } .b.stop { color:var(--pc-err); }
        .b:disabled { opacity:.35; cursor:default; }
        .b:not(:disabled):active { background:var(--pc-fill-b); }
        .led { animation:pc-led 1.8s ease-in-out infinite; } @keyframes pc-led { 50% { opacity:.35; } }
        .empty { color:var(--pc-muted); font-size:.9em; }
        @media (prefers-reduced-motion: reduce) { .led { animation:none; } }
      </style>
      <ha-card class="${dark ? "dark" : "light"}" style="${gvStyle(this._config, dark)}">
        ${c.title ? `<h2>${esc(c.title)}</h2>` : ""}
        ${cards ? `<div class="grid">${cards}</div>` : `<div class="empty">Ajoutez un PC dans l'éditeur de la carte.</div>`}
      </ha-card>`;

    const root = this.shadowRoot;
    root.querySelectorAll("[data-wake]").forEach((el) => el.addEventListener("click", () => {
      const p = c.pcs[Number(el.dataset.wake)];
      if (p && p.wake_entity) this._press(p.wake_entity);
    }));
    root.querySelectorAll("[data-stop]").forEach((el) => el.addEventListener("click", () => {
      const p = c.pcs[Number(el.dataset.stop)];
      if (!p || !p.shutdown_entity) return;
      if (c.confirm && !window.confirm(`Éteindre ${p.name || "le PC"} ?`)) return;
      this._press(p.shutdown_entity);
    }));
    root.querySelectorAll(".win").forEach((el) => el.addEventListener("click", () => {
      const p = c.pcs[Number(el.closest(".pc").dataset.i)];
      this._more(p && (p.window_entity || p.shutdown_entity));
    }));
  }
}

/* ---------- Éditeur visuel ---------- */
const LABELS = { ...GV_LABELS,
  title: "Titre (facultatif)", theme: "Thème", columns: "Colonnes (0 = automatique)", confirm: "Confirmer avant d'éteindre",
  name: "Nom du PC", picture: "Photo du PC (facultatif, ex. /local/pc.png)", window_entity: "Fenêtre active (capteur)",
  shutdown_entity: "Extinction (switch)", wake_entity: "Démarrage Wake-on-LAN (bouton)", state_entity: "État allumé/éteint (facultatif : ping, binary_sensor)",
};
const PC_SCHEMA = [
  { name: "name", selector: { text: {} } },
  { name: "window_entity", selector: { entity: { domain: "sensor" } } },
  { name: "shutdown_entity", selector: { entity: { domain: ["switch", "button", "script"] } } },
  { name: "wake_entity", selector: { entity: { domain: ["button", "switch", "script"] } } },
  { name: "state_entity", selector: { entity: { domain: ["binary_sensor", "device_tracker", "sensor"] } } },
  { name: "picture", selector: { text: {} } },
];

class PcControlCardEditor extends HTMLElement {
  setConfig(config) {
    const next = { ...DEFAULTS, ...config, pcs: (config.pcs || []).map((p) => ({ ...p })) };
    const same = this._config && this._built && next.pcs.length === this._config.pcs.length;
    this._config = next;
    if (!same) return this._build();
    // Même structure : on met simplement à jour les données (évite de perdre le focus pendant la saisie)
    const forms = this.querySelectorAll("ha-form");
    forms.forEach((f, i) => { f.data = i === 0 ? this._config : this._config.pcs[i - 1]; });
  }

  set hass(hass) {
    this._hass = hass;
    this.querySelectorAll("ha-form").forEach((f) => (f.hass = hass));
  }

  _emit() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  _build() {
    this._built = true;
    this.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = `.pcb{border:1px solid var(--divider-color);border-radius:12px;padding:10px;margin:12px 0}
      .pcb .h{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-weight:600}
      .pcb button,.add{cursor:pointer;border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);border-radius:8px;padding:6px 10px}
      .add{width:100%;margin-top:4px}`;
    this.appendChild(style);

    const main = document.createElement("ha-form");
    main.hass = this._hass;
    main.data = this._config;
    main.computeLabel = (s) => LABELS[s.name] || s.name;
    main.schema = [
      { name: "title", selector: { text: {} } },
      { type: "grid", name: "", schema: [
        { name: "columns", selector: { number: { min: 0, max: 6, mode: "box" } } },
        { name: "theme", selector: { select: { mode: "dropdown", options: [
          { value: "auto", label: "Automatique (thème de Home Assistant)" }, { value: "light", label: "Clair" }, { value: "dark", label: "Sombre" } ] } } }, ...GV_FIELDS,
      ] },
      { name: "confirm", selector: { boolean: {} } },
    ];
    main.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._config = { ...this._config, ...ev.detail.value, pcs: this._config.pcs };
      this._emit();
    });
    this.appendChild(main);

    this._config.pcs.forEach((p, i) => {
      const box = document.createElement("div");
      box.className = "pcb";
      box.innerHTML = `<div class="h"><span>PC ${i + 1}</span><span><button data-up="${i}" title="Monter">↑</button> <button data-down="${i}" title="Descendre">↓</button> <button data-del="${i}" title="Supprimer">✕</button></span></div>`;
      const f = document.createElement("ha-form");
      f.hass = this._hass;
      f.data = p;
      f.computeLabel = (s) => LABELS[s.name] || s.name;
      f.schema = PC_SCHEMA;
      f.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._config.pcs[i] = { ...ev.detail.value };
        this._emit();
      });
      box.appendChild(f);
      this.appendChild(box);
    });

    const add = document.createElement("button");
    add.className = "add";
    add.textContent = "+ Ajouter un PC";
    add.addEventListener("click", () => { this._config.pcs.push({ name: "" }); this._emit(); this._build(); });
    this.appendChild(add);

    this.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => { this._config.pcs.splice(Number(b.dataset.del), 1); this._emit(); this._build(); }));
    this.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", () => this._move(Number(b.dataset.up), -1)));
    this.querySelectorAll("[data-down]").forEach((b) => b.addEventListener("click", () => this._move(Number(b.dataset.down), 1)));
  }

  _move(i, d) {
    const j = i + d, a = this._config.pcs;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    this._emit();
    this._build();
  }
}

customElements.define("pc-control-card", PcControlCard);
customElements.define("pc-control-card-editor", PcControlCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "pc-control-card",
  name: "PC Control Card (FR)",
  description: "Pilotez vos PC : image, état, fenêtre active, démarrage Wake-on-LAN et extinction.",
  preview: true,
});

console.info(
  `%c PC-CONTROL-CARD %c v${CARD_VERSION} `,
  "color:#fff;background:#5b6cff;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px",
  "color:#5b6cff;background:#fff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 4px"
);
}

/* ===== CONFIG ===== */
const CONFIG = {
  fechaEvento: "2026-12-26T00:00:00",          // EDITAR: agregar hora cuando se sepa
  maxPases: 10,                                 // EDITAR: tope de pases (solo Angel y el organizador lo saben)
  audio: { bautizo: "audio/bautizo.mp3", pokemon: "audio/pokemon.mp3" }, // EDITAR
  form: {                                       // EDITAR: Google Forms
    action: "https://docs.google.com/forms/d/e/TU_FORM_ID/formResponse",
    entryNombre: "entry.0000000001",
    entryPases: "entry.0000000002",
    entryAsistira: "entry.0000000003"
  }
};
const $ = s => document.querySelector(s);

/* ===== MÚSICA ===== */
const mus = {
  bautizo: new Audio(CONFIG.audio.bautizo),
  pokemon: new Audio(CONFIG.audio.pokemon)
};
Object.values(mus).forEach(a => {
  a.loop = true;
  a.preload = "auto";
  a.volume = 0;
});

let actual = null, sonando = false, mudo = false, zona = "bautizo";
let audiosDesbloqueados = false;

// Desbloquear TODOS los elementos de audio en el primer gesto del usuario
// Imprescindible para iOS Safari (iPhone) y navegadores con restricciones de autoplay
function desbloquearAudios() {
  if (audiosDesbloqueados) return;
  audiosDesbloqueados = true;
  Object.values(mus).forEach(a => {
    const p = a.play();
    if (p !== undefined) {
      p.then(() => {
        if (a !== mus[actual]) {
          a.pause();
          a.currentTime = 0;
        }
      }).catch(() => {});
    }
  });
}

function fade(a, a2, ms = 900) {
  if (!a) return;
  clearInterval(a._f);

  // En iPhone / iOS Safari, a.volume es de solo lectura (valor fijo 1)
  let soportaVolumen = true;
  try {
    const prev = a.volume;
    a.volume = 0.5;
    if (a.volume === prev && prev === 1) soportaVolumen = false;
  } catch (e) {
    soportaVolumen = false;
  }

  if (!soportaVolumen) {
    // Modo iOS Safari: control mediante play/pause y muted
    if (a2 === 0) {
      a._f = setTimeout(() => { a.pause(); }, ms);
    } else {
      a.muted = mudo;
      a.play().catch(() => {});
    }
    return;
  }

  // Modo Android y Navegadores Web (PC/Mac): desvanecimiento suave de volumen
  const v0 = a.volume, t0 = performance.now();
  a._f = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    a.volume = Math.max(0, Math.min(1, v0 + (a2 - v0) * k));
    if (k >= 1) {
      clearInterval(a._f);
      if (a2 === 0) a.pause();
    }
  }, 50);
}

function cambiar(n) {
  if (!sonando || n === actual) return;
  if (actual && mus[actual]) fade(mus[actual], 0);
  actual = n;
  if (mudo) return;
  const nuevo = mus[n];
  if (nuevo) {
    nuevo.muted = false;
    nuevo.play().then(() => {
      fade(nuevo, 1);
    }).catch(() => {});
  }
}

document.addEventListener("visibilitychange", () => {   // pausa al bloquear o minimizar
  if (!sonando || !actual) return;
  const a = mus[actual];
  if (document.hidden) {
    a.pause();
  } else if (!mudo) {
    a.play().catch(() => {});
    fade(a, 1, 400);
  }
});

/* ===== PESTAÑA DE MÚSICA (izquierda) ===== */
const ctl = $("#musica"); let tCtl;
$("#mTab").addEventListener("click", () => {
  desbloquearAudios();
  ctl.classList.toggle("abierta"); clearTimeout(tCtl);
  if (ctl.classList.contains("abierta")) tCtl = setTimeout(() => ctl.classList.remove("abierta"), 3500);
});
$("#mMute").addEventListener("click", () => {
  desbloquearAudios();
  mudo = !mudo;
  ctl.classList.toggle("mudo", mudo);
  clearTimeout(tCtl);
  tCtl = setTimeout(() => ctl.classList.remove("abierta"), 3500);

  // Sincronizar muted en todos los tracks (soporte iPhone y web)
  Object.values(mus).forEach(a => { a.muted = mudo; });

  if (!actual) return;
  const a = mus[actual];
  if (mudo) {
    fade(a, 0, 300);
  } else {
    a.muted = false;
    a.play().catch(() => {});
    fade(a, 1, 300);
  }
});

/* ===== SOBRE ===== */
let abierto = false;
$("#sobre").addEventListener("click", () => {
  if (abierto) return;
  abierto = true;
  desbloquearAudios(); // Desbloquea ambos audios en el gesto de usuario (vital para iPhone)
  $("#sobre").classList.add("abierto");
  sonando = true;
  cambiar(zona);
  setTimeout(() => {
    $("#sobre").classList.add("fuera");
    $("#invitacion").hidden = false;
    document.body.classList.remove("bloqueado");
  }, 1800);
  setTimeout(() => $("#sobre").remove(), 2900);
});

/* ===== ADORNOS: flores en recuadros, imágenes opcionales ===== */
document.querySelectorAll(".cuadro").forEach(c => c.insertAdjacentHTML("beforeend",
  [1, 2, 3, 4].map(n => `<svg class="esq e${n}" viewBox="0 0 100 100" aria-hidden="true"><use href="#flor"/></svg>`).join("")));
document.querySelectorAll("img[data-slot]").forEach(i => {   // si la imagen aún no existe, se esconde
  const h = () => { i.style.display = "none"; };
  i.addEventListener("error", h);
  if (i.complete && !i.naturalWidth) h();
});

/* ===== ZONA POKÉMON: cambia al cruzar la mitad de la pantalla ===== */
new IntersectionObserver(([e]) => {
  zona = e.isIntersecting ? "pokemon" : "bautizo";
  cambiar(zona);
}, { rootMargin: "-45% 0px -45% 0px" }).observe($("#pokemon"));

/* ===== POKÉBOLA: sacude, gira, se abre y saca chispas ===== */
const bola = $("#bola"); let animando = false;
function animar() {
  if (animando) return; animando = true;
  bola.classList.add("sacude");
  setTimeout(() => {
    bola.classList.replace("sacude", "abre");
    for (let i = 0; i < 22; i++) {
      const c = document.createElement("i"); c.className = "chispa";
      c.style.setProperty("--a", (i * 360 / 22) + "deg");
      c.style.setProperty("--d", (70 + Math.random() * 70) + "px");
      c.style.animationDelay = (Math.random() * .2) + "s";
      bola.appendChild(c); setTimeout(() => c.remove(), 1400);
    }
    setTimeout(() => { bola.classList.remove("abre"); animando = false; }, 1700);
  }, 1400);
}
bola.addEventListener("click", () => {
  desbloquearAudios();
  animar();
});
new IntersectionObserver(([e], o) => { if (e.isIntersecting) { animar(); o.disconnect(); } }, { threshold: .8 }).observe(bola);

/* ===== BOTÓN: volver al hero ===== */
new IntersectionObserver(([e]) => $("#subir").classList.toggle("ver", !e.isIntersecting && e.boundingClientRect.top < 0)).observe($("#hero"));
$("#subir").addEventListener("click", () => $("#hero").scrollIntoView({ behavior: "smooth" }));

/* ===== ANIMACIONES DE ENTRADA ===== */
const rv = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add("vis"); rv.unobserve(e.target); }
}), { threshold: .12 });
document.querySelectorAll(".rv").forEach(el => rv.observe(el));

/* ===== CONTADOR ===== */
const fin = new Date(CONFIG.fechaEvento).getTime();
function tick() {
  const d = Math.max(0, fin - Date.now());
  const v = [Math.floor(d / 864e5), Math.floor(d / 36e5) % 24, Math.floor(d / 6e4) % 60, Math.floor(d / 1e3) % 60];
  document.querySelectorAll("#contador b").forEach((b, i) => b.textContent = String(v[i]).padStart(2, "0"));
}
tick(); setInterval(tick, 1000);

/* ===== CONFIRMACIÓN (envío silencioso a Google Forms) ===== */
const f = $("#rsvp");
for (let i = 1; i <= CONFIG.maxPases; i++) $("#fPases").add(new Option(i, i));
f.action = CONFIG.form.action;
$("#fNombre").name = CONFIG.form.entryNombre;
$("#fPases").name = CONFIG.form.entryPases;
$("#fSi").name = $("#fNo").name = CONFIG.form.entryAsistira;
let enviado = false;
f.addEventListener("submit", () => { enviado = true; });
$("#envio").addEventListener("load", () => {
  if (!enviado) return;
  f.hidden = true; $("#gracias").hidden = false;
});

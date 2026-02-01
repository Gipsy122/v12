import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ================= FIREBASE ================= */

const firebaseConfig = {
  apiKey: "AIzaSyCNxYid-xgcMWAqYYp8XMDM84ygtYJHn4A",
  authDomain: "idek-c2.firebaseapp.com",
  databaseURL: "https://idek-c2-default-rtdb.firebaseio.com",
  projectId: "idek-c2",
  storageBucket: "idek-c2.firebasestorage.app",
  messagingSenderId: "462533995335",
  appId: "1:462533995335:web:72330a59af61dd9b98ba62"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ================= ROLE ================= */

const isAdmin = new URLSearchParams(window.location.search).get("admin") === "true";
document.getElementById("roleBadge").innerText = isAdmin ? "ADMIN" : "USER";
if (isAdmin) document.getElementById("adminPanel").classList.remove("hidden");

/* ================= DATA MODEL INIT ================= */

const baseRef = ref(db, "system");

set(baseRef, {
  timers: {
    Bath: { remaining: 1800, running: false },
    Food: { remaining: 2700, used: 0 },
    Washroom: { remaining: 1800, used: 0 },
    Sleep: { remaining: 25200, running: false },
    WeeklyFun: { used: false }
  },
  gauges: {
    break: 12600,
    off: 1200
  },
  coupons: {}
});

/* ================= TIMERS UI ================= */

const timersDiv = document.getElementById("timers");
const adminTimers = document.getElementById("adminTimers");

onValue(baseRef, snap => {
  const data = snap.val();
  renderTimers(data.timers);
  renderGauges(data.gauges);
  renderCoupons(data.coupons);
});

/* ================= RENDER ================= */

function renderTimers(timers) {
  timersDiv.innerHTML = "";
  adminTimers.innerHTML = "";

  for (let key in timers) {
    const t = timers[key];
    const div = document.createElement("div");
    div.className = "timer";
    div.innerHTML = `<h4>${key}</h4><p>${format(t.remaining || 0)}</p>`;
    timersDiv.appendChild(div);

    if (isAdmin && t.remaining !== undefined) {
      const ad = document.createElement("div");
      ad.className = "timer";
      ad.innerHTML = `
        <h4>${key}</h4>
        <button onclick="toggle('${key}')">Start/Stop</button>
        <button onclick="addTime('${key}',300)">+5 min</button>
        <button onclick="addTime('${key}',-300)">-5 min</button>
      `;
      adminTimers.appendChild(ad);
    }
  }
}

function renderGauges(g) {
  document.getElementById("breakGauge").style.width = (g.break / 12600 * 100) + "%";
  document.getElementById("offGauge").style.width = (g.off / 1200 * 100) + "%";
}

function renderCoupons(coupons = {}) {
  const list = document.getElementById("couponList");
  list.innerHTML = "";

  Object.values(coupons).forEach(c => {
    if (c.used) return;
    const d = document.createElement("div");
    d.className = "timer";
    d.innerHTML = `<strong>${c.name}</strong><br>${c.minutes} min → ${c.target}`;
    if (!isAdmin) {
      d.onclick = () => redeem(c.id);
    }
    list.appendChild(d);
  });
}

/* ================= ACTIONS ================= */

window.toggle = (name) => {
  const r = ref(db, `system/timers/${name}`);
  onValue(r, s => {
    update(r, { running: !s.val().running });
  }, { once: true });
};

window.addTime = (name, sec) => {
  const r = ref(db, `system/timers/${name}`);
  onValue(r, s => {
    update(r, { remaining: Math.max(0, s.val().remaining + sec) });
  }, { once: true });
};

window.createCoupon = () => {
  const cRef = push(ref(db, "system/coupons"));
  set(cRef, {
    id: cRef.key,
    name: couponName.value,
    target: couponTarget.value,
    minutes: Number(couponMinutes.value),
    expiry: couponExpiry.value,
    used: false
  });
};

window.redeem = (id) => {
  const cRef = ref(db, `system/coupons/${id}`);
  onValue(cRef, s => {
    const c = s.val();
    if (c.used) return;
    update(ref(db, `system/timers/${c.target}`), {
      remaining: s => s + c.minutes * 60
    });
    update(cRef, { used: true });
  }, { once: true });
};

/* ================= UTILS ================= */

function format(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor(sec % 3600 / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

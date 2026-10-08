/* ================= SHARED: colours, emoji, helpers, avatar ================= */
const C = ["#E2231A", "#00A2FF", "#2FBF4F", "#8B5CF6", "#FF8A00", "#EC4899", "#14B8A6", "#64748B"],
  RN = ["🗡️", "💰", "🖥️", "🐶", "🎟️", "🧱", "🚗", "👑"];
const $ = (s) => document.querySelector(s),
  NS = "http://www.w3.org/2000/svg",
  K = (p, r) => p + "|" + r,
  sl = (ms) => new Promise((r) => setTimeout(r, ms));
/* Blocky avatar: head, eyes, shirt (colour c), arms, legs. Drawn around (x, y) at scale s. */
const av = (x, y, c, s = 1) => `
  <g transform="translate(${x - 16 * s},${y - 24 * s}) scale(${s})">
    <rect x="8" y="0" width="16" height="14" rx="2" fill="#FFD21F" stroke="#111" stroke-width="2"/>
    <rect x="11" y="5" width="2.5" height="3" fill="#111"/>
    <rect x="19" y="5" width="2.5" height="3" fill="#111"/>
    <rect x="6" y="15" width="20" height="16" fill="${c}" stroke="#111" stroke-width="2"/>
    <rect x="0" y="15" width="6" height="14" fill="#FFD21F" stroke="#111" stroke-width="2"/>
    <rect x="26" y="15" width="6" height="14" fill="#FFD21F" stroke="#111" stroke-width="2"/>
    <rect x="6" y="31" width="9" height="12" fill="#3b4a6b" stroke="#111" stroke-width="2"/>
    <rect x="17" y="31" width="9" height="12" fill="#3b4a6b" stroke="#111" stroke-width="2"/>
  </g>`;
/* ================= DEADLOCK PLAYGROUND: state ================= */
let procs = [],
  res = [],
  alloc = {},
  req = {},
  inflight = {},
  cur = {},
  tgt = {},
  pn = 0,
  rn = 0,
  dead = [],
  seenE = new Set(),
  seenN = new Set(),
  byeSet = new Set(),
  shk = {},
  toks = [],
  drag = null,
  NE = [],
  EE = [],
  gen = 0;
const ph = (p) => `-${(performance.now() / 1000) % p}s`,
  em = (r) => RN[res.find((x) => x.id === r).ei % 8];
const sumA = (r) =>
  Object.entries(alloc)
    .filter(([k]) => k.split("|")[1] === r)
    .reduce((s, [, v]) => s + v, 0);
const free = (r) => {
  const x = res.find((a) => a.id === r);
  return x ? x.n - sumA(r) - (inflight[r] || 0) : 0;
};
const held = (p) =>
  Object.entries(alloc)
    .filter(([k]) => k.split("|")[0] === p)
    .reduce((s, [, v]) => s + v, 0);
const wants = (p) =>
  Object.entries(req)
    .filter(([k]) => k.split("|")[0] === p)
    .reduce((s, [, v]) => s + v, 0);
const ex = (p, r) => procs.some((x) => x.id === p) && res.some((x) => x.id === r);
/* ---- real detection: multi-instance Work/Finish algorithm ---- */
function detect() {
  const av_ = {};
  res.forEach((r) => (av_[r.id] = r.n - sumA(r.id)));
  const fin = {};
  let ch = true;
  while (ch) {
    ch = false;
    for (const p of procs) {
      if (fin[p.id]) continue;
      if (res.every((r) => (req[K(p.id, r.id)] || 0) <= av_[r.id])) {
        fin[p.id] = 1;
        res.forEach((r) => (av_[r.id] += alloc[K(p.id, r.id)] || 0));
        ch = true;
      }
    }
  }
  return procs.filter((p) => !fin[p.id]).map((p) => p.id);
}
/* ---- layout and drawing ---- */
function layout() {
  procs.forEach((p, i) => (tgt[p.id] = { x: (900 / (procs.length + 1)) * (i + 1), y: 105 }));
  res.forEach((r, i) => (tgt[r.id] = { x: (900 / (res.length + 1)) * (i + 1), y: 365 }));
  const ids = new Set([...procs, ...res].map((x) => x.id));
  for (const id in tgt) {
    if (!ids.has(id)) {
      delete tgt[id];
      delete cur[id];
    } else if (!cur[id]) cur[id] = { x: tgt[id].x, y: id[0] === "P" ? -80 : 540 };
  }
}
const bdg = (id, a, x, y, t, c) =>
  `<g class="bdg" data-a="${a}" data-id="${id}" transform="translate(${x},${y})"><circle r="10" fill="${c}" stroke="#111" stroke-width="2.5"/><text y="4.5" text-anchor="middle" style="font-size:13px;fill:#fff">${t}</text></g>`;
function rebuild() {
  let E = "",
    N = "";
  const now = new Set(),
    hotA = (r, p) => dead.includes(p) && dead.some((q) => req[K(q, r)]);
  const edge = (a, b, k, cnt, hot) => {
    const key = k + a + b;
    now.add(key);
    const nw = !seenE.has(key),
      col = hot ? "#E2231A" : k === "a" ? "#1BAA3B" : "#FF8A00";
    E += `<g class="edge" data-a="${a}" data-b="${b}" data-k="${k}"><path class="hit"/><path class="ln ${hot ? "h" : k}${nw && k === "a" ? " n" : ""}" ${k === "a" ? 'pathLength="1"' : ""} marker-end="url(#m${hot ? "h" : k})"/><g style="display:${cnt > 1 ? "block" : "none"}"><circle r="11" fill="${col}" stroke="#111" stroke-width="2"/><text y="4.5" text-anchor="middle" style="fill:#fff">${cnt}</text></g></g>`;
  };
  for (const k in alloc) {
    const [p, r] = k.split("|");
    edge(r, p, "a", alloc[k], hotA(r, p));
  }
  for (const k in req) {
    const [p, r] = k.split("|");
    edge(p, r, "q", req[k], dead.includes(p));
  }
  seenE = now;
  procs.forEach((p) => {
    const d = dead.includes(p.id),
      w = wants(p.id),
      nw = !seenN.has(p.id);
    N += `<g class="nd" data-id="${p.id}" data-t="p"><g class="nd2${nw ? " pop" : ""}${byeSet.has(p.id) ? " bye" : ""}">${d ? '<circle r="40" cy="6" fill="#E2231A33" stroke="#E2231A" stroke-width="4" class="eh"/>' : ""}<g class="${d ? "shk" : "bob"}" style="animation-delay:${ph(1.6)}">${av(0, 0, C[p.ci % 8], 1.2)}</g><text y="44" text-anchor="middle">${p.id}</text><text y="-40" text-anchor="middle" style="font-size:22px">${d ? "😱" : w ? "⏳" : held(p.id) ? "😎" : ""}</text>${bdg(p.id, "x", 26, -30, "✕", "#E2231A")}</g></g>`;
  });
  res.forEach((r) => {
    const nw = !seenN.has(r.id),
      dots = [];
    procs.forEach((p) => {
      for (let j = 0; j < (alloc[K(p.id, r.id)] || 0); j++) dots.push(C[p.ci % 8]);
    });
    while (dots.length < r.n) dots.push("#fff");
    N += `<g class="nd${performance.now() - (shk[r.id] || -1e4) < 500 ? " nope" : ""}" data-id="${r.id}" data-t="r"><g class="nd2${nw ? " pop" : ""}${byeSet.has(r.id) ? " bye" : ""}"><g class="wg" style="animation-delay:${ph(3)}"><rect x="-23" y="-23" width="46" height="46" rx="6" fill="#FFB020" stroke="#111" stroke-width="3"/><text y="8" text-anchor="middle" style="font-size:24px">${RN[r.ei % 8]}</text></g>${dots.map((c, j) => `<circle cx="${(j - (dots.length - 1) / 2) * 15}" cy="-36" r="6" fill="${c}" stroke="#111" stroke-width="2"/>`).join("")}<text y="42" text-anchor="middle">${r.id}</text>${bdg(r.id, "x", 27, -25, "✕", "#E2231A")}${bdg(r.id, "+", -27, -25, "+", "#1BAA3B")}${bdg(r.id, "-", -27, 25, "−", "#FF8A00")}</g></g>`;
  });
  seenN = new Set([...procs, ...res].map((x) => x.id));
  $("#eL").innerHTML = E;
  $("#nL").innerHTML = N;
  EE = [...$("#eL").children];
  NE = [...$("#nL").children];
}
function refresh() {
  const was = dead.length > 0,
    st = $("#stage"),
    bd = $("#bd");
  dead = detect();
  rebuild();
  if (dead.length) {
    bd.className = "boom";
    bd.textContent = "💀 DEADLOCK";
    st.classList.add("bad");
    if (!was) {
      st.classList.remove("dead");
      void st.offsetWidth;
      st.classList.add("dead");
    }
  } else {
    bd.className = procs.length ? "boom ok" : "";
    bd.textContent = procs.length ? "✅ SAFE" : "";
    st.classList.remove("bad");
    if (was) {
      st.classList.add("party");
      setTimeout(() => st.classList.remove("party"), 2200);
    }
  }
}
/* ---- animation loop ---- */
function pth(A, B, off, ra, rb) {
  const mx = (A.x + B.x) / 2 + off,
    my = (A.y + B.y) / 2,
    d1 = Math.hypot(mx - A.x, my - A.y) || 1,
    d2 = Math.hypot(mx - B.x, my - B.y) || 1,
    sx = A.x + ((mx - A.x) / d1) * ra,
    sy = A.y + ((my - A.y) / d1) * ra,
    ex = B.x + ((mx - B.x) / d2) * rb,
    ey = B.y + ((my - B.y) / d2) * rb;
  return [`M${sx},${sy} Q${mx},${my} ${ex},${ey}`, (sx + ex) / 4 + mx / 2, (sy + ey) / 4 + my / 2];
}
function frame() {
  const now = performance.now();
  for (const id in tgt) {
    const c = cur[id],
      g = tgt[id];
    if (c) {
      c.x += (g.x - c.x) * 0.13;
      c.y += (g.y - c.y) * 0.13;
    }
  }
  NE.forEach((n) => {
    const c = cur[n.dataset.id];
    if (c) n.setAttribute("transform", `translate(${c.x},${c.y})`);
  });
  EE.forEach((e) => {
    const a = cur[e.dataset.a],
      b = cur[e.dataset.b];
    if (!a || !b) return;
    const [d, mx, my] = pth(
      a,
      b,
      e.dataset.k === "a" ? 34 : -34,
      e.dataset.a[0] === "P" ? 32 : 36,
      e.dataset.b[0] === "P" ? 38 : 40,
    );
    e.children[0].setAttribute("d", d);
    e.children[1].setAttribute("d", d);
    e.children[2].setAttribute("transform", `translate(${mx},${my})`);
  });
  toks = toks.filter((t) => {
    const u = Math.min(1, (now - t.t0) / t.ms),
      e = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u),
      b = cur[t.to] || t.a;
    t.g.setAttribute(
      "transform",
      `translate(${t.a.x + (b.x - t.a.x) * e},${t.a.y + (b.y - t.a.y) * e - Math.sin(Math.PI * u) * 45}) rotate(${Math.sin(u * 6.28) * 18})`,
    );
    if (u >= 1) {
      t.g.remove();
      t.done();
      return false;
    }
    return true;
  });
  const rb = $("#rb");
  if (drag && cur[drag.from]) {
    const a = cur[drag.from],
      b = drag.to && cur[drag.to] ? cur[drag.to] : drag;
    rb.setAttribute("d", `M${a.x},${a.y} L${b.x},${b.y}`);
    rb.style.stroke = drag.from[0] === "P" ? "#FF8A00" : "#1BAA3B";
  } else rb.setAttribute("d", "");
  requestAnimationFrame(frame);
}
/* ---- flying tokens and floating emoji ---- */
function tok(from, to, emo, ms = 700) {
  return new Promise((done) => {
    if (!cur[from] || !cur[to]) return done();
    const g = document.createElementNS(NS, "g");
    g.innerHTML = `<rect x="-16" y="-16" width="32" height="32" rx="7" fill="#FFD21F" stroke="#111" stroke-width="3"/><text y="7" text-anchor="middle" style="font-size:19px">${emo}</text>`;
    $("#fL").append(g);
    toks.push({ g, a: { ...cur[from] }, to, t0: performance.now(), ms, done });
  });
}
function fx(txt, id, dy = -58) {
  const c = cur[id];
  if (!c) return;
  const t = document.createElementNS(NS, "text");
  t.textContent = txt;
  t.setAttribute("x", c.x);
  t.setAttribute("y", c.y + dy);
  t.setAttribute("class", "fxt");
  $("#fL").append(t);
  setTimeout(() => t.remove(), 1000);
}
/* ---- OS actions (state changes when the animation lands) ---- */
async function give(r, p) {
  inflight[r] = (inflight[r] || 0) + 1;
  await tok(r, p, em(r), 750);
  inflight[r]--;
  if (ex(p, r)) {
    alloc[K(p, r)] = (alloc[K(p, r)] || 0) + 1;
    fx("✨", p);
    refresh();
  } else grant();
}
function nope(r) {
  shk[r] = performance.now();
  fx("🚫", r, -52);
  refresh();
}
async function request(p, r) {
  fx("🙋", p);
  await tok(p, r, "❗", 650);
  if (!ex(p, r)) return;
  const k = K(p, r),
    rs = res.find((x) => x.id === r);
  if (rs && (req[k] || 0) + (alloc[k] || 0) >= rs.n) return nope(r);
  req[k] = (req[k] || 0) + 1;
  fx("⏳", p);
  refresh();
}
function assign(r, p) {
  if (free(r) > 0) {
    const k = K(p, r);
    if (req[k]) {
      req[k]--;
      if (!req[k]) delete req[k];
    }
    give(r, p);
  } else nope(r);
}
function release(p, r) {
  const k = K(p, r);
  if (!alloc[k]) return;
  alloc[k]--;
  if (!alloc[k]) delete alloc[k];
  inflight[r] = (inflight[r] || 0) + 1;
  refresh();
  tok(p, r, em(r), 650).then(() => {
    inflight[r]--;
    grant();
  });
}
function cancel(p, r) {
  const k = K(p, r);
  if (!req[k]) return;
  req[k]--;
  if (!req[k]) delete req[k];
  fx("❌", p);
  refresh();
  grant();
}
function grant() {
  let ch = false;
  for (const k of Object.keys(req)) {
    const [p, r] = k.split("|");
    while (req[k] > 0 && free(r) > 0) {
      req[k]--;
      give(r, p);
      ch = true;
    }
    if (!req[k]) delete req[k];
  }
  if (ch) refresh();
}
function kill(p) {
  byeSet.add(p);
  for (const k of Object.keys(alloc)) {
    const [q, r] = k.split("|");
    if (q !== p) continue;
    const n = alloc[k];
    delete alloc[k];
    for (let i = 0; i < n; i++) {
      inflight[r] = (inflight[r] || 0) + 1;
      tok(p, r, em(r), 650).then(() => {
        inflight[r]--;
        grant();
      });
    }
  }
  for (const k of Object.keys(req)) if (k.split("|")[0] === p) delete req[k];
  refresh();
  setTimeout(() => {
    procs = procs.filter((x) => x.id !== p);
    byeSet.delete(p);
    layout();
    refresh();
    grant();
  }, 450);
}
function killRes(r) {
  byeSet.add(r);
  for (const k of Object.keys(alloc).concat(Object.keys(req)))
    if (k.split("|")[1] === r) {
      delete alloc[k];
      delete req[k];
    }
  fx("💨", r);
  refresh();
  setTimeout(() => {
    res = res.filter((x) => x.id !== r);
    byeSet.delete(r);
    layout();
    refresh();
    grant();
  }, 450);
}
const addP = () => {
    const id = "P" + ++pn;
    procs.push({ id, ci: pn - 1 });
    layout();
    refresh();
  },
  addR = () => {
    const id = "R" + ++rn;
    res.push({ id, n: 1, ei: rn - 1 });
    layout();
    refresh();
  };
function clearAll() {
  gen++;
  procs = [];
  res = [];
  alloc = {};
  req = {};
  inflight = {};
  pn = rn = 0;
  byeSet.clear();
  layout();
  refresh();
}
async function scenario(kind) {
  clearAll();
  const g = gen,
    ok = () => g === gen;
  if (kind === "dead") {
    addP();
    await sl(250);
    addP();
    await sl(250);
    addR();
    await sl(250);
    addR();
    await sl(600);
    give("R1", "P1");
    await sl(900);
    give("R2", "P2");
    await sl(1200);
    if (!ok()) return;
    await request("P1", "R2");
    await sl(300);
    if (!ok()) return;
    await request("P2", "R1");
  } else {
    addP();
    addP();
    addP();
    addR();
    addR();
    await sl(900);
    give("R1", "P1");
    give("R2", "P3");
    await sl(1200);
    if (!ok()) return;
    await request("P2", "R1");
    await sl(300);
    if (!ok()) return;
    await request("P1", "R2");
  }
}
/* ================= PLAYGROUND: interaction ================= */
/* ---- interaction ---- */
const svg = $("#g"),
  pt = (e) => {
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  };
svg.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".bdg") || e.target.closest(".hit")) return;
  const n = e.target.closest(".nd");
  if (!n) return;
  const q = pt(e);
  drag = { from: n.dataset.id, to: null, x: q.x, y: q.y };
  svg.setPointerCapture(e.pointerId);
  e.preventDefault();
});
svg.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const q = pt(e);
  drag.x = q.x;
  drag.y = q.y;
  const n = document.elementFromPoint(e.clientX, e.clientY)?.closest(".nd"),
    to = n && n.dataset.id[0] !== drag.from[0] ? n.dataset.id : null;
  if (to !== drag.to) {
    NE.forEach((x) => x.classList.toggle("tgt", x.dataset.id === to));
    drag.to = to;
  }
});
svg.addEventListener("pointerup", () => {
  if (!drag) return;
  const { from, to } = drag;
  drag = null;
  NE.forEach((x) => x.classList.remove("tgt"));
  if (to) {
    if (from[0] === "P") {
      if (alloc[K(from, to)]) {
        release(from, to);
        fx("👋", from);
      } else request(from, to);
    } else assign(from, to);
  }
});
svg.addEventListener("click", (e) => {
  const b = e.target.closest(".bdg");
  if (b) {
    const id = b.dataset.id,
      a = b.dataset.a,
      r = res.find((x) => x.id === id);
    if (a === "x") id[0] === "P" ? kill(id) : killRes(id);
    else if (a === "+" && r.n < 6) {
      r.n++;
      fx("➕", id);
      refresh();
      grant();
    } else if (a === "-") {
      if (r.n > 1 && free(id) > 0) {
        r.n--;
        refresh();
      } else nope(id);
    }
    return;
  }
  const ed = e.target.closest(".edge");
  if (ed) {
    const { a, b: c, k } = ed.dataset;
    k === "a" ? release(c, a) : cancel(a, c);
  }
});
$("#aP").onclick = addP;
$("#aR").onclick = addR;
$("#sD").onclick = () => scenario("dead");
$("#sS").onclick = () => scenario("safe");
$("#cl").onclick = clearAll;
$("#fx").onclick = () => {
  if (!dead.length) return;
  const v = [...dead].sort((a, b) => held(b) - held(a))[0];
  fx("🛠️", v);
  kill(v);
};
["#E2231A", "#00A2FF", "#2FBF4F", "#FFD21F", "#8B5CF6", "#FF8A00"].forEach((c) => {
  for (let k = 0; k < 2; k++) {
    const d = document.createElement("div"),
      z = 18 + Math.random() * 26;
    d.className = "cube";
    d.style.cssText = `background:${c};width:${z}px;height:${z}px;left:${Math.random() * 95}%;top:${10 + Math.random() * 80}%;animation-delay:-${Math.random() * 7}s;animation-duration:${5 + Math.random() * 5}s`;
    document.body.appendChild(d);
  }
});
addP();
addP();
addR();
addR();
frame();

/* ================= TABS: Coffman scenes, Banker's, routing ================= */
(() => {
  let SN = 0;
  const tabs = [
    ["dead", "💀 Deadlock", "#E2231A"],
    ["c1", "🔒 Mutual Exclusion", "#E2231A"],
    ["c2", "✋ Hold & Wait", "#00A2FF"],
    ["c3", "🚫 No Preemption", "#2FBF4F"],
    ["c4", "🔄 Circular Wait", "#8B5CF6"],
    ["avoid", "🏦 Avoidance", "#8B5CF6"],
  ];
  const MK = (id) =>
    [
      ["q", "#FF8A00"],
      ["a", "#1BAA3B"],
      ["h", "#E2231A"],
    ]
      .map(
        ([k, c]) =>
          `<marker id="m${k}${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`,
      )
      .join("");
  const W = 760,
    H = 360,
    rng = (k) => Array.from({ length: k }, (_, i) => i + 1);
  const rows = (n, m) => [
    ...rng(n).map((i) => ({ id: "P" + i, x: (W * i) / (n + 1), y: 75 })),
    ...rng(m).map((j) => ({ id: "R" + j, x: (W * j) / (m + 1), y: 290 })),
  ];
  const ring = (n, m) => {
    const k = Math.min(n, m),
      o = [];
    rng(k).forEach((i) =>
      [
        ["R" + i, 2 * (i - 1)],
        ["P" + i, 2 * i - 1],
      ].forEach(([id, t]) => {
        const a = (Math.PI * t) / k - Math.PI / 2;
        o.push({ id, x: 380 + 280 * Math.cos(a), y: 185 + 120 * Math.sin(a) });
      }),
    );
    const xp = rng(n).slice(k);
    xp.forEach((i, t) => o.push({ id: "P" + i, x: 380 + (t - (xp.length - 1) / 2) * 80, y: 185 }));
    rng(m)
      .slice(k)
      .forEach((j, t) => o.push({ id: "R" + j, x: 40, y: 60 + t * 80 }));
    return o;
  };
  /* Builds one auto-playing mini graph; returns play(nodes, script) */
  function mkScene(el) {
    const id = ++SN;
    el.innerHTML = `<div class="stage"><svg class="rag" viewBox="0 0 ${W} ${H}"><defs>${MK(id)}</defs><g class="el"></g><g class="nl"></g><g class="fl"></g></svg><div class="boom" hidden></div></div><div class="cap2"></div>`;
    const st = el.firstChild,
      q = (x) => el.querySelector(x),
      E = q(".el"),
      L = q(".nl"),
      F = q(".fl"),
      cap = q(".cap2"),
      bm = q(".boom"),
      mk = (t) => document.createElementNS(NS, t),
      em = (r) => RN[(+r.slice(1) - 1) % 8];
    let run = 0;
    return (nodes, script) => {
      const my = ++run,
        N = {},
        live = () => my === run;
      let ed = {};
      nodes.forEach((n) => (N[n.id] = n));
      const draw = () => {
        ed = {};
        E.innerHTML = F.innerHTML = "";
        st.classList.remove("bad", "dead");
        bm.hidden = true;
        bm.className = "boom";
        cap.textContent = "";
        L.innerHTML = nodes
          .map(
            (n, i) =>
              `<g transform="translate(${n.x},${n.y})"><g class="nd2 pop" style="animation-delay:${i * 0.08}s">` +
              (n.id[0] == "P"
                ? `<g class="bob" style="animation-delay:-${i * 0.4}s">${av(0, 0, C[(+n.id.slice(1) - 1) % 8], 1)}</g><text y="42" text-anchor="middle">${n.id}</text>`
                : `<g class="wg"><rect x="-21" y="-21" width="42" height="42" rx="6" fill="#FFB020" stroke="#111" stroke-width="3"/><text y="8" text-anchor="middle" style="font-size:22px">${em(n.id)}</text></g><text y="38" text-anchor="middle">${n.id}</text>`) +
              "</g></g>",
          )
          .join("");
      };
      const geo = (a, b) => {
        const A = N[a],
          B = N[b],
          dx = B.x - A.x,
          dy = B.y - A.y,
          d = Math.hypot(dx, dy);
        return `M${A.x + (dx / d) * 30},${A.y + (dy / d) * 30} L${B.x - (dx / d) * 34},${B.y - (dy / d) * 34}`;
      };
      const edge = (a, b, k) => {
        const p = mk("path");
        p.setAttribute("class", "ln " + k + (k == "a" ? " n" : ""));
        if (k == "a") p.setAttribute("pathLength", 1);
        p.setAttribute("d", geo(a, b));
        p.setAttribute("marker-end", `url(#m${k}${id})`);
        E.append(p);
        ed[a + b] = [p, k];
      };
      const pop = (t, x, y) => {
        const e = mk("text");
        e.textContent = t;
        e.setAttribute("x", x);
        e.setAttribute("y", y);
        e.setAttribute("class", "fxt");
        F.append(e);
        setTimeout(() => e.remove(), 1000);
      };
      const fly = (a, b, emo, ms, back) => {
        const A = N[a],
          B = N[b],
          g = mk("g");
        g.innerHTML = `<rect x="-15" y="-15" width="30" height="30" rx="7" fill="#FFD21F" stroke="#111" stroke-width="3"/><text y="7" text-anchor="middle" style="font-size:18px">${emo}</text>`;
        F.append(g);
        const f = (u) => ({
          transform: `translate(${A.x + (B.x - A.x) * u}px,${A.y + (B.y - A.y) * u - Math.sin(Math.PI * u) * 34}px)`,
        });
        return g
          .animate(back ? [f(0), f(0.55), f(0)] : [f(0), f(0.5), f(1)], {
            duration: ms,
            easing: "ease-in-out",
            fill: "forwards",
          })
          .finished.then(() => g.remove())
          .catch(() => {});
      };
      const A = {
        say: (t) => {
          cap.textContent = t;
        },
        wait: (ms) => sl(ms),
        give: async (r, p) => {
          await fly(r, p, em(r), 800);
          if (live()) {
            edge(r, p, "a");
            pop("✨", N[p].x, N[p].y - 40);
          }
        },
        req: async (p, r) => {
          await fly(p, r, "❗", 700);
          if (live()) {
            edge(p, r, "q");
            pop("⏳", N[p].x, N[p].y - 40);
          }
        },
        bounce: async (r, p) => {
          await fly(r, p, "🤏", 1100, 1);
          if (live()) pop("🚫", (N[r].x + N[p].x) / 2, (N[r].y + N[p].y) / 2 - 10);
        },
        rm: (a, b) => {
          const x = ed[a + b];
          if (x) {
            x[0].remove();
            delete ed[a + b];
          }
        },
        release: async (p, r) => {
          if (!ed[r + p]) return;
          await fly(p, r, em(r), 700);
          if (live() && ed[r + p]) {
            ed[r + p][0].remove();
            delete ed[r + p];
          }
        },
        deny: (a, b) => {
          const x = ed[a + b];
          if (x) {
            pop("🚫", (N[a].x + N[b].x) / 2, (N[a].y + N[b].y) / 2);
            x[0].remove();
            delete ed[a + b];
          }
        },
        ok: (t) => {
          for (const k in ed) {
            const [e, c] = ed[k];
            e.setAttribute("class", "ln " + c);
            e.setAttribute("marker-end", `url(#m${c}${id})`);
          }
          st.classList.remove("bad", "dead");
          bm.className = "boom ok";
          bm.hidden = false;
          bm.textContent = t;
        },
        hl: async (full) => {
          for (const k in ed) {
            const [e, t] = ed[k];
            if (full || t == "q") {
              e.setAttribute("class", "ln h");
              e.setAttribute("marker-end", `url(#mh${id})`);
            }
          }
          st.classList.add("bad");
          if (full) {
            st.classList.remove("dead");
            void st.offsetWidth;
            st.classList.add("dead");
            bm.hidden = false;
            bm.textContent = "💀 DEADLOCK";
          }
        },
      };
      (async () => {
        for (;;) {
          while (!el.offsetParent && live()) await sl(400);
          if (!live()) return;
          draw();
          await sl(900);
          for (const [f, ...a] of script) {
            while (!el.offsetParent && live()) await sl(400);
            if (!live()) return;
            await A[f](...a);
          }
          await sl(3500);
          if (!live()) return;
        }
      })();
    };
  }
  const legend =
    '<div class="legend"><span><i style="border-color:#1BAA3B"></i>holds (assigned)</span><span><i style="border-color:#FF8A00;border-top-style:dashed"></i>waiting (request)</span><span><i style="border-color:#E2231A"></i>blocked / deadlocked</span></div>';
  /* The four Coffman conditions: text + a generated animation script each */
  const CND = [
    {
      id: "c1",
      t: "🔒 1. Mutual Exclusion",
      col: "#E2231A",
      n: 3,
      m: 2,
      lay: rows,
      def: "A resource can be used by only one process at a time. If another process asks for it, it has to wait.",
      why: "An item cannot be shared, so requesters pile up behind the holder. If the holder is itself waiting for something, nobody moves.",
      fix: "Make resources shareable (read-only items, spooling) so nobody has to wait.",
      gen: (n, m) => {
        const h = Math.max(1, n >> 1),
          s = [["say", `${m} items, and each one can be used by only ONE player at a time.`]];
        rng(m).forEach((j) => s.push(["give", "R" + j, "P" + (((j - 1) % h) + 1)]));
        s.push(["say", "Players with no item ask for one that is already taken…"]);
        rng(n)
          .slice(h)
          .forEach((i, t) => s.push(["req", "P" + i, "R" + ((t % m) + 1)]));
        s.push(
          ["hl"],
          ["say", "They all have to wait: an item cannot be shared. That is mutual exclusion."],
          ["wait", 2200],
          ["say", "🛠️ Fix: make the items shareable, like read-only items."],
        );
        rng(n)
          .slice(h)
          .forEach((i, t) =>
            s.push(["rm", "P" + i, "R" + ((t % m) + 1)], ["give", "R" + ((t % m) + 1), "P" + i]),
          );
        s.push(
          ["ok", "✅ SHARED"],
          ["say", "Everyone can use the items at the same time, so nobody waits."],
        );
        return s;
      },
    },
    {
      id: "c2",
      t: "✋ 2. Hold and Wait",
      col: "#00A2FF",
      n: 3,
      m: 3,
      lay: rows,
      def: "A process keeps the resources it already has while it waits for more.",
      why: "Waiting players never release what they hold, so those items stay locked for everyone else.",
      fix: "Make a process request all its resources at once, or release everything it holds before asking again.",
      gen: (n, m) => {
        const k = Math.min(n, m),
          s = [["say", "Each player grabs an item and keeps it…"]];
        rng(k).forEach((i) => s.push(["give", "R" + i, "P" + i]));
        rng(m)
          .slice(k)
          .forEach((j) => s.push(["give", "R" + j, "P1"]));
        s.push(["say", "…while asking for another item that someone else holds."]);
        rng(k)
          .slice(1)
          .forEach((i) => s.push(["req", "P" + (i - 1), "R" + i]));
        rng(n)
          .slice(k)
          .forEach((i) => s.push(["req", "P" + i, "R1"]));
        s.push(
          ["hl"],
          ["say", "Every waiting player still HOLDS what it has. That is hold and wait."],
          ["wait", 2200],
          ["say", "🛠️ Fix: give back what you hold before asking for more."],
        );
        rng(k)
          .slice(1)
          .forEach((i) => s.push(["rm", "P" + (i - 1), "R" + i]));
        rng(n)
          .slice(k)
          .forEach((i) => s.push(["rm", "P" + i, "R1"]));
        rng(k).forEach((i) => s.push(["release", "P" + i, "R" + i]));
        rng(m)
          .slice(k)
          .forEach((j) => s.push(["release", "P1", "R" + j]));
        s.push(
          ["ok", "✅ NO HOLD & WAIT"],
          ["say", "Players return everything first, then ask again for all they need at once."],
        );
        return s;
      },
    },
    {
      id: "c3",
      t: "🚫 3. No Preemption",
      col: "#2FBF4F",
      n: 3,
      m: 2,
      lay: rows,
      def: "A resource cannot be forcibly taken away from a process. Only the holder can release it, when it is finished.",
      why: "Taking items from the holder is not allowed, so a blocked process can wait forever.",
      fix: "Allow preemption: if a request is blocked, the OS takes the held items back (for example from a lower-priority process).",
      gen: (n, m) => {
        const s = [["say", "P1 holds every item."]];
        rng(m).forEach((j) => s.push(["give", "R" + j, "P1"]));
        s.push(["say", "The others ask for items. Can the OS take them by force?"]);
        rng(n)
          .slice(1)
          .forEach((i, t) => s.push(["req", "P" + i, "R" + ((t % m) + 1)]));
        rng(n)
          .slice(1, 4)
          .forEach((i, t) => s.push(["bounce", "R" + ((t % m) + 1), "P" + i]));
        s.push(
          ["hl"],
          ["say", "No. Items are given back only voluntarily. That is no preemption."],
          ["wait", 2200],
          ["say", "🛠️ Fix: allow preemption, so the OS may take items back."],
        );
        rng(n)
          .slice(1, 1 + m)
          .forEach((i, t) => {
            const r = "R" + (t + 1);
            s.push(["release", "P1", r], ["rm", "P" + i, r], ["give", r, "P" + i]);
          });
        s.push(
          ["ok", "✅ PREEMPTED"],
          ["say", "The OS took the items back from P1 and handed them to the waiting players."],
        );
        return s;
      },
    },
    {
      id: "c4",
      t: "🔄 4. Circular Wait",
      col: "#8B5CF6",
      n: 3,
      m: 3,
      lay: ring,
      def: "There is a loop of processes, and each one waits for a resource held by the next one in the loop.",
      why: "Following the arrows leads back to the start, so no one in the loop can ever continue.",
      fix: "Number the resources and make every process request them in increasing order, so a loop is impossible.",
      gen: (n, m) => {
        const k = Math.min(n, m),
          s = [["say", `${k} players each grab one item.`]];
        rng(k).forEach((i) => s.push(["give", "R" + i, "P" + i]));
        s.push(["say", "Each one now asks for the item its neighbour holds…"]);
        rng(k).forEach((i) => s.push(["req", "P" + i, "R" + ((i % k) + 1)]));
        rng(n)
          .slice(k)
          .forEach((i) => s.push(["req", "P" + i, "R1"]));
        s.push(
          ["hl", 1],
          ["say", `P1 → P2 → … → P${k} → P1: a closed loop. That is circular wait.`],
          ["wait", 2200],
          [
            "say",
            `🛠️ Fix: number the items and only ask for a HIGHER number than you hold. P${k} holds R${k}, so asking for R1 is refused.`,
          ],
          ["deny", "P" + k, "R1"],
          ["wait", 900],
          ["release", "P" + k, "R" + k],
        );
        for (let i = k - 1; i >= 1; i--)
          s.push(
            ["rm", "P" + i, "R" + (i + 1)],
            ["give", "R" + (i + 1), "P" + i],
            ["release", "P" + i, "R" + (i + 1)],
            ["release", "P" + i, "R" + i],
          );
        s.push(
          ["ok", "✅ LOOP BROKEN"],
          ["say", "Requests only go upward, so a circle can never form and everyone finishes."],
        );
        return s;
      },
    },
  ];
  CND.forEach((c) => {
    const sec = document.createElement("section");
    sec.id = "t-" + c.id;
    sec.hidden = true;
    const op = (a, b, d) =>
      rng(b - a + 1)
        .map((i) => `<option ${i + a - 1 == d ? "selected" : ""}>${i + a - 1}</option>`)
        .join("");
    sec.innerHTML = `<div class="hero"><h1>${c.t}</h1></div><div class="card" style="border-top-color:${c.col}"><p style="margin-top:0"><b>What it means:</b> ${c.def}</p><div class="row"><label>🧍 Players <select class="np">${op(2, 6, c.n)}</select></label><label>📦 Items <select class="nm">${op(2, 6, c.m)}</select></label><button class="rp" style="--c:var(--yellow)">↻ Replay</button></div><div class="gv"></div>${legend}<div class="why"><b>Why this causes deadlock:</b> ${c.why}</div><div class="fix"><b>How to prevent it:</b> ${c.fix}</div></div>`;
    $("main").append(sec);
    const play = mkScene(sec.querySelector(".gv")),
      go = () => {
        const n = +sec.querySelector(".np").value,
          m = +sec.querySelector(".nm").value;
        play(c.lay(n, m), c.gen(n, m));
      };
    sec.querySelectorAll("select").forEach((x) => (x.onchange = go));
    sec.querySelector(".rp").onclick = go;
    go();
  });
  /* Banker's */
  const BK = (() => {
    let tok = 0,
      on = 0,
      n = 4,
      m = 3;
    const LET = "ABCDE",
      EM = ["💰", "🖥️", "🗡️", "🐶", "🎟️"];
    const A0 = [
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 2],
        [2, 1, 1],
        [0, 0, 2],
        [1, 0, 0],
      ],
      M0 = [
        [7, 5, 3],
        [3, 2, 2],
        [9, 0, 2],
        [2, 2, 2],
        [4, 3, 3],
        [2, 2, 1],
      ],
      V0 = [3, 3, 2];
    const safe = (al, mx, v) => {
      const w = [...v],
        d = [];
      let ch = 1;
      while (ch) {
        ch = 0;
        al.forEach((r, i) => {
          if (!d.includes(i) && mx[i].every((x, j) => x - r[j] <= w[j])) {
            d.push(i);
            r.forEach((x, j) => (w[j] += x));
            ch = 1;
          }
        });
      }
      return d.length == al.length;
    };
    const sample = () => {
      const al = [],
        mx = [];
      for (let i = 0; i < n; i++) {
        al.push([]);
        mx.push([]);
        for (let j = 0; j < m; j++) {
          const a = (A0[i] || [])[j] ?? 0;
          al[i].push(a);
          mx[i].push((M0[i] || [])[j] ?? Math.max(a, 1));
        }
      }
      let v = Array.from({ length: m }, (_, j) => V0[j] ?? 2);
      for (let t = 0; t < 30 && !safe(al, mx, v); t++) v = v.map((x) => x + 1);
      return [al, mx, v];
    };
    const tb = (id, d, hd) =>
      ($(id).innerHTML =
        `<table><tr><th></th>${d[0].map((_, j) => `<th>${EM[j]}${LET[j]}</th>`).join("")}</tr>${d.map((r, i) => `<tr><th style="color:${hd ? C[i % 8] : "inherit"}">${hd ? "P" + (i + 1) : "now"}</th>${r.map((v) => `<td><input type="number" min="0" value="${v}"></td>`).join("")}</tr>`).join("")}</table>`);
    const rd = (id) =>
      [...document.querySelectorAll(id + " tr")]
        .slice(1)
        .map((r) => [...r.querySelectorAll("input")].map((x) => Math.max(0, +x.value || 0)));
    const show = (st = {}) => {
      $("#pl").innerHTML = Array.from(
        { length: n },
        (_, i) =>
          `<div class="pc ${st[i] || ""}"><svg viewBox="0 0 44 56" width="44">${av(22, 28, C[i % 8], 1)}</svg><br><b>P${i + 1}</b><br>${st[i] == "done" ? "finished ✔" : st[i] == "chk" ? "checking…" : st[i] == "no" ? "must wait" : "idle"}</div>`,
      ).join("");
    };
    const load = (a, mm, v) => {
      tok++;
      tb("#ta", a, 1);
      tb("#tm", mm, 1);
      tb("#tv", [v], 0);
      $("#pl").classList.remove("party2");
      $("#sq").innerHTML = "";
      $("#lg").innerHTML = "";
      $("#wk").textContent = "–";
      show();
    };
    const go = (a, mm, v) => {
      load(a, mm, v);
      setTimeout(() => on && $("#run").click(), 300);
    };
    const size = () => {
      n = +$("#bn").value;
      m = +$("#bm").value;
      go(...sample());
    };
    $("#bn").onchange = $("#bm").onchange = size;
    $("#ex1").onclick = () => go(...sample());
    $("#ex2").onclick = () => {
      const [a, mm] = sample();
      go(a, mm, Array(m).fill(0));
    };
    $("#run").onclick = async () => {
      const t = ++tok,
        al = rd("#ta"),
        mx = rd("#tm"),
        w = rd("#tv")[0],
        nd = al.map((r, i) => r.map((v, j) => mx[i][j] - v)),
        done = [],
        seq = [],
        st = {},
        lg = $("#lg");
      lg.innerHTML = "";
      $("#sq").innerHTML = "";
      $("#pl").classList.remove("party2");
      const L = (x) => {
          lg.innerHTML += x + "<br>";
          lg.scrollTop = 1e9;
        },
        W = () => ($("#wk").textContent = "[" + w.join(", ") + "]");
      W();
      if (nd.some((r) => r.some((v) => v < 0))) {
        L("❌ Max is smaller than Allocation somewhere. Fix the inputs.");
        return;
      }
      L("Need = " + nd.map((r, i) => `P${i + 1}[${r}]`).join("  "));
      while (done.length < n) {
        let hit = 0;
        for (let i = 0; i < n; i++) {
          if (done.includes(i)) continue;
          st[i] = "chk";
          show(st);
          L(`Check P${i + 1}: Need [${nd[i]}] ≤ Work [${w}] ?`);
          await sl(1100);
          if (t != tok) return;
          if (nd[i].every((v, j) => v <= w[j])) {
            hit = 1;
            al[i].forEach((v, j) => (w[j] += v));
            done.push(i);
            seq.push(i);
            st[i] = "done";
            show(st);
            W();
            L(`   yes → P${i + 1} finishes, releases [${al[i]}]. Work = [${w}]`);
            $("#sq").innerHTML = seq.map((s) => `<span>P${s + 1}</span>`).join("→");
            await sl(900);
            if (t != tok) return;
            break;
          }
          st[i] = "no";
          show(st);
          L(`   no → P${i + 1} must wait`);
          await sl(500);
          if (t != tok) return;
          st[i] = "";
        }
        if (!hit) break;
      }
      if (done.length == n) {
        $("#pl").classList.add("party2");
        L("✅ SAFE STATE. Sequence: " + seq.map((s) => "P" + (s + 1)).join(" → "));
      } else {
        L("💀 UNSAFE STATE. Nobody can finish, so the OS refuses this allocation.");
        $("#sq").innerHTML += '<span class="x">no safe sequence</span>';
      }
    };
    load(...sample());
    return {
      start() {
        on = 1;
        load(...sample());
        setTimeout(() => on && $("#run").click(), 700);
      },
      stop() {
        on = 0;
        tok++;
      },
    };
  })();
  function route(k) {
    k =
      typeof k == "string"
        ? k
        : (() => {
            try {
              return location.hash.slice(1);
            } catch (e) {
              return "";
            }
          })();
    const t = tabs.some((x) => x[0] == k) ? k : "dead";
    tabs.forEach((x) => {
      const e = document.getElementById("t-" + x[0]);
      if (e) e.hidden = x[0] != t;
    });
    $("#nav").innerHTML = tabs
      .map(
        ([id, n, c]) =>
          `<a href="#${id}" data-t="${id}" class="${id == t ? "on" : ""}" style="--c:${c}">${n}</a>`,
      )
      .join("");
    BK.stop();
    if (t == "avoid") BK.start();
    try {
      history.replaceState(null, "", "#" + t);
    } catch (e) {}
    window.scrollTo(0, 0);
  }
  $("#nav").addEventListener("click", (e) => {
    const a = e.target.closest("a[data-t]");
    if (!a) return;
    e.preventDefault();
    route(a.dataset.t);
  });
  addEventListener("hashchange", () => route());
  route();
})();

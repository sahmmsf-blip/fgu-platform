// النواة المشتركة: الاتصال بقاعدة البيانات، الجلسة، والأدوات العامة للواجهة
(function () {
  const C = window.FGU_CONFIG;
  const KEY = "fgu.session";
  const store = () => { try { return localStorage.getItem(KEY) ? localStorage : sessionStorage; } catch (e) { return null; } };
  function session() { try { const s = store(); return s ? JSON.parse(s.getItem(KEY)) : null; } catch (e) { return null; } }
  function setSession(s, remember) {
    try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); if (s) (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(s)); } catch (e) { }
  }
  async function rpc(fn, args, opt) {
    args = args || {};
    if (!(opt && opt.noauth)) { const s = session(); args = Object.assign({ p_token: s && s.token }, args); }
    let r;
    try {
      r = await fetch(C.SUPABASE_URL + "/rest/v1/rpc/" + fn, { method: "POST", headers: { apikey: C.SUPABASE_KEY, "Content-Type": "application/json" }, body: JSON.stringify(args) });
    } catch (e) { throw new Error("تعذّر الاتصال بالخادم. تحقّق من الإنترنت ثم حاول مجددًا"); }
    let j = null; try { j = await r.json(); } catch (e) { }
    if (!r.ok) {
      const e = new Error((j && j.message) || "حدث خطأ غير متوقع"); e.code = j && j.code;
      if (e.code === "P0401" && !(opt && opt.noauth)) { setSession(null); location.replace("index.html?expired=1"); }
      if (e.code === "P0402") location.replace("index.html?change=1");
      throw e;
    }
    return j;
  }
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  function toast(msg, kind) {
    let box = $("#toasts"); if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
    const d = document.createElement("div"); d.className = "toast " + (kind || ""); d.textContent = msg; box.appendChild(d);
    setTimeout(() => d.remove(), kind === "err" ? 6000 : 3200);
  }
  // نافذة: modal({title, body (html), foot (html), wide}) → عنصر النافذة؛ close() لإغلاقها
  function modal(o) {
    const ov = document.createElement("div"); ov.className = "ov";
    ov.innerHTML = `<div class="mod ${o.wide ? "wide" : ""}" role="dialog" aria-modal="true"><header><h2>${esc(o.title)}</h2><button class="btn sm noprint" data-x>إغلاق</button></header><div class="bd">${o.body || ""}</div>${o.foot ? `<footer>${o.foot}</footer>` : ""}</div>`;
    const close = () => { ov.remove(); document.removeEventListener("keydown", k); };
    const k = (e) => { if (e.key === "Escape") close(); };
    ov.addEventListener("click", (e) => { if (e.target === ov || e.target.closest("[data-x]")) close(); });
    document.addEventListener("keydown", k);
    document.body.appendChild(ov); ov.close = close;
    const f = ov.querySelector("input, select, textarea"); if (f) setTimeout(() => f.focus(), 30);
    return ov;
  }
  function confirmBox(msg, okText) {
    return new Promise((res) => {
      const m = modal({ title: "تأكيد", body: `<p>${esc(msg)}</p>`, foot: `<button class="btn" data-x>إلغاء</button><button class="btn pri" data-ok>${esc(okText || "متابعة")}</button>` });
      m.querySelector("[data-ok]").onclick = () => { m.close(); res(true); };
      m.querySelector("[data-x]").addEventListener("click", () => res(false));
    });
  }
  async function busy(btn, fn) {
    const t = btn && btn.innerHTML; if (btn) { btn.disabled = true; btn.innerHTML = "…"; }
    try { return await fn(); } catch (e) { toast(e.message, "err"); return undefined; } finally { if (btn) { btn.disabled = false; btn.innerHTML = t; } }
  }
  const pct = (v, d) => (v == null || isNaN(v)) ? "—" : (Math.round(v * Math.pow(10, d == null ? 1 : d)) / Math.pow(10, d == null ? 1 : d)) + "%";
  const lvl = (p) => p == null ? "" : p >= 80 ? "ok" : p >= 60 ? "warn" : "bad";
  const bar = (p) => `<div class="bar ${lvl(p)}"><i style="width:${Math.max(0, Math.min(100, p || 0))}%"></i></div>`;
  const dt = (s) => s ? new Date(s).toLocaleString("ar-JO-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const toLocalInput = (s) => { if (!s) return ""; const d = new Date(s); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
  const fromLocalInput = (v) => v ? new Date(v).toISOString() : null;
  async function copy(text) { try { await navigator.clipboard.writeText(text); toast("نُسخ", "ok"); } catch (e) { toast("تعذّر النسخ"); } }
  // إتقان نتائج المقرر: يُجمَّع من أهداف الفصول التابعة لكل نتاج
  function outcomeMastery(course, objs) {
    return course.outcomes.map((o) => {
      let e = 0, m = 0;
      course.objectives.forEach((ob) => { if ((ob.course_outcomes || []).includes(o.seq) && objs[ob.code]) { e += +objs[ob.code][0]; m += +objs[ob.code][1]; } });
      return { seq: o.seq, text: o.text, pct: m ? e / m * 100 : null };
    });
  }
  function logout() { rpc("fgu_logout").catch(() => { }).finally(() => { setSession(null); location.replace("index.html"); }); }
  function guard(role) {
    const s = session();
    if (!s || !s.token) { location.replace("index.html"); return null; }
    if (s.must_change) { location.replace("index.html?change=1"); return null; }
    if (role && s.role !== role) { location.replace(s.role === "teacher" ? "teacher.html" : "student.html"); return null; }
    return s;
  }
  window.FGU = { rpc, session, setSession, esc, $, $$, toast, modal, confirmBox, busy, pct, lvl, bar, dt, toLocalInput, fromLocalInput, copy, outcomeMastery, logout, guard };
})();

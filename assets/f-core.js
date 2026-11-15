// نواة منصة جامعة فلوريدا: الجلسة برمز (token) واستدعاء دوال قاعدة البيانات، ومستويات الإتقان
(function () {
  const C = window.APP_CONFIG;
  const KEY = "fgu_session";
  function session() { try { return JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function setSession(s, remember) {
    try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); if (s) (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(s)); } catch (e) { }
  }
  function remembered() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  // onAuth: يُستدعى عند انتهاء الجلسة (P0401) أو وجوب تغيير كلمة المرور (P0402)
  let onAuth = null;
  async function rpc(fn, args, noauth) {
    args = args || {};
    if (!noauth) { const s = session(); args = Object.assign({ p_token: s && s.token }, args); }
    let r, lastErr;
    for (let i = 0; i < 3; i++) {
      try { r = await fetch(C.SUPABASE_URL + "/rest/v1/rpc/" + fn, { method: "POST", headers: { apikey: C.SUPABASE_KEY, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(args) }); break; }
      catch (e) { lastErr = e; await new Promise((ok) => setTimeout(ok, 700 * (i + 1))); }
    }
    if (!r) throw new Error(window.I18N ? window.I18N.err("تعذّر الاتصال بالإنترنت. تحقّق من الشبكة وحاول مجددًا.") : "تعذّر الاتصال بالإنترنت. تحقّق من الشبكة وحاول مجددًا.");
    const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { }
    if (!r.ok) {
      const e = new Error((j && j.message) || "حدث خطأ غير متوقع"); e.code = j && j.code;
      if (window.I18N) e.message = window.I18N.err(e.message);
      if (!noauth && (e.code === "P0401" || e.code === "P0402") && onAuth) onAuth(e.code);
      throw e;
    }
    return j;
  }
  // مستويات الإتقان (بنظام منصة السهم العلمي الرباعي) من نسبة مئوية
  const LV_AR = ["", "مبتدئ", "نامٍ", "متمكّن", "متميّز"], LV_EN = ["", "Beginning", "Developing", "Proficient", "Distinguished"];
  const en = () => document.documentElement.lang === "en";
  const LV = new Proxy(LV_AR, { get: (t, k) => (en() ? LV_EN : LV_AR)[k] });
  const lvOf = (p) => p == null ? 0 : p >= 85 ? 4 : p >= 70 ? 3 : p >= 50 ? 2 : 1;
  const lvChip = (p) => { const k = lvOf(p); return `<span class="lv lv${k}">${k ? LV[k] : (en() ? "Not measured" : "لم يُقَس")}</span>`; };
  const lvBar = (p) => `<div class="lvbar l${lvOf(p)}"><i style="width:${Math.max(0, Math.min(100, p || 0))}%"></i></div>`;
  const nf = (v, d = 1) => (v == null || isNaN(v) ? "—" : String(Math.round(v * Math.pow(10, d)) / Math.pow(10, d)));
  const pc = (v, d = 0) => (v == null || isNaN(v) ? "—" : nf(v, d) + (document.documentElement.lang === "en" ? "%" : "٪"));
  // إتقان نتاجات المقرر: يُجمَّع من أهداف الفصول التابعة لكل نتاج
  function outcomeMastery(course, objs) {
    return course.outcomes.map((o) => {
      const text = en() && o.text_en ? o.text_en : o.text;
      let e = 0, m = 0;
      course.objectives.forEach((ob) => { if ((ob.course_outcomes || []).includes(o.seq) && objs[ob.code]) { e += +objs[ob.code][0]; m += +objs[ob.code][1]; } });
      return { seq: o.seq, text, pct: m ? e / m * 100 : null };
    });
  }
  function chaptersOf(course) {
    const out = []; course.objectives.forEach((o) => { let c = out.find((x) => x.ch === o.chapter); if (!c) out.push(c = { ch: o.chapter, title: en() && o.chapter_title_en ? o.chapter_title_en : o.chapter_title, objs: [] }); c.objs.push(o); });
    return out;
  }
  const emptyBox = (i, t, s, extra) => `<div class="card empty"><div class="ibox" style="margin:0 auto 12px">${ic(i)}</div><b>${t}</b>${s ? `<div class="tiny" style="margin-top:4px">${s}</div>` : ""}${extra || ""}</div>`;
  const AR_M = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
  async function copy(t) { try { await navigator.clipboard.writeText(t); U.toast("نُسخ"); } catch (e) { U.toast("تعذّر النسخ", true); } }
  // التقويمات الثلاثة كما يعتمدها المحاضر: الأول (المنتصف) ثم الثاني الأدائي (كل ما عدا المنتصف والنهائي) ثم النهائي
  function evalGroups(comps) {
    const en = document.documentElement.lang === "en";
    const g = [{ key: "first", title: en ? "First assessment (midterm)" : "التقويم الأول (منتصف الفصل)", comps: [] },
      { key: "second", title: en ? "Second assessment (performance)" : "التقويم الثاني (الأدائي)", comps: [] },
      { key: "final", title: en ? "Final exam" : "الاختبار النهائي", comps: [] }];
    comps.forEach((k) => (k.key === "midterm" ? g[0] : k.key === "final" ? g[2] : g[1]).comps.push(k));
    g.forEach((x) => (x.weight = x.comps.reduce((t, k) => t + +k.weight, 0)));
    return g.filter((x) => x.comps.length);
  }
  // علامة الطالب في مجموعة: مجموع علامات مكوّناتها المحتسبة (null إن لم يُرصد شيء)
  const groupMark = (st, grp) => { const v = grp.comps.filter((k) => st.comps[k.id] != null).map((k) => st.comps[k.id] * k.weight / 100); return v.length ? v.reduce((a, b) => a + b, 0) : null; };
  window.F = { evalGroups, groupMark, C, session, setSession, remembered, rpc, setOnAuth: (f) => (onAuth = f), LV, lvOf, lvChip, lvBar, nf, pc, outcomeMastery, chaptersOf, emptyBox, AR_M, copy };
})();

// صفحة الطالب: موقع + دخول + تغيير كلمة المرور + لوحة مقسّمة + الاختبار القصير + النتيجة (بتصميم منصة السهم العلمي)
// كل نص يراه الطالب بلغتين: T(عربي، إنجليزي) — واللغة يختارها الطالب من زر EN / ع
(function () {
  const { $, esc, mmss, toast, openSheet, closeSheet, confirmSheet, initSkin, skinPicker, spin, greet, firstName, ago, fmtDT } = U;
  const { rpc, session, setSession, remembered, lvChip, lvBar, nf, pc, outcomeMastery, chaptersOf, emptyBox, LV, lvOf } = F;
  const { T, pick, comp, name } = I18N;
  const en = () => I18N.lang === "en";
  const L = ["a", "b", "c", "d", "e", "f"];
  initSkin("student", "navy");
  const D = { home: null, en: null };
  const X = { a: null, i: 0, ans: [], flags: {}, timer: null, saveT: null, dirty: false, end: null, submitting: false };
  let tempPw = null, lastResult = null;

  function show(v) { ["vLogin", "vHome", "vExam", "vResult"].forEach((k) => $(k).classList.toggle("hide", k !== v)); window.scrollTo(0, 0); }

  // ===================== الموقع =====================
  $("yr").textContent = new Date().getFullYear();
  window.addEventListener("scroll", () => $("siteNav").classList.toggle("scrolled", window.scrollY > 8), { passive: true });
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 }) : null;
  $("skinBtnL").onclick = skinPicker; $("skinBtn").onclick = skinPicker;
  const CHAPS = [
    ["الإدارة المالية والمشروع الريادي", "Financial Management and the Entrepreneurial Venture", 5, "flag"],
    ["الأسواق المالية وتمويل المشروع الجديد", "Financial Markets and Financing the New Venture", 5, "layers"],
    ["أساسيات المحاسبة: لغة الأعمال", "Accounting Basics: The Language of Business", 5, "book"],
    ["القوائم المالية: قراءة قصة المنشأة", "Financial Statements: Reading the Firm's Story", 5, "file"],
    ["التحليل المالي: استخدام النسب لتشخيص الأداء", "Financial Analysis: Using Ratios to Diagnose Performance", 5, "chart"],
    ["تحليل التعادل: كم يجب أن تبيع؟", "Break-Even Analysis: How Much Must You Sell?", 5, "target"],
    ["إدارة رأس المال العامل: سد الفجوة النقدية", "Working Capital Management: Closing the Cash Gap", 5, "refresh"],
    ["القيمة الزمنية للنقود", "The Time Value of Money", 6, "clock"],
    ["الموازنة الرأسمالية والجدوى المالية", "Capital Budgeting and Financial Feasibility", 6, "trend"],
    ["التخطيط المالي والخطة المالية", "Financial Planning and the Financial Plan", 4, "spark"]];
  function renderChaps() {
    $("chapList").innerHTML = CHAPS.map(([ta, te, n, i], k) => `<div><div class="ibox ${k % 3 === 2 ? "gold" : ""}">${ic(i)}</div><h3>${T("الفصل", "Chapter")} ${k + 1}</h3><p>${esc(T(ta, te))} · ${n} ${T("أهداف", "objectives")}</p></div>`).join("");
  }
  renderChaps();
  function showSite() {
    show("vLogin"); $("loginBox").classList.remove("hide"); $("changeBox").classList.add("hide"); $("welcomeBox").classList.add("hide");
    document.querySelectorAll(".reveal").forEach((el) => io ? io.observe(el) : el.classList.add("in"));
  }
  F.setOnAuth((code) => {
    if (code === "P0402") { const s = session(); if (s) { s.must_change = true; setSession(s, remembered()); } showSite(); showChange(); return; }
    setSession(null); stopExam(); showSite(); loginErr(T("انتهت الجلسة. سجّل الدخول من جديد.", "Your session has expired. Please log in again."));
  });

  // ===================== الدخول =====================
  function loginErr(msg, box) {
    const err = $(box || "loginErr"); err.innerHTML = ic("alert", "sm") + "<span>" + esc(msg) + "</span>"; err.classList.remove("hide");
    $("portal").classList.remove("shake"); void $("portal").offsetWidth; $("portal").classList.add("shake");
  }
  $("eye").onclick = () => { const p = $("pass"); p.type = p.type === "password" ? "text" : "password"; };
  $("helpBtn").onclick = () => openSheet(`<h3>${T("نسيت كلمة المرور؟", "Forgot your password?")}</h3><p class="muted" style="margin-bottom:12px">${T(
      "لا تُستعاد كلمة المرور بالبريد. تواصل مع المحاضر، فيعيد كلمة مرورك إلى رقمك الجامعي، ثم تدخل بها وتختار كلمتك الخاصة.",
      "Passwords are not recovered by email. Contact your lecturer, who will reset your password to your university ID; then log in with it and choose your own password.")}</p>
    <div class="list card"><a class="li" href="tel:0777478595"><span>${ic("phone", "sm")} ${T("الهاتف", "Phone")}</span><b dir="ltr">0777 478 595</b></a>
    <a class="li" href="https://whatsapp.com/channel/0029VbDEOn26hENv5mIE1m0L" target="_blank" rel="noopener"><span>${ic("chat", "sm")} ${T("قناة الواتساب", "WhatsApp channel")}</span><span class="tiny">${T("افتح", "Open")}</span></a></div>
    <p class="tiny" style="margin-top:12px">${T("اسم الدخول هو رقمك الجامعي.", "Your username is your university ID.")}</p>`);
  function showChange() {
    $("loginBox").classList.add("hide"); $("welcomeBox").classList.add("hide"); $("changeBox").classList.remove("hide");
    $("oldWrap").classList.toggle("hide", !!tempPw); setTimeout(() => $("new1").focus(), 50);
  }
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault(); $("loginErr").classList.add("hide");
    const u = $("uid").value.trim(), p = $("pass").value;
    if (!u || !p) return loginErr(T("اكتب رقمك الجامعي وكلمة المرور.", "Enter your university ID and password."));
    const btn = $("loginBtn"); spin(btn, true, T("جارٍ الدخول…", "Logging in…"));
    try {
      const r = await rpc("fgu_login", { p_username: u, p_password: p, p_remember: $("remember").checked }, true);
      // حساب المحاضر: ينتقل مباشرة إلى لوحة المحاضر بالجلسة نفسها
      if (r.role !== "student") { setSession(r, $("remember").checked); location.href = "teacher.html"; return; }
      setSession(r, $("remember").checked);
      if (r.must_change) { tempPw = p; spin(btn, false); showChange(); return; }
      welcome(r.full_name);
    } catch (err) { spin(btn, false); loginErr(err.message); }
  });
  $("changeForm").addEventListener("submit", async (e) => {
    e.preventDefault(); $("changeErr").classList.add("hide");
    if ($("new1").value !== $("new2").value) return loginErr(T("كلمتا المرور غير متطابقتين.", "The two passwords do not match."), "changeErr");
    const btn = $("changeBtn"); spin(btn, true, T("جارٍ الحفظ…", "Saving…"));
    try {
      await rpc("fgu_change_password", { p_old: tempPw || $("oldPass").value, p_new: $("new1").value });
      const s = session(); s.must_change = false; setSession(s, remembered() || $("remember").checked); tempPw = null;
      spin(btn, false); welcome(s.full_name);
    } catch (err) { spin(btn, false); loginErr(err.message, "changeErr"); }
  });
  function welcome(nm) {
    $("loginBox").classList.add("hide"); $("changeBox").classList.add("hide"); $("welcomeBox").classList.remove("hide");
    $("wName").textContent = T("أهلًا، ", "Welcome, ") + firstName(nm); setTimeout(() => loadHome(), 650);
  }
  $("logoutBtn").onclick = async () => { try { await rpc("fgu_logout"); } catch (e) { } setSession(null); location.hash = ""; showSite(); };
  $("refreshBtn").onclick = () => loadHome(true);
  $("homeLink").onclick = (e) => { e.preventDefault(); location.hash = ""; };

  // ===================== اللوحة =====================
  async function loadHome(silent) {
    try { D.home = await rpc("s_home"); }
    catch (e) { if (e.code !== "P0401" && e.code !== "P0402") { toast(e.message, true); showSite(); } return; }
    const keep = D.en && D.en.enrollment_id;
    D.en = D.home.enrollments.find((x) => x.enrollment_id === keep) || D.home.enrollments[0] || null;
    $("hName").textContent = firstName(D.home.me.full_name); $("hAv").textContent = firstName(D.home.me.full_name).slice(0, 1);
    route(); if (!silent || $("vHome").classList.contains("hide")) show("vHome");
    if (silent) toast(T("حُدِّثت البيانات", "Data refreshed"));
  }
  window.addEventListener("hashchange", () => { if (D.home && !X.a) { route(); window.scrollTo(0, 0); } });
  const me = () => (D.en && D.en.calc.students[0]) || { items: {}, comps: {}, objs: {} };
  const objText = (c, code) => { const o = c.objectives.find((x) => x.code === code) || {}; return pick(o, "text") || ""; };
  function route() {
    const [k] = (location.hash || "").replace("#/", "").split("/");
    if (!D.en) { $("dash").innerHTML = emptyBox("users", T("لم تُسجَّل في أي مقرر بعد", "You are not enrolled in any course yet"), T("راجع المحاضر ليضيفك إلى شعبتك.", "Ask your lecturer to add you to your section.")); return; }
    const fn = { marks: pMarks, quizzes: pQuizzes, objectives: pObjectives, outcomes: pOutcomes, me: pMe }[k];
    $("dash").innerHTML = fn ? fn() : dashHome();
    wire();
  }
  function wire() {
    const box = $("dash");
    box.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => { location.hash = b.dataset.go ? "#/" + b.dataset.go : ""; }));
    box.querySelectorAll("[data-skin-open]").forEach((b) => (b.onclick = skinPicker));
    box.querySelectorAll("[data-start]").forEach((b) => (b.onclick = () => startQuiz(b.dataset.start)));
    box.querySelectorAll("[data-hist]").forEach((b) => (b.onclick = () => attemptsList(b.dataset.hist)));
    box.querySelectorAll("[data-en]").forEach((b) => (b.onclick = () => { D.en = D.home.enrollments.find((x) => x.enrollment_id === b.dataset.en); route(); }));
    const pw = box.querySelector("#mePw"); if (pw) pw.onclick = changePw;
  }
  function crumb(title, sub) {
    return `<div class="crumb"><button class="iconbtn" data-go="" aria-label="${T("العودة إلى لوحتي", "Back to my dashboard")}">${ic("right")}</button>
      <div><h2>${title}</h2>${sub ? `<div class="tiny">${sub}</div>` : ""}</div></div>`;
  }
  const openQ = () => D.en.quizzes.filter((q) => q.open && (q.pending || !q.quiz.attempts || q.used < q.quiz.attempts));
  const leftTxt = (left) => left == null ? T("محاولات غير محدودة", "Unlimited attempts") : T("بقي " + left + " محاولة", left + " attempt" + (left === 1 ? "" : "s") + " left");
  const qTxt = (n) => T(n + " أسئلة", n + " questions");
  const minTxt = (m) => T(m + " دقيقة", m + " min");

  function dashHome() {
    const s = me(), C = D.en.calc, c = D.en.course;
    const objs = Object.entries(s.objs || {}).filter(([, v]) => +v[1] > 0), mastered = objs.filter(([, v]) => v[0] / v[1] * 100 >= 70).length;
    const qs = D.en.quizzes, best = qs.map((q) => q.best).filter((v) => v != null);
    let out = `<section class="greet"><div style="position:relative;z-index:1">
      <h1 class="gr-h"><span>${greet()}${T("، ", ", ")}${esc(firstName(D.home.me.full_name))}</span></h1>
      <div class="sub">${esc([pick(c, "title"), name(D.en.section), name(D.en.term)].filter(Boolean).join(" · "))}</div></div>
      <div class="kpis">${C.components.slice(0, 4).map((k) => `<button class="kpi mkpi" data-go="marks"><span>${esc(comp(k))}</span><b class="num">${s.comps[k.id] != null ? nf(s.comps[k.id] * k.weight / 100, 1) : "—"}</b><small>${T("من", "of")} ${nf(+k.weight, 0)}</small></button>`).join("")}</div>
      <div class="kpis sm">
        <div class="kpi"><b class="num">${s.total != null ? nf(s.total, 1) : "—"}</b><span>${T("مجموعك من " + nf(s.wsofar || 0, 0) + " محتسبة", "Your total out of " + nf(s.wsofar || 0, 0) + " counted")}</span></div>
        <div class="kpi"><b class="num">${best.length ? pc(Math.max(...best)) : "—"}</b><span>${T("أفضل نتيجة في اختبار قصير", "Best quiz result")}</span></div>
        <div class="kpi"><b class="num">${qs.reduce((a, q) => a + q.used, 0)}</b><span>${T("محاولة سلّمتها", "Attempts submitted")}</span></div>
        <div class="kpi"><b class="num">${objs.length ? mastered + "/" + objs.length : "—"}</b><span>${T("أهداف أتقنتها", "Objectives mastered")}</span></div>
      </div></section>`;
    if (D.home.enrollments.length > 1) out += `<div class="card pad row wrap" style="margin-bottom:14px;gap:8px"><span class="tiny">${T("مقرراتي:", "My courses:")}</span>${D.home.enrollments.map((x) => `<button class="btn sm ${x.enrollment_id === D.en.enrollment_id ? "primary" : "outline"}" data-en="${x.enrollment_id}">${esc(pick(x.course, "title"))} · ${esc(name(x.term))}</button>`).join("")}</div>`;
    openQ().forEach((q) => {
      const left = q.quiz.attempts ? q.quiz.attempts - q.used : null;
      out += `<div class="spot"><div class="ibox">${ic("play", "lg")}</div>
        <div><span class="pill open">${q.pending ? T("محاولة جارية", "Attempt in progress") : T("مفتوح الآن", "Open now")}</span><h3 style="margin-top:6px">${esc(q.title)}</h3>
          <div class="meta"><span>${T("اختبار قصير", "Quiz")}</span><span>${qTxt(q.quiz.n)}</span>${q.quiz.minutes ? `<span>${minTxt(q.quiz.minutes)}</span>` : ""}<span>${leftTxt(left)}</span>
          ${q.close_at ? `<span>${T("يُغلق", "Closes")} <b class="cd">${ago(q.close_at)}</b></span>` : ""}${q.best != null ? `<span>${T("أفضل نتيجة", "Best result")} ${pc(q.best)}</span>` : ""}</div></div>
        <div><button class="btn primary lg" data-start="${q.id}">${q.pending ? T("متابعة", "Continue") : q.used ? T("محاولة جديدة", "New attempt") : T("ابدأ الاختبار", "Start quiz")}${ic("left", "sm")}</button></div></div>`;
    });
    // توصية: أضعف الأهداف
    const weak = objs.map(([k, v]) => [k, v[0] / v[1] * 100]).sort((a, b) => a[1] - b[1]).filter((x) => x[1] < 70).slice(0, 3);
    if (weak.length) out += `<div class="smart">${ic("spark")}<div class="grow"><b>${T("ابدأ مراجعتك من هنا", "Start your review here")}</b>
      <ul class="tshort">${weak.map(([k, p]) => `<li><b>${T("الهدف", "Objective")} ${k}</b><span class="tiny"> — ${esc(objText(c, k))} (${pc(p)})</span></li>`).join("")}</ul>
      <button class="btn sm primary" data-go="objectives" style="margin-top:8px">${T("خريطة أهدافي كاملة", "My full objectives map")}</button></div></div>`;
    const tiles = [
      ["quizzes", "file", T("الاختبارات القصيرة", "Quizzes"), openQ().length ? T("اختبار مفتوح الآن — ادخل وابدأ", "A quiz is open now — go in and start") : T("الاختبارات المفتوحة والسابقة ومحاولاتك", "Open and past quizzes and your attempts"), openQ().length || null, !!openQ().length],
      ["marks", "award", T("علاماتي", "My marks"), s.total != null ? T("مجموعك حتى الآن " + nf(s.total, 1) + " من " + nf(s.wsofar || 0, 0), "Your total so far: " + nf(s.total, 1) + " of " + nf(s.wsofar || 0, 0)) : T("علاماتك في كل مكوّن من مكوّنات المقرر", "Your marks in every course component"), null],
      ["objectives", "target", T("خريطة أهدافي", "My objectives map"), objs.length ? T("مستواك في " + objs.length + " هدفًا من " + c.objectives.length, "Your level in " + objs.length + " of " + c.objectives.length + " objectives") : T("مستواك في كل هدف من أهداف الفصول", "Your level in every chapter objective"), null],
      ["outcomes", "chart", T("نتاجات المقرر", "Course outcomes"), T("مدى إتقانك لنتاجات المقرر الثمانية", "Your mastery of the eight course outcomes"), null],
      ["me", "user", T("ملفّي", "My profile"), T("بياناتك، وتغيير كلمة المرور", "Your details and password change"), null],
      ["", "palette", T("المظهر", "Theme"), T("اختر السمة التي تريح عينيك", "Choose a theme that is easy on your eyes"), null, false, true]
    ];
    out += '<div class="tiles">' + tiles.map(([k, i, t, sub, cnt, hot, skin]) =>
      `<button class="tile" ${skin ? "data-skin-open" : `data-go="${k}"`}><div class="ibox ${k === "objectives" ? "gold" : ""}">${ic(i)}</div>
        ${cnt != null ? `<span class="cnt ${hot ? "hot" : ""} num">${cnt}</span>` : ""}<div><h3>${t}</h3><p>${esc(sub)}</p></div><span class="go">${ic("left", "sm")}</span></button>`).join("") + "</div>";
    return out;
  }

  function pMarks() {
    const s = me(), C = D.en.calc;
    let h = crumb(T("علاماتي", "My marks"), T("تُحسب نسبة كل مكوّن من متوسط تقويماته، ثم تُضرب في وزنه من توزيع الخطة الدراسية", "Each component's percentage is the average of its assessments, multiplied by its weight in the syllabus grade distribution"));
    h += `<div class="card pad"><div class="row sp wrap"><div><span class="tiny">${T("مجموعك الآن", "Your total now")}</span><div class="hero-n num">${s.total != null ? nf(s.total, 1) : "—"} <small>${T("من", "of")} ${nf(s.wsofar || 0, 0)}</small></div></div>
      <span class="tiny" style="max-width:340px">${T("«من» = مجموع أوزان المكوّنات التي فيها علامات محتسبة حتى الآن. يكتمل إلى 100 بنهاية الفصل.", "“of” = the total weight of the components with counted marks so far. It reaches 100 by the end of the term.")}</span></div></div>`;
    h += C.components.map((k) => {
      const A = C.assessments.filter((a) => a.component_id === k.id), v = s.comps[k.id];
      return `<div class="card pad" style="margin-top:12px"><div class="row sp"><h3 style="font-size:16px">${esc(comp(k))}</h3><span class="row" style="gap:8px"><span class="pill">${T("الوزن", "Weight")} ${nf(+k.weight, 0)}%</span>${v != null ? `<b class="num">${nf(v * k.weight / 100, 1)} / ${nf(+k.weight, 0)}</b>` : ""}</span></div>
        ${A.length ? `<div class="list" style="margin-top:8px">${A.map((a) => { const x = s.items[a.id]; return `<div class="li"><div><b>${esc(a.title)}</b><div class="tiny">${a.kind === "quiz" ? T("اختبار قصير إلكتروني — تُحتسب أفضل محاولة", "Online quiz — best attempt counts") : T("تقويم يرصده المحاضر", "Assessment marked by the lecturer")}</div></div>
          <div style="min-width:150px;text-align:end">${x == null ? `<span class="tiny">${T("لم يُحتسب بعد", "Not counted yet")}</span>` : `<b class="num">${pc(x, 1)}</b>${lvBar(x)}`}</div></div>`; }).join("")}</div>`
          : `<p class="tiny" style="margin-top:6px">${T("لا علامات منشورة في هذا المكوّن بعد.", "No published marks in this component yet.")}</p>`}</div>`;
    }).join("");
    return h;
  }

  function pQuizzes() {
    const Q = D.en.quizzes;
    let h = crumb(T("الاختبارات القصيرة", "Quizzes"), T("تُعاد، وتُحتسب أفضل محاولة. في كل محاولة أسئلة مختلفة من الأهداف نفسها", "You can retake them and your best attempt counts. Each attempt draws different questions from the same objectives"));
    if (!Q.length) return h + emptyBox("file", T("لا اختبارات منشورة بعد", "No published quizzes yet"), T("يظهر الاختبار هنا عندما ينشره المحاضر.", "A quiz appears here when your lecturer publishes it."));
    return h + '<div class="panel-grid">' + Q.map((q) => {
      const left = q.quiz.attempts ? q.quiz.attempts - q.used : null, can = q.open && (left == null || left > 0);
      const st = q.pending ? ["open", T("محاولة جارية", "In progress")] : q.open ? ["open", T("مفتوح", "Open")] : (q.open_at && new Date(q.open_at) > new Date() ? ["scheduled", T("يفتح ", "Opens ") + ago(q.open_at)] : ["ended", T("مغلق", "Closed")]);
      return `<div class="card xcard"><div class="row sp"><div class="ttl">${esc(q.title)}</div><span class="pill ${st[0]}">${st[1]}</span></div>
        <div class="tiny" style="margin:6px 0">${qTxt(q.quiz.n)}${q.quiz.minutes ? " · " + minTxt(q.quiz.minutes) : ""} · ${leftTxt(left)}${q.close_at ? " · " + T("يُغلق ", "Closes ") + esc(fmtDT(q.close_at)) : ""}</div>
        <div class="tiny">${T("الأهداف:", "Objectives:")} <span dir="ltr">${(q.quiz.objectives || []).join(T("، ", ", "))}</span></div>
        ${q.best != null ? `<div class="row sp" style="margin-top:8px"><span>${T("أفضل نتيجة", "Best result")} <b class="score num">${pc(q.best)}</b></span><button class="btn sm outline" data-hist="${q.id}">${T("محاولاتي", "My attempts")} (${q.used})</button></div>` : ""}
        ${(can || q.pending) ? `<button class="btn primary block" style="margin-top:10px" data-start="${q.id}">${q.pending ? T("متابعة المحاولة", "Continue attempt") : q.used ? T("محاولة جديدة", "New attempt") : T("ابدأ الاختبار", "Start quiz")}</button>` : ""}</div>`;
    }).join("") + "</div>";
  }

  function pObjectives() {
    const c = D.en.course, O = me().objs || {};
    let h = crumb(T("خريطة أهدافي", "My objectives map"), T("مستواك في كل هدف من أهداف الفصول، من علاماتك في الأسئلة والأجزاء المربوطة به", "Your level in every chapter objective, from your marks on the questions and parts linked to it"));
    h += '<div class="card pad row wrap" style="gap:10px 18px;margin-bottom:14px">' + [1, 2, 3, 4].map((k) => `<span class="lv lv${k}">${LV[k]}</span>`).join("") +
      `<span class="lv lv0">${T("لم يُقَس بعد", "Not measured yet")}</span><span class="tiny">${T("مبتدئ أقل من 50% · نامٍ 50–69% · متمكّن 70–84% · متميّز 85% فأكثر", "Beginning below 50% · Developing 50–69% · Proficient 70–84% · Distinguished 85% and above")}</span></div>`;
    return h + chaptersOf(c).map((ch, i) => {
      const cnt = [0, 0, 0, 0, 0]; ch.objs.forEach((o) => { const v = O[o.code]; cnt[v && +v[1] ? lvOf(v[0] / v[1] * 100) : 0]++; });
      return `<details class="unit" ${i === 0 ? "open" : ""}><summary><div class="ibox">${ic("layers")}</div>
          <div class="grow"><h3>${T("الفصل", "Chapter")} ${ch.ch}: ${esc(ch.title)}</h3><div class="tiny">${T(ch.objs.length + " أهداف · قيس منها " + (ch.objs.length - cnt[0]), ch.objs.length + " objectives · " + (ch.objs.length - cnt[0]) + " measured")}</div></div>
          <div class="dist">${[1, 2, 3, 4].map((k) => `<i class="d${k}" style="width:${(cnt[k] / ch.objs.length) * 100}%"></i>`).join("")}</div></summary>
        ${ch.objs.map((o) => { const v = O[o.code], p = v && +v[1] ? v[0] / v[1] * 100 : null;
          return `<div class="oc"><span class="lbl-chip" dir="ltr">${o.code}</span><span>${esc(pick(o, "text"))}${v ? `<span class="tiny" style="display:block">${nf(+v[0], 2)} ${T("من", "of")} ${nf(+v[1], 2)} · ${pc(p)}</span>` : ""}</span>${lvChip(p)}</div>`; }).join("")}</details>`;
    }).join("");
  }

  function pOutcomes() {
    const c = D.en.course, oc = outcomeMastery(c, me().objs || {});
    return crumb(T("نتاجات المقرر", "Course outcomes"), T("تُجمَّع من أهداف الفصول التابعة لكل نتاج في الخطة الدراسية", "Aggregated from the chapter objectives linked to each outcome in the syllabus")) + '<div class="card list">' +
      oc.map((o) => `<div class="li" style="align-items:flex-start"><div class="grow"><span class="lbl-chip">${o.seq}</span> ${esc(o.text)}<div style="margin-top:8px">${lvBar(o.pct)}</div></div>
        <div style="text-align:end;min-width:90px"><b class="num">${pc(o.pct)}</b><div style="margin-top:4px">${lvChip(o.pct)}</div></div></div>`).join("") + "</div>";
  }

  function pMe() {
    const m = D.home.me;
    return crumb(T("ملفّي", "My profile")) + `<div class="card pad"><div class="row" style="margin-bottom:18px"><span class="avatar" style="width:56px;height:56px;font-size:22px">${esc(firstName(m.full_name).slice(0, 1))}</span>
      <div><h3 style="font-size:19px">${esc(m.full_name)}</h3><div class="tiny">${T("الرقم الجامعي", "University ID")} <span dir="ltr">${esc(m.username)}</span></div></div></div>
      <dl class="kv"><dt>${T("المقرر", "Course")}</dt><dd>${esc(pick(D.en.course, "title"))}</dd><dt>${T("الشعبة", "Section")}</dt><dd>${esc(name(D.en.section))}</dd><dt>${T("الفصل الدراسي", "Term")}</dt><dd>${esc(name(D.en.term))}</dd>
      <dt>${T("الجامعة", "University")}</dt><dd>${T("جامعة فلوريدا العالمية — التعليم المهني والمستمر", "Florida Global University — Professional & Continuing Education")}</dd><dt>${T("المحاضر", "Lecturer")}</dt><dd>${T("سهم هلالات العجارمة", "Sahm Hlalat Al-Ajarmeh")}</dd></dl>
      <button class="btn outline" id="mePw" style="margin-top:14px">${ic("lock", "sm")}${T("تغيير كلمة المرور", "Change password")}</button></div>
      <p class="tiny" style="margin-top:12px">${T("إذا كان في بياناتك خطأ فأبلغ المحاضر ليصحّحه.", "If any of your details are wrong, tell your lecturer so they can correct them.")}</p>`;
  }
  function changePw() {
    const b = openSheet(`<h3>${T("تغيير كلمة المرور", "Change password")}</h3><p class="tiny" style="margin-bottom:12px">${T("8 أحرف على الأقل، فيها حروف إنجليزية وأرقام، وليست رقمك الجامعي.", "At least 8 characters, with English letters and digits, and not your university ID.")}</p>
      <label class="field"><span>${T("الحالية", "Current")}</span><input class="input" id="w0" type="password" dir="ltr"></label>
      <label class="field"><span>${T("الجديدة", "New")}</span><input class="input" id="w1" type="password" dir="ltr"></label>
      <label class="field"><span>${T("تأكيد الجديدة", "Confirm new")}</span><input class="input" id="w2" type="password" dir="ltr"></label>
      <button class="btn primary block" id="wS">${T("حفظ", "Save")}</button>`);
    b.querySelector("#wS").onclick = async (e) => {
      if (b.querySelector("#w1").value !== b.querySelector("#w2").value) return toast(T("كلمتا المرور غير متطابقتين", "The two passwords do not match"), true);
      spin(e.target, true); try { await rpc("fgu_change_password", { p_old: b.querySelector("#w0").value, p_new: b.querySelector("#w1").value }); closeSheet(); toast(T("تغيّرت كلمة المرور", "Password changed")); }
      catch (err) { toast(err.message, true); spin(e.target, false); }
    };
  }
  async function attemptsList(id) {
    let L0; try { L0 = await rpc("s_attempts", { p_assessment: id }); } catch (e) { return toast(e.message, true); }
    const b = openSheet(`<h3>${T("محاولاتي", "My attempts")}</h3><div class="list card">${L0.map((x, i) => `<div class="li"><div><b>${T("المحاولة", "Attempt")} ${i + 1}</b><div class="tiny">${esc(fmtDT(x.submitted_at))}</div></div>
      <span class="row" style="gap:8px"><b class="num">${nf(+x.score, 2)}/${nf(+x.max, 0)}</b><span class="tiny">${x.correct}/${x.total}</span><button class="btn sm outline" data-rv="${x.id}">${T("مراجعة", "Review")}</button></span></div>`).join("")}</div>`);
    b.querySelectorAll("[data-rv]").forEach((r) => (r.onclick = () => review(r.dataset.rv)));
  }
  async function review(id) {
    let r; try { r = await rpc("s_review", { p_attempt: id }); } catch (e) { return toast(e.message, true); }
    openSheet(`<h3>${T("مراجعة:", "Review:")} ${esc(r.title)}</h3><p class="muted"><b class="num">${nf(+r.score, 2)}/${nf(+r.max, 0)}</b> — ${T(r.correct + " صحيحة من " + r.total, r.correct + " correct out of " + r.total)}</p>
      ${r.show_key ? "" : `<div class="tipbox tiny" style="margin:10px 0">${T("تظهر الإجابات الصحيحة والتفسيرات بعد موعد إغلاق الاختبار؛ الآن ترى فقط أي إجاباتك صحيحة.", "Correct answers and explanations appear after the quiz closes; for now you can only see which of your answers are correct.")}</div>`}
      ${r.items.map((it, i) => `<div class="card pad" style="margin-top:10px"><div class="qnum">${T("السؤال", "Question")} ${i + 1} · <span dir="ltr">${it.objective_code}</span> · ${it.is_right ? `<span class="pill open">${T("صحيحة", "Correct")}</span>` : `<span class="pill ended">${it.chosen == null ? T("بلا إجابة", "No answer") : T("خاطئة", "Wrong")}</span>`}</div>
        <div class="stem" dir="rtl">${esc(it.stem)}</div><div class="opts" dir="rtl">${it.options.map((o, j) => `<div class="opt rvo ${it.correct === j || (it.chosen === j && it.is_right) ? "is-ok" : ""} ${it.chosen === j && !it.is_right ? "is-bad" : ""}"><span class="L">${L[j]}</span><span class="grow">${esc(o)}</span></div>`).join("")}</div>
        ${it.explanation ? `<p class="tiny" style="margin-top:8px" dir="rtl">${esc(it.explanation)}</p>` : ""}</div>`).join("")}`, true);
  }

  // ===================== الاختبار القصير =====================
  async function startQuiz(id) {
    const q = D.en.quizzes.find((x) => x.id === id);
    if (!q.pending && !(await confirmSheet(T("ابدأ «" + q.title + "»", "Start “" + q.title + "”"),
      T(`${q.quiz.n} أسئلة${q.quiz.minutes ? " ولديك " + q.quiz.minutes + " دقيقة" : ""}. تُحفظ إجاباتك أولًا بأول، ويُسلَّم الاختبار تلقائيًّا عند انتهاء الوقت.`,
        `${q.quiz.n} questions${q.quiz.minutes ? " and you have " + q.quiz.minutes + " minutes" : ""}. Your answers are saved as you go, and the quiz is submitted automatically when time runs out.`) +
      (en() ? `<div class="tipbox tiny" style="margin-top:10px">The questions are in Arabic, the language of the course book.</div>` : ""),
      T("ابدأ الآن", "Start now")))) return;
    let a; try { a = await rpc("s_start_quiz", { p_assessment: id }); } catch (e) { return toast(e.message, true); }
    X.a = a; X.i = 0; X.flags = {}; X.ans = (a.answers || []).map((v) => (v == null ? null : +v)); X.dirty = false; X.submitting = false;
    X.end = a.deadline ? new Date(a.deadline).getTime() : null;
    $("xTitle").textContent = a.title; $("xSaved").textContent = "—"; show("vExam"); render();
    clearInterval(X.timer); X.timer = setInterval(tick, 1000); tick();
    clearInterval(X.saveT); X.saveT = setInterval(save, 8000);
    window.onbeforeunload = () => { if (X.a) { save(); return T("لم تسلّم الاختبار بعد", "You have not submitted the quiz yet"); } };
  }
  function stopExam() { clearInterval(X.timer); clearInterval(X.saveT); X.a = null; window.onbeforeunload = null; }
  function tick() {
    if (!X.end) { $("xTimer").textContent = "∞"; return; }
    const left = X.end - Date.now(); $("xTimer").textContent = mmss(left); $("xTimer").classList.toggle("low", left < 60000);
    if (left <= 0) submit(true);
  }
  async function save() {
    if (!X.a || !X.dirty) return; X.dirty = false; $("xSaved").textContent = T("جارٍ الحفظ…", "Saving…");
    try { await rpc("s_save_answers", { p_attempt: X.a.attempt_id, p_answers: X.ans }); $("xSaved").textContent = T("حُفظت إجاباتك", "Your answers are saved"); } catch (e) { X.dirty = true; $("xSaved").textContent = T("لم تُحفظ بعد — سنحاول مجددًا", "Not saved yet — we'll try again"); }
  }
  function render() {
    const it = X.a.items, q = it[X.i], n = it.length, answered = X.ans.filter((v) => v != null).length;
    $("xProg").textContent = T("السؤال " + (X.i + 1) + " من " + n + " · أجبت " + answered, "Question " + (X.i + 1) + " of " + n + " · answered " + answered);
    $("xBar").style.width = Math.round((answered / n) * 100) + "%";
    $("xCard").innerHTML = `<div class="qnum">${T("السؤال", "Question")} ${X.i + 1} ${T("من", "of")} ${n}</div><div class="stem" dir="rtl">${esc(q.stem)}</div>` +
      '<div class="opts" role="radiogroup" dir="rtl">' + q.options.map((o, j) => `<button class="opt" role="radio" data-k="${j}" aria-checked="${X.ans[X.i] === j}"><span class="L">${L[j]}</span><span>${esc(o)}</span></button>`).join("") + "</div>";
    $("xCard").querySelectorAll(".opt").forEach((b) => (b.onclick = () => { X.ans[X.i] = +b.dataset.k; X.dirty = true; render(); }));
    $("xPrev").disabled = X.i === 0;
    $("xNext").innerHTML = X.i === n - 1 ? T("المراجعة والتسليم", "Review and submit") + ic("left", "sm") : T("التالي", "Next") + ic("left", "sm");
    $("xFlag").innerHTML = ic("flag", "sm") + (X.flags[X.i] ? T("إلغاء التعليم", "Unflag") : T("علّم للمراجعة", "Flag for review"));
    $("xNav").innerHTML = it.map((x, k) => `<button class="${[X.ans[k] != null ? "done" : "", k === X.i ? "cur" : "", X.flags[k] ? "flag" : ""].join(" ")}" data-q="${k}" aria-label="${T("السؤال", "Question")} ${k + 1}">${k + 1}</button>`).join("");
    $("xNav").querySelectorAll("[data-q]").forEach((b) => (b.onclick = () => { X.i = +b.dataset.q; render(); }));
  }
  $("xPrev").onclick = () => { if (X.i > 0) { X.i--; render(); } };
  $("xNext").onclick = () => { if (X.i < X.a.items.length - 1) { X.i++; render(); } else submit(false); };
  $("xFlag").onclick = () => { X.flags[X.i] = !X.flags[X.i]; render(); };
  $("xSubmit").onclick = () => submit(false);
  async function submit(auto) {
    if (!X.a || X.submitting) return;
    if (!auto) {
      const blank = X.ans.filter((v) => v == null).length;
      if (!(await confirmSheet(T("تسليم الإجابات", "Submit answers"), blank ? T(`بقي ${blank} سؤالًا بلا إجابة. هل تريد التسليم؟`, `${blank} question${blank === 1 ? " is" : "s are"} unanswered. Submit anyway?`) : T("هل تريد تسليم إجاباتك الآن؟", "Submit your answers now?"), T("سلّم", "Submit")))) return;
    }
    X.submitting = true; clearInterval(X.timer); clearInterval(X.saveT);
    try {
      const r = await rpc("s_submit_quiz", { p_attempt: X.a.attempt_id, p_answers: X.ans });
      const aid = X.a.attempt_id, title = X.a.title; stopExam(); result(r, aid, title);
    } catch (e) { X.submitting = false; toast(e.message, true); X.timer = setInterval(tick, 1000); X.saveT = setInterval(save, 8000); }
  }
  function result(r, aid, title) {
    lastResult = [r, aid, title];
    const p = Math.round(r.score / r.max * 100), c = D.en.course;
    $("rTitle").textContent = T("نتيجة: ", "Result: ") + title;
    $("rBody").innerHTML = `<div class="card pad" style="text-align:center"><div class="score-ring" style="--p:${p}"><div><div><b class="num">${nf(+r.score, 2)}/${nf(+r.max, 0)}</b><span class="tiny">${p}%</span></div></div></div>
      <p class="muted">${T(r.correct + " إجابة صحيحة من " + r.total + ". ", r.correct + " correct out of " + r.total + ". ")}${p >= 85 ? T("ممتاز! أنت تتقن هذه الأهداف.", "Excellent! You have mastered these objectives.") : p >= 60 ? T("جيد — راجع أخطاءك ثم أعد المحاولة لترتفع أكثر.", "Good — review your mistakes, then try again to go higher.") : T("لا بأس، راجع الأهداف أدناه ثم أعد المحاولة؛ تُحتسب أفضل محاولة.", "That's okay — review the objectives below and try again; your best attempt counts.")}</p></div>
      <div class="card list" style="margin-top:12px">${Object.entries(r.by_obj).sort().map(([k, v]) => { const q = v[0] / v[1] * 100;
        return `<div class="li" style="align-items:flex-start"><div class="grow"><span class="lbl-chip" dir="ltr">${k}</span> ${esc(objText(c, k))}<div style="margin-top:6px">${lvBar(q)}</div></div><b class="num">${v[0]}/${v[1]}</b></div>`; }).join("")}</div>
      <button class="btn outline block" id="rRev" style="margin-top:12px">${ic("eye", "sm")}${T("مراجعة إجاباتي", "Review my answers")}</button>`;
    $("rRev").onclick = () => review(aid);
    show("vResult");
  }
  $("rBack").onclick = async () => { location.hash = "#/quizzes"; await loadHome(); };

  // تبديل اللغة: إعادة رسم ما على الشاشة باللغة الجديدة
  document.addEventListener("langchange", () => {
    renderChaps();
    if (!$("welcomeBox").classList.contains("hide") && D.home) $("wName").textContent = T("أهلًا، ", "Welcome, ") + firstName(D.home.me.full_name);
    if (D.home && !$("vHome").classList.contains("hide")) route();
    if (X.a && !$("vExam").classList.contains("hide")) render();
    if (lastResult && !$("vResult").classList.contains("hide")) result(...lastResult);
    if ($("sheet") && $("sheet").classList.contains("on")) closeSheet();
  });

  // ===================== البداية =====================
  const s0 = session();
  if (s0 && s0.token && s0.role === "student") { if (s0.must_change) { showSite(); showChange(); } else loadHome(); }
  else showSite();
})();

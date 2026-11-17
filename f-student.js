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
  const X = { a: null, i: 0, ans: [], flags: {}, ar: {}, wr: {}, timer: null, saveT: null, dirty: false, end: null, submitting: false, suspend: 0, vio: 0 };
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
    const [k, arg] = (location.hash || "").replace("#/", "").split("/");
    if (k !== "assignment" && W.a) { const chg = W.local || W.dirty; flushDraft(); W.a = null; if (chg) refreshHome().then(() => { if (!location.hash.startsWith("#/assignment/") && D.home) route(); }); }
    if (!D.en) { $("dash").innerHTML = emptyBox("users", T("لم تُسجَّل في أي مقرر بعد", "You are not enrolled in any course yet"), T("راجع المحاضر ليضيفك إلى شعبتك.", "Ask your lecturer to add you to your section.")); return; }
    if (k === "assignment" && arg) { pAssignment(arg); return; }
    const fn = { marks: pMarks, quizzes: pQuizzes, assignments: pAssignments, objectives: pObjectives, outcomes: pOutcomes, me: pMe, materials: pMaterials, attendance: pAttendance, news: pNews }[k];
    $("dash").innerHTML = fn ? fn() : dashHome();
    wire();
  }
  function wire() {
    const box = $("dash");
    box.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => { location.hash = b.dataset.go ? "#/" + b.dataset.go : ""; }));
    box.querySelectorAll("[data-skin-open]").forEach((b) => (b.onclick = skinPicker));
    box.querySelectorAll("[data-start]").forEach((b) => (b.onclick = () => startQuiz(b.dataset.start)));
    box.querySelectorAll("[data-hist]").forEach((b) => (b.onclick = () => attemptsList(b.dataset.hist)));
    box.querySelectorAll("[data-appeal]").forEach((b) => (b.onclick = () => appeal(b.dataset.appeal)));
    box.querySelectorAll("[data-mdl]").forEach((b) => (b.onclick = () => FF.download({ id: b.dataset.mdl, name: b.dataset.n }, b)));
    box.querySelectorAll("[data-en]").forEach((b) => (b.onclick = () => { D.en = D.home.enrollments.find((x) => x.enrollment_id === b.dataset.en); route(); }));
    const pw = box.querySelector("#mePw"); if (pw) pw.onclick = changePw;
  }
  function crumb(title, sub, back) {
    return `<div class="crumb"><button class="iconbtn" data-go="${back || ""}" aria-label="${T("رجوع", "Back")}">${ic("right")}</button>
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
      <div class="kpis">${F.evalGroups(C.components).map((g) => { const v = F.groupMark(s, g); return `<button class="kpi mkpi" data-go="marks"><span>${esc(g.title)}</span><b class="num">${v != null ? nf(v, 1) : "—"}</b><small>${T("من", "of")} ${nf(g.weight, 0)}</small></button>`; }).join("")}
        <button class="kpi mkpi" data-go="marks"><span>${T("المجموع", "Total")}</span><b class="num">${s.total != null ? nf(s.total, 1) : "—"}</b><small>${s.wsofar ? T("من " + nf(s.wsofar, 0) + " محتسبة حتى الآن", "of " + nf(s.wsofar, 0) + " counted so far") : T("من 100 — لم تُرصد علامات بعد", "of 100 — no marks yet")}</small></button></div>
      <div class="kpis sm">
        <div class="kpi"><b class="num">${best.length ? pc(Math.max(...best)) : "—"}</b><span>${T("أفضل نتيجة في اختبار قصير", "Best quiz result")}</span></div>
        <div class="kpi"><b class="num">${qs.reduce((a, q) => a + q.used, 0)}</b><span>${T("محاولة سلّمتها", "Attempts submitted")}</span></div>
        <div class="kpi"><b class="num">${objs.length ? mastered + "/" + objs.length : "—"}</b><span>${T("أهداف أتقنتها", "Objectives mastered")}</span></div>
      </div></section>`;
    const anns = D.en.announcements || [];
    if (anns.length) out += `<div class="card pad ann" style="margin-bottom:14px"><div class="row sp"><b>${ic("bell", "sm")} ${T("إعلانات المحاضر", "Announcements")}</b>${anns.length > 2 ? `<button class="btn sm ghost" data-go="news">${T("كل الإعلانات", "All announcements")} (${anns.length})</button>` : ""}</div>
      ${anns.slice(0, 2).map((a) => `<div class="ann-i">${a.pinned ? `<span class="pill warn">${T("مثبّت", "Pinned")}</span> ` : ""}<b>${esc(a.title)}</b> <span class="tiny">${esc(ago(a.created_at))}</span>${a.body ? `<div class="tiny" style="white-space:pre-wrap;margin-top:4px">${esc(a.body)}</div>` : ""}</div>`).join("")}</div>`;
    const myAtt = me().att, ST = D.en.settings || {};
    if (myAtt && myAtt.abs_pct != null && +myAtt.abs_pct >= +ST.att_warn1) out += `<div class="card pad" style="margin-bottom:14px;border-color:var(--danger)">${ic("alert", "sm")} <b>${attLevel(+myAtt.abs_pct)}</b> — ${T("نسبة غيابك " + nf(+myAtt.abs_pct, 1) + "٪.", "Your absence rate is " + nf(+myAtt.abs_pct, 1) + "%.")} <button class="btn sm ghost" data-go="attendance">${T("التفاصيل", "Details")}</button></div>`;
    if (D.home.enrollments.length > 1) out += `<div class="card pad row wrap" style="margin-bottom:14px;gap:8px"><span class="tiny">${T("مقرراتي:", "My courses:")}</span>${D.home.enrollments.map((x) => `<button class="btn sm ${x.enrollment_id === D.en.enrollment_id ? "primary" : "outline"}" data-en="${x.enrollment_id}">${esc(pick(x.course, "title"))} · ${esc(name(x.term))}</button>`).join("")}</div>`;
    openQ().forEach((q) => {
      const left = q.quiz.attempts ? q.quiz.attempts - q.used : null;
      out += `<div class="spot"><div class="ibox">${ic("play", "lg")}</div>
        <div><span class="pill open">${q.pending ? T("محاولة جارية", "Attempt in progress") : T("مفتوح الآن", "Open now")}</span><h3 style="margin-top:6px">${esc(q.title)}</h3>
          <div class="meta"><span>${T("اختبار قصير", "Quiz")}</span><span>${qTxt(q.quiz.n)}</span>${q.quiz.minutes ? `<span>${minTxt(q.quiz.minutes)}</span>` : ""}<span>${leftTxt(left)}</span>
          ${q.close_at ? `<span>${T("يُغلق", "Closes")} <b class="cd">${ago(q.close_at)}</b></span>` : ""}${q.best != null ? `<span>${T("أفضل نتيجة", "Best result")} ${pc(q.best)}</span>` : ""}</div></div>
        <div><button class="btn primary lg" data-start="${q.id}">${q.pending ? T("متابعة", "Continue") : q.used ? T("محاولة جديدة", "New attempt") : T("ابدأ الاختبار", "Start quiz")}${ic("left", "sm")}</button></div></div>`;
    });
    asgTodo().forEach((a) => {
      const due = a.state.due || a.close_at, re = a.state.reopen;
      out += `<div class="spot"><div class="ibox gold">${ic(re ? "refresh" : "inbox", "lg")}</div>
        <div><span class="pill ${a.state.late_now ? "warn" : "open"}">${re ? T("مطلوب إعادة التسليم", "Resubmission requested") : a.dirty ? T("مسودة لم تُسلَّم", "Draft not submitted") : a.state.late_now ? T("متأخر — ما زال مقبولًا", "Late — still accepted") : T("واجب مطلوب", "Assignment due")}</span><h3 style="margin-top:6px">${esc(a.title)}</h3>
          <div class="meta"><span>${esc(comp({ key: a.component_key, title: a.component }))}</span>${due ? `<span>${T("التسليم", "Due")} <b class="cd">${esc(ago(re ? a.reopen_until : due))}</b></span>` : ""}</div></div>
        <div><button class="btn primary lg" data-go="assignment/${a.id}">${a.version || a.dirty ? T("أكمل", "Continue") : T("ابدأ", "Start")}${ic("left", "sm")}</button></div></div>`;
    });
    // توصية: أضعف الأهداف
    const weak = objs.map(([k, v]) => [k, v[0] / v[1] * 100]).sort((a, b) => a[1] - b[1]).filter((x) => x[1] < 70).slice(0, 3);
    if (weak.length) out += `<div class="smart">${ic("spark")}<div class="grow"><b>${T("ابدأ مراجعتك من هنا", "Start your review here")}</b>
      <ul class="tshort">${weak.map(([k, p]) => `<li><b>${T("الهدف", "Objective")} ${k}</b><span class="tiny"> — ${esc(objText(c, k))} (${pc(p)})</span></li>`).join("")}</ul>
      <button class="btn sm primary" data-go="objectives" style="margin-top:8px">${T("خريطة أهدافي كاملة", "My full objectives map")}</button></div></div>`;
    const tiles = [
      ["quizzes", "file", T("الاختبارات", "Quizzes & exams"), openQ().length ? T("اختبار مفتوح الآن — ادخل وابدأ", "A quiz is open now — go in and start") : T("الاختبارات المفتوحة والسابقة ومحاولاتك", "Open and past quizzes and your attempts"), openQ().length || null, !!openQ().length],
      ["assignments", "inbox", T("الواجبات", "Assignments"), asgTodo().length ? T(asgTodo().length + " واجب بانتظار تسليمك", asgTodo().length + " assignment(s) waiting for you") : asgs().length ? T("واجباتك وتسليماتك وملاحظات المحاضر", "Your assignments, submissions and feedback") : T("لا واجبات منشورة بعد", "No published assignments yet"), asgTodo().length || null, !!asgTodo().length],
      ["marks", "award", T("علاماتي", "My marks"), s.total != null ? T("مجموعك حتى الآن " + nf(s.total, 1) + " من " + nf(s.wsofar || 0, 0), "Your total so far: " + nf(s.total, 1) + " of " + nf(s.wsofar || 0, 0)) : T("لم تُرصد علامات بعد", "No marks yet"), null],
      ["materials", "book", T("المحاضرات والمواد", "Lectures & materials"), (D.en.materials || []).length ? T((D.en.materials || []).length + " مادة من المحاضر", (D.en.materials || []).length + " item(s) from your lecturer") : T("الشرائح والملخصات والروابط", "Slides, summaries and links"), null],
      ["attendance", "cal", T("حضوري ومشاركتي", "My attendance"), me().att ? T("غياب " + nf(+me().att.abs_pct || 0, 1) + "٪ · مشاركة " + (me().part == null ? "—" : pc(me().part)), "Absence " + nf(+me().att.abs_pct || 0, 1) + "% · participation " + (me().part == null ? "—" : pc(me().part))) : T("لم يُرصد الحضور بعد", "No attendance recorded yet"), null],
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
    const best = D.en.calc.obj_rule === "latest" ? T("أحدث", "latest") : T("أعلى", "best");
    let h = crumb(T("علاماتي", "My marks"), T("التقويم الأول (المنتصف) + التقويم الثاني الأدائي + الاختبار النهائي = 100. في المشاركة والمهام والكويزات يُحتسب " + best + " قياس لك في كل هدف، ثم متوسط الأهداف × وزن المكوّن",
      "First assessment (midterm) + second assessment (performance) + final exam = 100. In participation & tasks and in quizzes, your " + best + " result on each objective counts, then the average of objectives × the component weight"));
    h += `<div class="card pad"><div class="row sp wrap"><div><span class="tiny">${T("مجموعك الآن", "Your total now")}</span><div class="hero-n num">${s.total != null ? nf(s.total, 1) : "—"} <small>${T("من", "of")} ${s.wsofar ? nf(s.wsofar, 0) : 100}</small></div></div>
      <span class="tiny" style="max-width:340px">${s.wsofar ? T("«من» = مجموع أوزان المكوّنات التي فيها علامات محتسبة حتى الآن. يكتمل إلى 100 بنهاية الفصل.", "“of” = the total weight of the components with counted marks so far. It reaches 100 by the end of the term.") : T("لم تُرصد علامات بعد.", "No marks yet.")}</span></div></div>`;
    const grpHead = (k) => { const g = F.evalGroups(C.components).find((x) => x.comps[0].id === k.id); if (!g) return ""; const v = F.groupMark(s, g);
      return `<div class="row sp" style="margin-top:18px;padding-inline:6px"><h3 style="font-size:17px">${esc(g.title)}</h3><b class="num">${v != null ? nf(v, 1) : "—"} / ${nf(g.weight, 0)}</b></div>`; };
    h += C.components.map((k) => grpHead(k) + (() => {
      const A = C.assessments.filter((a) => a.component_id === k.id), v = s.comps[k.id];
      return `<div class="card pad" style="margin-top:12px"><div class="row sp"><h3 style="font-size:16px">${esc(comp(k))}</h3><span class="row" style="gap:8px"><span class="pill">${T("الوزن", "Weight")} ${nf(+k.weight, 0)}%</span>${v != null ? `<b class="num">${nf(v * k.weight / 100, 1)} / ${nf(+k.weight, 0)}</b>` : ""}</span></div>
        ${k.kind === "tasks" && s.part != null ? `<div class="tiny" style="margin-top:6px">${T("المشاركة في المحاضرات: ", "Class participation: ")}<b>${pc(s.part)}</b> — ${T("تمثّل " + nf(+(D.en.settings || {}).part_weight || 0, 0) + "٪ من هذا المكوّن", "counts for " + nf(+(D.en.settings || {}).part_weight || 0, 0) + "% of this component")} <a href="#/attendance">${T("التفاصيل", "Details")}</a></div>` : ""}
        ${A.length ? `<div class="list" style="margin-top:8px">${A.map((a) => { const x = s.items[a.id]; return `<div class="li"><div><b>${esc(a.title)}</b><div class="tiny">${a.kind === "quiz" ? T("اختبار قصير إلكتروني", "Online quiz") : a.kind === "exam" ? T("اختبار على المنصة", "Online exam") : a.kind === "assignment" ? T("واجب على المنصة — يُصحَّح بروبرك", "Platform assignment — graded with a rubric") : T("تقويم يرصده المحاضر", "Assessment marked by the lecturer")}</div>${x != null ? appealTag(a) : ""}</div>
          <div style="min-width:150px;text-align:end">${x == null ? `<span class="tiny">${T("لم يُحتسب بعد", "Not counted yet")}</span>` : `<b class="num">${pc(x, 1)}</b>${lvBar(x)}`}</div></div>`; }).join("")}</div>`
          : `<p class="tiny" style="margin-top:6px">${T("لا علامات منشورة في هذا المكوّن بعد.", "No published marks in this component yet.")}</p>`}</div>`;
    })()).join("");
    if (s.adjust) h += `<div class="card pad tiny" style="margin-top:12px">${T("تعديل نهائي من المحاضر: ", "Final adjustment by your lecturer: ")}<b class="num">${s.adjust > 0 ? "+" : ""}${nf(+s.adjust, 2)}</b>${s.adjust_reason ? " — " + esc(s.adjust_reason) : ""}</div>`;
    const ap = D.en.appeals || [];
    if (ap.length) h += `<div class="sect"><h3>${ic("chat", "sm")} ${T("اعتراضاتي", "My appeals")}</h3><div class="list card">${ap.map((x) => `<div class="li" style="align-items:flex-start"><div class="grow"><b>${esc(x.title)}</b> <span class="pill ${x.status === "open" ? "warn" : x.status === "accepted" ? "open" : "ended"}">${x.status === "open" ? T("قيد المراجعة", "Under review") : x.status === "accepted" ? T("مقبول", "Accepted") : T("مرفوض", "Rejected")}</span>
      <div class="tiny" style="margin-top:4px">${esc(x.reason)}</div>${x.reply ? `<div class="tipbox tiny" style="margin-top:6px">${T("ردّ المحاضر: ", "Lecturer's reply: ")}${esc(x.reply)}</div>` : ""}</div><span class="tiny">${esc(ago(x.created_at))}</span></div>`).join("")}</div></div>`;
    return h;
  }
  // الاعتراض: خلال مهلة من نشر العلامة، اعتراض مفتوح واحد لكل علامة
  function appealTag(a) {
    const ap = (D.en.appeals || []).filter((x) => x.assessment_id === a.id), open = ap.find((x) => x.status === "open");
    if (open) return `<span class="pill warn" style="margin-top:4px">${T("اعتراضك قيد المراجعة", "Appeal under review")}</span>`;
    const days = +(D.en.settings || {}).appeal_days || 0, rel = a.released_at ? new Date(a.released_at).getTime() : null;
    if (!days || !rel || Date.now() > rel + days * 864e5) return ap.length ? `<span class="tiny">${T("اعتُرض عليها", "Appealed")}</span>` : "";
    return `<button class="btn sm ghost" data-appeal="${a.id}" style="margin-top:4px;padding-inline:8px">${ic("chat", "sm")}${T("اعتراض", "Appeal")} <span class="tiny">(${T("حتى ", "until ")}${esc(fmtDT(new Date(rel + days * 864e5).toISOString(), false))})</span></button>`;
  }
  function appeal(aid) {
    const a = D.en.calc.assessments.find((x) => x.id === aid);
    const b = openSheet(`<h3>${T("اعتراض على علامة: ", "Appeal a mark: ")}${esc(a.title)}</h3><p class="tiny" style="margin-bottom:10px">${T("اكتب بوضوح ما تعتقد أنه خطأ في التصحيح، ورقم السؤال أو المعيار. يصل اعتراضك إلى المحاضر ويردّ عليه، ويبقى في سجلّك.", "Explain clearly what you think was marked incorrectly, with the question or criterion number. Your lecturer will reply, and it stays on record.")}</p>
      <textarea class="input" id="apR" rows="5" dir="auto"></textarea><button class="btn primary block" id="apGo" style="margin-top:10px">${T("إرسال الاعتراض", "Submit appeal")}</button>`);
    b.querySelector("#apGo").onclick = async (e) => { spin(e.target, true); try { await rpc("s_appeal", { p_assessment: aid, p_reason: b.querySelector("#apR").value }); closeSheet(); toast(T("أُرسل اعتراضك", "Your appeal was sent")); await refreshHome(); route(); } catch (x) { toast(x.message, true); spin(e.target, false); } };
  }
  const fmtD = (d) => new Intl.DateTimeFormat(en() ? "en-GB" : "ar-JO-u-nu-latn", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d + "T00:00:00Z"));
  const attLevel = (p) => { const S0 = D.en.settings || {}; return p >= +S0.att_deny ? T("تجاوزت حد الحرمان", "Over the denial limit") : p >= +S0.att_warn2 ? T("إنذار ثانٍ بالغياب", "Second absence warning") : p >= +S0.att_warn1 ? T("إنذار أول بالغياب", "First absence warning") : ""; };
  function pAttendance() {
    const s = me(), A0 = s.att, S0 = D.en.settings || {}, L0 = D.en.lectures || [];
    let h = crumb(T("حضوري ومشاركتي", "My attendance & participation"), T("يرصدها المحاضر بعد كل محاضرة من كشف الجامعة", "Recorded by your lecturer after each lecture from the university report"));
    if (!A0 || !L0.length) return h + emptyBox("cal", T("لم يُرصد الحضور بعد", "No attendance recorded yet"), "");
    const lv = attLevel(+A0.abs_pct || 0);
    h += `<div class="stbox card pad"><div><span>${T("حضور", "Present")}</span><b>${A0.p}</b></div><div><span>${T("تأخير", "Late")}</span><b>${A0.l}</b></div><div><span>${T("غياب", "Absent")}</span><b>${A0.a}</b></div><div><span>${T("غياب بعذر", "Excused")}</span><b>${A0.e}</b></div>
      <div><span>${T("نسبة الغياب", "Absence rate")}</span><b style="${lv ? "color:var(--danger)" : ""}">${nf(+A0.abs_pct || 0, 1)}%</b></div><div><span>${T("المشاركة", "Participation")}</span><b>${s.part == null ? "—" : pc(s.part)}</b></div></div>`;
    h += `<div class="tipbox tiny" style="margin-top:12px">${lv ? "<b>" + esc(lv) + "</b>. " : ""}${T(`الإنذار الأول عند ${nf(+S0.att_warn1, 0)}٪ غياب، والثاني عند ${nf(+S0.att_warn2, 0)}٪، والحرمان عند ${nf(+S0.att_deny, 0)}٪. المشاركة: كل مداخلة (سؤال أو إجابة أو تعليق) نقطة، وكل ${nf(+S0.part_min_per_point, 0)} دقيقة مداخلة نقطة، والعلامة الكاملة ${nf(+S0.part_target, 0)} نقطة في المحاضرة.`,
      `First warning at ${nf(+S0.att_warn1, 0)}% absence, second at ${nf(+S0.att_warn2, 0)}%, denial at ${nf(+S0.att_deny, 0)}%. Participation: each contribution (question, answer or comment) is a point, every ${nf(+S0.part_min_per_point, 0)} minutes of speaking is a point, and full marks are ${nf(+S0.part_target, 0)} points per lecture.`)}</div>`;
    const SL = { P: [T("حاضر", "Present"), "open"], L: [T("متأخر", "Late"), "warn"], A: [T("غائب", "Absent"), "ended"], E: [T("بعذر", "Excused"), ""] };
    h += `<div class="list card" style="margin-top:12px">${L0.slice().reverse().map((l) => `<div class="li"><div><b>${esc(fmtD(l.held_on))}</b>${l.topic ? `<div class="tiny">${esc(l.topic)}</div>` : ""}</div>
      <span class="row" style="gap:8px">${+l.contrib || +l.contrib_min ? `<span class="tiny">${T("مداخلات ", "Contributions ")}${l.contrib}${+l.contrib_min ? " · " + nf(+l.contrib_min, 1) + T(" د", " min") : ""}</span>` : ""}<span class="pill ${SL[l.status][1]}">${SL[l.status][0]}</span></span></div>`).join("")}</div>`;
    return h;
  }
  function pMaterials() {
    const M0 = D.en.materials || [];
    let h = crumb(T("المحاضرات والمواد", "Lectures & materials"), T("الشرائح والملخصات والروابط التي ينشرها المحاضر", "Slides, summaries and links published by your lecturer"));
    if (!M0.length) return h + emptyBox("book", T("لا مواد منشورة بعد", "No materials published yet"), "");
    const by = {}; M0.forEach((m) => (by[m.chapter || 0] = by[m.chapter || 0] || []).push(m));
    return h + Object.keys(by).sort((a, b) => (+a || 99) - (+b || 99)).map((ch) => `<div class="sect"><h3>${+ch ? T("الفصل ", "Chapter ") + ch : T("عام", "General")}</h3><div class="list card">${by[ch].map((m) => `<div class="li" style="align-items:flex-start"><div class="grow"><b>${esc(m.title)}</b>
      ${m.url ? `<div><a href="${esc(m.url)}" target="_blank" rel="noopener" class="tiny" dir="ltr">${esc(m.url.length > 60 ? m.url.slice(0, 60) + "…" : m.url)}</a></div>` : ""}
      ${m.files.length ? `<div class="flist" style="margin-top:6px">${m.files.map((f) => `<div class="frow">${FF.badge(f)}<span class="nm">${esc(f.name)}</span><span class="sz">${FF.size(f.size)}</span><button class="btn sm ghost" data-mdl="${f.id}" data-n="${esc(f.name)}">${ic("download", "sm")}</button></div>`).join("")}</div>` : ""}</div><span class="tiny">${esc(ago(m.created_at))}</span></div>`).join("")}</div></div>`).join("");
  }
  function pNews() {
    const A0 = D.en.announcements || [];
    return crumb(T("الإعلانات", "Announcements")) + (A0.length ? `<div class="list card">${A0.map((a) => `<div class="li" style="align-items:flex-start"><div class="grow">${a.pinned ? `<span class="pill warn">${T("مثبّت", "Pinned")}</span> ` : ""}<b>${esc(a.title)}</b>${a.body ? `<div style="white-space:pre-wrap;margin-top:4px">${esc(a.body)}</div>` : ""}</div><span class="tiny">${esc(fmtDT(a.created_at, false))}</span></div>`).join("")}</div>` : emptyBox("bell", T("لا إعلانات", "No announcements"), ""));
  }

  function pQuizzes() {
    const Q = D.en.quizzes;
    let h = crumb(T("الاختبارات", "Quizzes & exams"), T("الاختبارات القصيرة واختبارا المنتصف والنهائي — كلها مراقَبة. في كل محاولة أسئلة مختلفة من الأهداف نفسها", "Quizzes, midterm and final — all proctored. Each attempt draws different questions from the same objectives"));
    if (!Q.length) return h + emptyBox("file", T("لا اختبارات منشورة بعد", "No published quizzes yet"), T("يظهر الاختبار هنا عندما ينشره المحاضر.", "A quiz appears here when your lecturer publishes it."));
    return h + '<div class="panel-grid">' + Q.map((q) => {
      const left = q.quiz.attempts ? q.quiz.attempts - q.used : null, can = q.open && (left == null || left > 0);
      const st = q.pending ? ["open", T("محاولة جارية", "In progress")] : q.open ? ["open", T("مفتوح", "Open")] : (q.open_at && new Date(q.open_at) > new Date() ? ["scheduled", T("يفتح ", "Opens ") + ago(q.open_at)] : ["ended", T("مغلق", "Closed")]);
      const exam = q.kind === "exam";
      return `<div class="card xcard"><div class="row sp"><div class="ttl">${esc(q.title)}</div><span class="pill ${st[0]}">${st[1]}</span></div>
        <div class="tiny" style="margin:6px 0">${exam ? `<b>${esc(comp({ key: q.component_key, title: q.component }))}</b> · ` : ""}${q.quiz.n ? qTxt(q.quiz.n) : ""}${q.quiz.nw ? (q.quiz.n ? " + " : "") + T(q.quiz.nw + " مسائل مكتوبة", q.quiz.nw + " written problems") : ""}${q.quiz.minutes ? " · " + minTxt(q.quiz.minutes) : ""} · ${exam ? T("محاولة واحدة", "One attempt") : leftTxt(left)}${q.close_at ? " · " + T("يُغلق ", "Closes ") + esc(fmtDT(q.close_at)) : ""}</div>
        <div class="tiny">${T("الأهداف:", "Objectives:")} <span dir="ltr">${(q.quiz.objectives || []).join(T("، ", ", "))}</span> · ${ic("shield", "sm")} ${T("مراقَب", "Proctored")}</div>
        ${q.best != null ? `<div class="row sp" style="margin-top:8px"><span>${exam ? T("علامتك", "Your mark") : T("أفضل نتيجة", "Best result")} <b class="score num">${pc(q.best)}</b></span><button class="btn sm outline" data-hist="${q.id}">${T("محاولاتي", "My attempts")} (${q.used})</button></div>`
          : q.used ? `<div class="row sp" style="margin-top:8px"><span class="tiny">${exam ? T("سلّمت — تظهر العلامة بعد التصحيح والنشر", "Submitted — your mark appears after grading and release") : ""}</span><button class="btn sm outline" data-hist="${q.id}">${T("محاولاتي", "My attempts")} (${q.used})</button></div>` : ""}
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
    const b = openSheet(`<h3>${T("محاولاتي", "My attempts")}</h3><div class="list card">${L0.map((x, i) => `<div class="li"><div><b>${T("المحاولة", "Attempt")} ${i + 1}</b><div class="tiny">${esc(fmtDT(x.submitted_at))}${x.auto === "violations" ? " · " + T("سُلِّمت تلقائيًّا للمخالفات", "auto-submitted for violations") : ""}</div></div>
      <span class="row" style="gap:8px">${x.score == null ? `<span class="tiny">${T("بانتظار نشر النتيجة", "Awaiting results")}</span>` : `<b class="num">${nf(+x.score, 2)}/${nf(+x.max, 0)}</b>`}${x.correct != null ? `<span class="tiny">${x.correct}/${x.total}</span>` : ""}${x.score == null ? "" : `<button class="btn sm outline" data-rv="${x.id}">${T("مراجعة", "Review")}</button>`}</span></div>`).join("")}</div>`);
    b.querySelectorAll("[data-rv]").forEach((r) => (r.onclick = () => review(r.dataset.rv)));
  }
  // نص السؤال باللغة المختارة (والبديل العربي إن لم تتوفر الترجمة)
  const qText = (it, ar) => (!ar && en() && it.stem_en ? it.stem_en : it.stem);
  const qOpts = (it, ar) => (!ar && en() && it.options_en ? it.options_en : it.options);
  const qDir = (it, ar) => (!ar && en() && it.stem_en ? "ltr" : "rtl");
  async function review(id) {
    let r; try { r = await rpc("s_review", { p_attempt: id }); } catch (e) { return toast(e.message, true); }
    const exam = r.kind === "exam";
    openSheet(`<h3>${T("مراجعة:", "Review:")} ${esc(r.title)}</h3><p class="muted"><b class="num">${nf(+r.score, 2)}/${nf(+r.max, 0)}</b>${r.correct != null ? ` — ${T(r.correct + " صحيحة من " + r.total, r.correct + " correct out of " + r.total)}` : ""}</p>
      ${r.show_marks ? (r.show_key ? "" : `<div class="tipbox tiny" style="margin:10px 0">${T("تظهر الإجابات الصحيحة والتفسيرات بعد موعد إغلاق الاختبار.", "Correct answers and explanations appear after the quiz closes.")}</div>`)
        : `<div class="tipbox tiny" style="margin:10px 0">${T("يظهر الصحيح والخطأ والإجابات الصحيحة بعد موعد إغلاق الاختبار؛ الآن ترى إجاباتك فقط.", "Which answers are right, and the correct answers, appear after the quiz closes; for now you see only your answers.")}</div>`}
      ${r.items.map((it, i) => `<div class="card pad" style="margin-top:10px"><div class="qnum">${T("السؤال", "Question")} ${i + 1} · <span dir="ltr">${it.objective_code}</span>${it.is_right == null ? "" : " · " + (it.is_right ? `<span class="pill open">${T("صحيحة", "Correct")}</span>` : `<span class="pill ended">${it.chosen == null ? T("بلا إجابة", "No answer") : T("خاطئة", "Wrong")}</span>`)}${exam && it.pts != null ? ` · <span class="pill warn">${T("عدّل المحاضر علامته: ", "Adjusted by the lecturer: ")}${nf(+it.pts, 2)}</span>` : ""}</div>
        <div class="stem" dir="${qDir(it)}">${esc(qText(it))}</div><div class="opts" dir="${qDir(it)}">${qOpts(it).map((o, j) => `<div class="opt rvo ${it.correct === j || (it.chosen === j && it.is_right) ? "is-ok" : ""} ${it.chosen === j && it.is_right === false ? "is-bad" : ""} ${it.chosen === j && it.is_right == null ? "is-mine" : ""}"><span class="L">${L[j]}</span><span class="grow">${esc(o)}</span></div>`).join("")}</div>
        ${it.explanation ? `<p class="tiny" style="margin-top:8px" dir="${en() && it.explanation_en ? "ltr" : "rtl"}">${esc(en() && it.explanation_en ? it.explanation_en : it.explanation)}</p>` : ""}</div>`).join("")}
      ${(r.written || []).map((w, i) => `<div class="card pad" style="margin-top:10px"><div class="qnum">${T("مسألة", "Problem")} ${i + 1} · <b class="num">${w.pts == null ? "—" : nf(+w.pts, 2)}/${nf(+w.max, 2)}</b></div>
        <div class="stem" dir="${en() && w.q_en ? "ltr" : "rtl"}">${esc(en() && w.q_en ? w.q_en : w.q)}</div><div class="anstext" style="margin-top:8px">${esc(w.text || "—")}</div>
        ${w.c ? `<div class="tipbox tiny" style="margin-top:8px">${ic("chat", "sm")} ${esc(w.c)}</div>` : ""}</div>`).join("")}`, true);
  }

  // ===================== الاختبارات (القصيرة والمنتصف والنهائي) مع المراقبة =====================
  const DEV = (() => { try { let d = localStorage.getItem("fgu_dev"); if (!d) { d = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); localStorage.setItem("fgu_dev", d); } return d; } catch (e) { return null; } })();
  const KIND_TXT = { fs_exit: ["الخروج من ملء الشاشة", "Leaving full screen"], hidden: ["مغادرة صفحة الاختبار", "Leaving the quiz page"], devtools: ["فتح أدوات المطوّر", "Opening developer tools"], multi: ["فتح الاختبار من جهاز آخر", "Opening the quiz on another device"] };
  async function startQuiz(id) {
    const q = D.en.quizzes.find((x) => x.id === id), exam = q.kind === "exam", pr = q.quiz.proctor || {}, nw = q.quiz.nw || 0;
    const rules = [pr.fullscreen ? T("يعمل الاختبار بملء الشاشة", "The quiz runs in full screen") : "", T("تُسجَّل مغادرة صفحة الاختبار", "Leaving the quiz page is recorded"),
      pr.block_copy ? T("النسخ واللصق ممنوعان", "Copy and paste are disabled") : "", pr.single_device ? T("من جهاز واحد فقط", "One device only") : "",
      +pr.max_violations ? T("يُسلَّم تلقائيًّا بعد " + pr.max_violations + " مخالفات", "Auto-submitted after " + pr.max_violations + " violations") : ""].filter(Boolean);
    if (!q.pending && !(await confirmSheet(T("ابدأ «" + q.title + "»", "Start “" + q.title + "”"),
      T(`${q.quiz.n ? q.quiz.n + " أسئلة اختيار من متعدد" : ""}${q.quiz.n && nw ? " و" : ""}${nw ? nw + " مسائل مكتوبة" : ""}${q.quiz.minutes ? " ولديك " + q.quiz.minutes + " دقيقة" : ""}. تُحفظ إجاباتك أولًا بأول، ويُسلَّم تلقائيًّا عند انتهاء الوقت.${exam ? " لديك محاولة واحدة." : ""}`,
        `${q.quiz.n ? q.quiz.n + " multiple-choice questions" : ""}${q.quiz.n && nw ? " and " : ""}${nw ? nw + " written problems" : ""}${q.quiz.minutes ? "; you have " + q.quiz.minutes + " minutes" : ""}. Your answers are saved as you go, and it is submitted automatically when time runs out.${exam ? " You have one attempt." : ""}`) +
      `<div class="tipbox tiny" style="margin-top:10px"><b>${T("الاختبار مراقَب:", "This quiz is proctored:")}</b> ${esc(rules.join(T("، ", " · ")))}.</div>`,
      T("ابدأ الآن", "Start now")))) return;
    if (pr.fullscreen) fsEnter();
    let a; try { a = await rpc("s_start_quiz", { p_assessment: id, p_device: DEV }); } catch (e) { fsLeave(); return toast(e.message, true); }
    if (a.blocked) { fsLeave(); return toast(I18N.err(a.message), true); }
    Object.assign(X, { a, i: 0, flags: {}, ar: {}, ans: (a.answers || []).map((v) => (v == null ? null : +v)), wr: a.written || {}, dirty: false, submitting: false, hidAt: null, suspend: 0, vio: a.violations || 0 });
    X.end = a.deadline ? new Date(a.deadline).getTime() : null;
    $("xTitle").textContent = a.title; $("xSaved").textContent = "—"; show("vExam"); render(); proctorOn();
    clearInterval(X.timer); X.timer = setInterval(tick, 1000); tick();
    clearInterval(X.saveT); X.saveT = setInterval(save, 8000);
    window.onbeforeunload = () => { if (X.a) { save(); return T("لم تسلّم الاختبار بعد", "You have not submitted the quiz yet"); } };
  }
  function stopExam() { clearInterval(X.timer); clearInterval(X.saveT); proctorOff(); X.a = null; window.onbeforeunload = null; fsLeave(); }
  // ── المراقبة ──
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  function fsEnter() { const d = document.documentElement, f = d.requestFullscreen || d.webkitRequestFullscreen; try { const p = f && f.call(d); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
  function fsLeave() { try { if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { } }
  const PR = () => (X.a && X.a.proctor) || {};
  const quiet = () => Date.now() < X.suspend;   // نافذة اختيار ملف/كاميرا مفتوحة (رفع صورة الحل)
  async function report(kind, detail) {
    if (!X.a || X.submitting) return;
    if (quiet() && kind !== "devtools") kind = "blur";   // لا تُحتسب مخالفة أثناء اختيار صورة الحل
    try {
      const r = await rpc("s_event", { p_attempt: X.a.attempt_id, p_kind: kind, p_detail: detail || null });
      if (r.submitted) { const aid = X.a.attempt_id, title = X.a.title, exam = X.a.kind === "exam"; stopExam(); autoDone(aid, title, exam); return; }
      if (r.violations > X.vio) { X.vio = r.violations; warnV(kind, r.violations, r.max); }
    } catch (e) { }
  }
  function warnV(kind, n, mx) {
    const t = KIND_TXT[kind] || ["مخالفة", "Violation"];
    $("xWarn").innerHTML = `<div class="xw-box">${ic("alert", "lg")}<h3>${T("مخالفة مسجّلة: ", "Violation recorded: ")}${esc(T(t[0], t[1]))}</h3>
      <p>${mx ? T(`المخالفة ${n} من ${mx}؛ عند ${mx} يُسلَّم اختبارك تلقائيًّا.`, `Violation ${n} of ${mx}; at ${mx} your quiz is submitted automatically.`) : T("سُجّلت ويطّلع عليها المحاضر.", "It has been recorded for your lecturer.")}</p>
      <button class="btn primary" id="xWarnOk">${PR().fullscreen ? T("متابعة بملء الشاشة", "Continue in full screen") : T("متابعة", "Continue")}</button></div>`;
    $("xWarn").classList.remove("hide");
    $("xWarnOk").onclick = () => { $("xWarn").classList.add("hide"); if (PR().fullscreen) fsEnter(); };
  }
  const H = {};
  function proctorOn() {
    const p = PR();
    H.vis = () => { if (document.hidden) X.hidAt = Date.now(); else if (X.hidAt) { const s = Math.round((Date.now() - X.hidAt) / 1000); X.hidAt = null; if (s >= 1 || !quiet()) report("hidden", T("مدة الغياب " + s + " ثانية", "Away for " + s + " s")); } };
    H.blur = () => setTimeout(() => { if (!document.hidden && X.a) report("blur", "النافذة فقدت التركيز"); }, 300);
    H.fs = () => { if (p.fullscreen && !fsEl() && X.a && !X.submitting) report("fs_exit", "خروج من ملء الشاشة"); };
    H.ctx = (e) => { if (!X.a) return; e.preventDefault(); report("context", "الزر الأيمن"); };
    H.cp = (e) => { if (!X.a || !p.block_copy) return; e.preventDefault(); report(e.type === "paste" ? "paste" : "copy", e.type); toast(T("النسخ واللصق ممنوعان في الاختبار", "Copy and paste are disabled during the quiz"), true); };
    H.key = (e) => { if (!X.a) return; const k = e.key.toLowerCase(), m = e.ctrlKey || e.metaKey;
      if (e.key === "F12" || (m && e.shiftKey && ["i", "j", "c"].includes(k))) { e.preventDefault(); report("devtools", "اختصار أدوات المطوّر"); }
      else if (m && ["p", "s", "u"].includes(k)) { e.preventDefault(); report(k === "p" ? "print" : "copy", "Ctrl+" + k.toUpperCase()); } };
    let lastDev = false, lastNarrow = false;
    H.dim = () => { if (!X.a) return; const dw = window.outerWidth - window.innerWidth, dh = window.outerHeight - window.innerHeight, dev = window.outerWidth > 0 && (dw > 200 || dh > 260) && !fsEl();
      if (dev && !lastDev) report("devtools", "فرق أبعاد النافذة"); lastDev = dev;
      const narrow = screen.width > 700 && window.innerWidth < screen.width * 0.6; if (narrow && !lastNarrow) report("resize", "عرض " + window.innerWidth + " من " + screen.width); lastNarrow = narrow; };
    document.addEventListener("visibilitychange", H.vis); window.addEventListener("blur", H.blur);
    document.addEventListener("fullscreenchange", H.fs); document.addEventListener("webkitfullscreenchange", H.fs);
    document.addEventListener("contextmenu", H.ctx); ["copy", "cut", "paste"].forEach((t) => document.addEventListener(t, H.cp));
    document.addEventListener("keydown", H.key); window.addEventListener("resize", H.dim); H.dimT = setInterval(H.dim, 2500);
  }
  function proctorOff() {
    if (!H.vis) return;
    document.removeEventListener("visibilitychange", H.vis); window.removeEventListener("blur", H.blur);
    document.removeEventListener("fullscreenchange", H.fs); document.removeEventListener("webkitfullscreenchange", H.fs);
    document.removeEventListener("contextmenu", H.ctx); ["copy", "cut", "paste"].forEach((t) => document.removeEventListener(t, H.cp));
    document.removeEventListener("keydown", H.key); window.removeEventListener("resize", H.dim); clearInterval(H.dimT); H.vis = null;
    $("xWarn").classList.add("hide");
  }
  function tick() {
    if (!X.end) { $("xTimer").textContent = "∞"; return; }
    const left = X.end - Date.now(); $("xTimer").textContent = mmss(left); $("xTimer").classList.toggle("low", left < 60000);
    if (left <= 0) submit(true);
  }
  async function save() {
    if (!X.a || !X.dirty) return; X.dirty = false; $("xSaved").textContent = T("جارٍ الحفظ…", "Saving…");
    try { await rpc("s_save_answers", { p_attempt: X.a.attempt_id, p_answers: X.ans, p_written: X.wr, p_device: DEV }); $("xSaved").textContent = T("حُفظت إجاباتك", "Your answers are saved"); }
    catch (e) { X.dirty = true; $("xSaved").textContent = T("لم تُحفظ بعد — سنحاول مجددًا", "Not saved yet — we'll try again"); if (/جهاز آخر|another device/.test(e.message)) toast(e.message, true); }
  }
  const NI = () => X.a.items.length, NT = () => X.a.items.length + X.a.wq.length;
  const wAns = (w) => { const v = X.wr[w.id] || {}; return !!(String(v.text || "").trim() || (v.files || []).length); };
  const isDone = (k) => (k < NI() ? X.ans[k] != null : wAns(X.a.wq[k - NI()]));
  function render() {
    const n = NT(), answered = [...Array(n).keys()].filter(isDone).length;
    $("xProg").textContent = T("السؤال " + (X.i + 1) + " من " + n + " · أجبت " + answered, "Question " + (X.i + 1) + " of " + n + " · answered " + answered);
    $("xBar").style.width = Math.round((answered / n) * 100) + "%";
    if (X.i < NI()) {
      const q = X.a.items[X.i], ar = !!X.ar[X.i];
      $("xCard").innerHTML = `<div class="row sp"><div class="qnum">${T("السؤال", "Question")} ${X.i + 1} ${T("من", "of")} ${n}</div>${en() && q.stem_en ? `<button class="btn sm ghost" id="xLang">${ar ? "English" : "عرض بالعربية"}</button>` : ""}</div>
        <div class="stem" dir="${qDir(q, ar)}">${esc(qText(q, ar))}</div>` +
        `<div class="opts" role="radiogroup" dir="${qDir(q, ar)}">` + qOpts(q, ar).map((o, j) => `<button class="opt" role="radio" data-k="${j}" aria-checked="${X.ans[X.i] === j}"><span class="L">${L[j]}</span><span>${esc(o)}</span></button>`).join("") + "</div>";
      $("xCard").querySelectorAll(".opt").forEach((b) => (b.onclick = () => { X.ans[X.i] = +b.dataset.k; X.dirty = true; render(); }));
      const lb = $("xLang"); if (lb) lb.onclick = () => { X.ar[X.i] = !X.ar[X.i]; render(); };
    } else {
      const w = X.a.wq[X.i - NI()], v = X.wr[w.id] || (X.wr[w.id] = { text: "", files: [] }), fl = (v.files || []).map((id) => X.a.wfiles.find((f) => f.id === id)).filter(Boolean);
      $("xCard").innerHTML = `<div class="row sp"><div class="qnum">${T("مسألة مكتوبة", "Written problem")} · ${T("السؤال", "Question")} ${X.i + 1} ${T("من", "of")} ${n}</div><span class="pill">${nf(+w.max, 2)} ${T("علامات", "marks")}</span></div>
        <div class="stem" dir="${en() && w.q_en ? "ltr" : "rtl"}" style="white-space:pre-wrap">${esc(en() && w.q_en ? w.q_en : w.q)}</div>
        <textarea class="input" id="xW" rows="8" dir="auto" placeholder="${T("اكتب حلّك بالخطوات…", "Write your solution step by step…")}" style="margin-top:12px">${esc(v.text || "")}</textarea>
        ${w.photo ? `<div style="margin-top:10px"><div class="flist" id="xWf">${fl.map((f) => `<div class="frow">${FF.badge(f)}<span class="nm">${esc(f.name)}</span><span class="sz">${FF.size(f.size)}</span><button class="btn sm ghost" data-wx="${f.id}">✕</button></div>`).join("")}</div>
          <label class="drop" style="margin-top:8px;display:block" id="xWd">${ic("upload")}<b>${T("صوّر حلّك على الورق وارفعه", "Photograph your paper solution and upload it")}</b><span class="tiny">${T("صورة أو PDF · لا تُحتسب مخالفة أثناء فتح الكاميرا", "Image or PDF · opening the camera is not counted as a violation")}</span>
          <input type="file" id="xWi" accept="image/*,.pdf" hidden></label></div>` : ""}`;
      const ta = $("xW"); ta.oninput = () => { v.text = ta.value; X.dirty = true; $("xNav").querySelectorAll("button")[X.i].classList.toggle("done", isDone(X.i)); };
      const wi = $("xWi");
      if (wi) {
        $("xWd").addEventListener("click", () => { X.suspend = Date.now() + 120000; });
        wi.onchange = async () => {
          const f0 = wi.files[0]; wi.value = ""; X.suspend = Date.now() + 4000; if (!f0) return;
          try { const f = await FF.shrink(f0); $("xWd").querySelector("b").textContent = T("جارٍ الرفع…", "Uploading…");
            const r = await FF.upload(f, { assessment: null, role: "exam", attempt: X.a.attempt_id });
            X.a.wfiles.push(r); v.files = (v.files || []).concat(r.id); X.dirty = true; save(); }
          catch (e) { toast(e.message, true); }
          render();
        };
        $("xCard").querySelectorAll("[data-wx]").forEach((b) => (b.onclick = async () => { try { await rpc("f_delete", { p_file: b.dataset.wx }); v.files = v.files.filter((x) => x !== b.dataset.wx); X.dirty = true; save(); render(); } catch (e) { toast(e.message, true); } }));
      }
    }
    $("xPrev").disabled = X.i === 0;
    $("xNext").innerHTML = X.i === n - 1 ? T("المراجعة والتسليم", "Review and submit") + ic("left", "sm") : T("التالي", "Next") + ic("left", "sm");
    $("xFlag").innerHTML = ic("flag", "sm") + (X.flags[X.i] ? T("إلغاء التعليم", "Unflag") : T("علّم للمراجعة", "Flag for review"));
    $("xNav").innerHTML = [...Array(n).keys()].map((k) => `<button class="${[isDone(k) ? "done" : "", k === X.i ? "cur" : "", X.flags[k] ? "flag" : "", k >= NI() ? "wq" : ""].join(" ")}" data-q="${k}" aria-label="${T("السؤال", "Question")} ${k + 1}">${k + 1}</button>`).join("");
    $("xNav").querySelectorAll("[data-q]").forEach((b) => (b.onclick = () => { X.i = +b.dataset.q; render(); }));
  }
  $("xPrev").onclick = () => { if (X.i > 0) { X.i--; render(); } };
  $("xNext").onclick = () => { if (X.i < NT() - 1) { X.i++; render(); } else submit(false); };
  $("xFlag").onclick = () => { X.flags[X.i] = !X.flags[X.i]; render(); };
  $("xSubmit").onclick = () => submit(false);
  async function submit(auto) {
    if (!X.a || X.submitting) return;
    if (!auto) {
      const blank = [...Array(NT()).keys()].filter((k) => !isDone(k)).length;
      X.suspend = Date.now() + 60000;
      const yes = await confirmSheet(T("تسليم الإجابات", "Submit answers"), blank ? T(`بقي ${blank} سؤالًا بلا إجابة. هل تريد التسليم؟`, `${blank} question${blank === 1 ? " is" : "s are"} unanswered. Submit anyway?`) : T("هل تريد تسليم إجاباتك الآن؟", "Submit your answers now?"), T("سلّم", "Submit"));
      X.suspend = 0; if (!yes) return;
    }
    X.submitting = true; clearInterval(X.timer); clearInterval(X.saveT);
    try {
      const r = await rpc("s_submit_quiz", { p_attempt: X.a.attempt_id, p_answers: X.ans, p_written: X.wr, p_auto: !!auto });
      const aid = X.a.attempt_id, title = X.a.title; stopExam(); r.kind === "exam" ? examDone(title) : result(r, aid, title);
    } catch (e) { X.submitting = false; toast(e.message, true); X.timer = setInterval(tick, 1000); X.saveT = setInterval(save, 8000); }
  }
  function examDone(title, auto) {
    lastResult = null;
    $("rTitle").textContent = title;
    $("rBody").innerHTML = `<div class="card pad" style="text-align:center"><div class="ibox" style="margin:0 auto 12px">${ic(auto ? "alert" : "checkc", "lg")}</div>
      <h3>${auto ? T("سُلِّم اختبارك تلقائيًّا", "Your exam was submitted automatically") : T("وصلت إجاباتك", "Your answers were received")}</h3>
      <p class="muted" style="margin-top:8px">${auto ? T("بلغت عدد المخالفات المسموح؛ سُلِّمت إجاباتك المحفوظة ويطّلع المحاضر على سجل المراقبة.", "You reached the allowed number of violations; your saved answers were submitted and your lecturer will see the proctoring log.") + " " : ""}${T("تظهر علامتك بعد أن يصحّح المحاضر المسائل وينشر النتائج.", "Your mark appears after your lecturer grades the problems and releases the results.")}</p></div>`;
    show("vResult");
  }
  async function autoDone(aid, title, exam) {
    if (exam) return examDone(title, true);
    let r = null; try { r = (await rpc("s_attempts", { p_assessment: D.en.quizzes.find((q) => q.title === title).id })).find((x) => x.id === aid); } catch (e) { }
    $("rTitle").textContent = title;
    $("rBody").innerHTML = `<div class="card pad" style="text-align:center"><div class="ibox" style="margin:0 auto 12px">${ic("alert", "lg")}</div><h3>${T("سُلِّم الاختبار تلقائيًّا", "The quiz was submitted automatically")}</h3>
      <p class="muted" style="margin-top:8px">${T("بلغت عدد المخالفات المسموح، فسُلِّمت إجاباتك المحفوظة.", "You reached the allowed number of violations, so your saved answers were submitted.")}${r && r.score != null ? " " + T("علامتك: ", "Your mark: ") + nf(+r.score, 2) + "/" + nf(+r.max, 0) : ""}</p></div>`;
    show("vResult");
  }
  function result(r, aid, title) {
    lastResult = [r, aid, title];
    const p = Math.round(r.score / r.max * 100), c = D.en.course;
    $("rTitle").textContent = T("نتيجة: ", "Result: ") + title;
    $("rBody").innerHTML = `<div class="card pad" style="text-align:center"><div class="score-ring" style="--p:${p}"><div><div><b class="num">${nf(+r.score, 2)}/${nf(+r.max, 0)}</b><span class="tiny">${p}%</span></div></div></div>
      <p class="muted">${T(r.correct + " إجابة صحيحة من " + r.total + ". ", r.correct + " correct out of " + r.total + ". ")}${p >= 85 ? T("ممتاز! أنت تتقن هذه الأهداف.", "Excellent! You have mastered these objectives.") : p >= 60 ? T("جيد — راجع الأهداف الأضعف ثم أعد المحاولة إن بقيت لك محاولات.", "Good — review your weaker objectives, then try again if you have attempts left.") : T("لا بأس، راجع الأهداف أدناه ثم أعد المحاولة إن بقيت لك محاولات.", "That's okay — review the objectives below and try again if you have attempts left.")}</p></div>
      <div class="card list" style="margin-top:12px">${Object.entries(r.by_obj).sort().map(([k, v]) => { const q = v[0] / v[1] * 100;
        return `<div class="li" style="align-items:flex-start"><div class="grow"><span class="lbl-chip" dir="ltr">${k}</span> ${esc(objText(c, k))}<div style="margin-top:6px">${lvBar(q)}</div></div><b class="num">${v[0]}/${v[1]}</b></div>`; }).join("")}</div>
      <button class="btn outline block" id="rRev" style="margin-top:12px">${ic("eye", "sm")}${T("مراجعة إجاباتي", "Review my answers")}</button>`;
    $("rRev").onclick = () => review(aid);
    show("vResult");
  }
  $("rBack").onclick = async () => { location.hash = "#/quizzes"; await loadHome(); };


  // ===================== الواجبات (الإصدار 1.5) =====================
  const RLn = () => [LV[4], LV[3], LV[2], LV[1]];
  const wordsOf = (t) => (String(t || "").trim().match(/\S+/g) || []).length;
  const lateStr = (m) => { m = +m || 0; const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
    return en() ? [d && d + "d", h && h + "h", !d && mi && mi + "m"].filter(Boolean).join(" ") : [d && d + " يوم", h && h + " ساعة", !d && mi && mi + " دقيقة"].filter(Boolean).join(" و"); };
  const policy = (A) => A.late === "penalty" ? T(`يُقبل بعد الموعد بخصم ${nf(+A.penalty_pct || 10, 0)}٪ عن كل يوم تأخير${A.cutoff_at ? " حتى " + fmtDT(A.cutoff_at) : ""}`, `Late work accepted with a ${nf(+A.penalty_pct || 10, 0)}% deduction per day late${A.cutoff_at ? " until " + fmtDT(A.cutoff_at) : ""}`)
    : A.late === "free" ? T(`يُقبل بعد الموعد بلا خصم${A.cutoff_at ? " حتى " + fmtDT(A.cutoff_at) : ""}، ويُعلَّم متأخرًا`, `Late work accepted without deduction${A.cutoff_at ? " until " + fmtDT(A.cutoff_at) : ""}, marked as late`)
    : T("لا يُقبل التسليم بعد الموعد", "No submissions after the due date");
  const asgs = () => (D.en && D.en.assignments) || [];
  const asgTodo = () => asgs().filter((a) => a.state && a.state.can_edit && !a.excused && (a.version === 0 || a.dirty || a.state.reopen));
  function aStatus(a) {
    const s = a.state || {};
    if (a.excused) return ["ended", T("معفى", "Excused")];
    if (a.released && a.graded && a.pct != null) return ["soon", T("العلامة ", "Mark ") + pc(a.pct)];
    if (s.reopen) return ["warn", T("مطلوب إعادة التسليم", "Resubmission requested")];
    if (a.version > 0 && a.dirty && s.can_edit) return ["warn", T("تعديلات لم تُسلَّم", "Unsubmitted changes")];
    if (a.version > 0) return ["", "✓ " + T("سُلِّم", "Submitted") + (a.late_minutes > 0 ? " · " + T("متأخر", "late") : "")];
    if (s.reason === "not_open") return ["soon", T("يفتح ", "Opens ") + ago(a.open_at)];
    if (s.can_edit) return s.late_now ? ["warn", T("متأخر — ما زال مقبولًا", "Late — still accepted")] : ["open", T("مطلوب", "Due")];
    return ["ended", T("فات الموعد", "Missed")];
  }
  function pAssignments() {
    const A = asgs();
    let h = crumb(T("الواجبات", "Assignments"), T("سلّم واجباتك وأوراق العمل هنا، واطّلع على علامتك وملاحظات المحاضر بعد نشرها", "Submit your assignments and worksheets here, and see your mark and the lecturer's feedback once released"));
    if (!A.length) return h + emptyBox("inbox", T("لا واجبات منشورة بعد", "No published assignments yet"), T("يظهر الواجب هنا عندما ينشره المحاضر.", "An assignment appears here when your lecturer publishes it."));
    return h + '<div class="panel-grid">' + A.map((a) => { const st = aStatus(a), due = (a.state && a.state.due) || a.close_at;
      return `<div class="card xcard"><div class="row sp"><div class="ttl">${esc(a.title)}</div><span class="pill ${st[0]}">${esc(st[1])}</span></div>
        <div class="tiny" style="margin:6px 0">${esc(a.component_key ? comp({ key: a.component_key, title: a.component }) : a.component || "")}</div>
        <div class="tiny">${T("موعد التسليم", "Due")}: <b>${esc(fmtDT(due))}</b>${a.state && a.state.can_edit && due ? " · " + esc(ago(due)) : ""}</div>
        <button class="btn ${a.state && a.state.can_edit && !a.excused && (a.version === 0 || a.dirty) ? "primary" : "outline"} block" style="margin-top:10px" data-go="assignment/${a.id}">${a.state && a.state.can_edit && !a.excused ? (a.version ? T("افتح التسليم", "Open submission") : T("ابدأ الواجب", "Start assignment")) : T("التفاصيل والعلامة", "Details and mark")}${ic("left", "sm")}</button></div>`; }).join("") + "</div>";
  }

  // صفحة الواجب: التعليمات، والروبرك، ومساحة العمل، والتسليم، والنسخ، والعلامة بعد النشر
  const W = { id: null, a: null, text: "", ans: [], files: [], up: [], dirty: false, t: null, saving: false };
  async function flushDraft() {
    if (!W.a || !W.dirty || W.saving) return;
    W.saving = true; W.dirty = false; const sv = $("aSv"); if (sv) sv.textContent = T("جارٍ حفظ المسودة…", "Saving draft…");
    try { await rpc("s_save_draft", { p_assessment: W.id, p_text: W.text, p_answers: W.ans, p_link: W.link || null }); W.local = true; const s2 = $("aSv"); if (s2) s2.textContent = T("حُفظت المسودة ", "Draft saved ") + new Intl.DateTimeFormat(en() ? "en-GB" : "ar-JO-u-nu-latn", { hour: "numeric", minute: "2-digit" }).format(new Date()) + T(" — لم تُسلَّم بعد", " — not submitted yet"); }
    catch (e) { W.dirty = true; const s2 = $("aSv"); if (s2) s2.textContent = T("لم تُحفظ المسودة — ", "Draft not saved — ") + e.message; }
    W.saving = false;
  }
  const touch = () => { W.dirty = true; clearTimeout(W.t); W.t = setTimeout(flushDraft, 1800); const sv = $("aSv"); if (sv) sv.textContent = T("تعديلات غير محفوظة…", "Unsaved changes…"); };
  async function pAssignment(id, keep) {
    const box = $("dash");
    if (!keep || !W.a || W.id !== id) {
      box.innerHTML = crumb(T("الواجب", "Assignment"), "", "assignments") + '<div class="card pad loading">' + T("جارٍ التحميل…", "Loading…") + "</div>"; wire();
      let a; try { a = await rpc("s_assignment", { p_assessment: id }); } catch (e) { box.innerHTML = crumb(T("الواجب", "Assignment"), "", "assignments") + emptyBox("alert", esc(e.message), ""); wire(); return; }
      if (location.hash !== "#/assignment/" + id) return;
      const sb = a.sub || {};
      Object.assign(W, { id, a, link: sb.link || "", text: sb.text || "", ans: (a.assign.worksheet || []).map((_, i) => ((sb.answers || [])[i]) || ""), files: (sb.files || []).slice(), up: [], dirty: false, local: false });
    }
    drawA();
  }
  function rubTable(P, sel) {
    return `<div class="rubwrap"><table class="rub"><thead><tr><th>${T("المعيار", "Criterion")}</th>${RLn().map((n) => `<th>${n}</th>`).join("")}</tr></thead><tbody>
      ${P.map((p) => { const r = sel && sel[p.id]; const k = r ? (r.lvl != null ? r.lvl : -1) : -1;
        return `<tr><td class="cn"><b>${esc(p.label)}</b><span class="lbl-chip" dir="ltr">${p.objective_code}</span> <span class="tiny">${T("من", "of")} ${nf(+p.max, 2)}</span>${r ? `<div style="margin-top:6px"><b class="num" style="color:var(--accent)">${nf(+r.pts, 2)}</b></div>` : ""}</td>
        ${(p.levels || []).map((l, i) => `<td class="lc ${k === i ? "sel" : ""}"><span class="p num">${nf(+l.pts, 2)}</span>${esc(l.desc || "")}</td>`).join("")}</tr>
        ${r && r.c ? `<tr><td></td><td colspan="4" class="tiny" style="background:var(--accent-soft)">${ic("chat", "sm")} ${esc(r.c)}</td></tr>` : ""}`; }).join("")}</tbody></table></div>`;
  }
  const fileRows = (files, del) => files.map((f) => `<div class="frow">${FF.badge(f)}<span class="nm" title="${esc(f.name)}">${esc(f.name)}</span><span class="sz">${FF.size(f.size)}</span>
      ${f.purged ? `<span class="pill">${T("مؤرشف", "Archived")}</span>` : `<button class="btn sm ghost" type="button" data-fdl="${f.id}" aria-label="${T("تنزيل", "Download")}">${ic("download", "sm")}</button>`}${del ? `<button class="btn sm ghost" type="button" data-fx="${f.id}" aria-label="${T("حذف", "Remove")}">✕</button>` : ""}</div>`).join("");
  function drawA() {
    const a = W.a, A = a.assign || {}, sb = a.sub || {}, st = a.state || {}, can = st.can_edit, vers = sb.versions || [];
    const c0 = a.component ? comp(a.component) : "";
    let h = crumb(esc(a.title), esc(c0) + " · " + T("العلامة من ", "Out of ") + nf(+a.max, 2), "assignments");
    // الحالة
    const stt = aStatus({ state: st, excused: sb.excused, released: a.released, graded: !!a.grade, pct: a.grade ? a.grade.score / a.max * 100 : null, version: sb.version || 0, dirty: sb.dirty, late_minutes: sb.late_minutes, open_at: a.open_at });
    h += `<div class="card pad"><div class="stbox"><div><span>${T("موعد التسليم", "Due")}</span><b>${esc(fmtDT(st.due || a.close_at))}</b>${can && st.due ? `<div class="tiny">${esc(ago(st.due))}</div>` : ""}</div>
      <div><span>${T("الحالة", "Status")}</span><b><span class="pill ${stt[0]}">${esc(stt[1])}</span></b></div>
      <div><span>${T("آخر تسليم", "Last submission")}</span><b>${sb.version ? T("النسخة ", "Version ") + sb.version + " · " + esc(fmtDT(sb.submitted_at, false)) : "—"}</b>${sb.late_minutes ? `<div class="tiny" style="color:var(--warn)">${T("متأخر ", "Late by ")}${esc(lateStr(sb.late_minutes))}</div>` : ""}</div>
      <div><span>${T("بعد الموعد", "After the due date")}</span><b style="font-size:13px">${esc(policy(A))}</b></div></div>
      ${sb.extension_until ? `<div class="tipbox tiny" style="margin-top:10px">${T("مدّد لك المحاضر موعد التسليم حتى ", "Your lecturer extended your due date to ")}<b>${esc(fmtDT(sb.extension_until))}</b>.</div>` : ""}
      ${st.reopen ? `<div class="tipbox tiny" style="margin-top:10px">${ic("refresh", "sm")} ${T("طلب منك المحاضر إعادة التسليم حتى ", "Your lecturer asked you to resubmit by ")}<b>${esc(fmtDT(sb.reopen_until))}</b>${sb.reopen_note ? `: «${esc(sb.reopen_note)}»` : "."}</div>` : ""}
      ${sb.excused ? `<div class="tipbox tiny" style="margin-top:10px">${T("أعفاك المحاضر من هذا الواجب؛ لا يُحتسب في علامتك.", "Your lecturer excused you from this assignment; it does not count toward your mark.")}</div>` : ""}</div>`;
    // العلامة بعد النشر
    if (a.grade) {
      const g = a.grade, p = g.score / a.max * 100;
      h += `<div class="card pad" style="margin-top:12px"><div class="row sp wrap"><h3 style="font-size:17px">${ic("award", "sm")} ${T("علامتك وملاحظات المحاضر", "Your mark and feedback")}</h3>${lvChip(p)}</div>
        <div class="row wrap" style="gap:10px;align-items:baseline;margin:8px 0"><span class="hero-n num">${nf(+g.score, 2)} <small>${T("من", "of")} ${nf(+a.max, 2)}</small></span><b class="num">${pc(p, 1)}</b></div>
        ${+g.penalty_pct ? `<p class="tiny" style="color:var(--warn)">${T("خُصم " + nf(+g.penalty_pct, 0) + "٪ للتأخير.", "A " + nf(+g.penalty_pct, 0) + "% late deduction was applied.")}</p>` : ""}
        ${rubTable(a.rubric, g.rubric || {})}
        ${g.feedback ? `<div style="margin-top:12px"><b>${T("ملاحظات عامة", "Overall feedback")}</b><div class="anstext" style="margin-top:6px">${esc(g.feedback)}</div></div>` : ""}
        ${(g.files || []).length ? `<div style="margin-top:12px"><b>${T("ملفات من المحاضر", "Files from your lecturer")}</b><div class="flist" style="margin-top:6px">${fileRows(g.files)}</div></div>` : ""}</div>`;
    } else if (sb.version && !sb.excused) h += `<div class="card pad tiny" style="margin-top:12px">${ic("clock", "sm")} ${T("وصل تسليمك. تظهر علامتك وملاحظات المحاضر هنا بعد أن ينشرها.", "Your submission has arrived. Your mark and the lecturer's feedback will appear here once released.")}</div>`;
    // التعليمات
    h += `<div class="card pad" style="margin-top:12px"><h3 style="font-size:16px">${ic("book", "sm")} ${T("المطلوب", "Instructions")}</h3>
      ${A.instructions ? `<div style="white-space:pre-wrap;line-height:1.9;margin-top:8px" dir="auto">${esc(A.instructions)}</div>` : `<p class="tiny" style="margin-top:6px">${T("لا تعليمات مكتوبة؛ راجع الملفات المرفقة.", "No written instructions; see the attached files.")}</p>`}
      ${(a.brief || []).length ? `<div class="flist" style="margin-top:10px">${fileRows(a.brief)}</div>` : ""}
      <div class="tiny" style="margin-top:10px">${[A.sub_text ? T("صندوق إجابة", "Answer box") : "", A.sub_link ? T("رابط", "Link") : "", A.sub_files ? T("ملفات", "Files") + ` (${(A.file_types || FF.DEF).map((k) => (FF.TYPES[k] || ["", k])[1]).join("، ")} — ${T("حتى", "up to")} ${A.max_files || 3}، ${T("4 م.ب للملف", "4 MB each")})` : "", (A.worksheet || []).length ? T("ورقة عمل من " + A.worksheet.length + " أسئلة", "Worksheet with " + A.worksheet.length + " questions") : ""].filter(Boolean).join(" · ")}${A.resubmit ? " · " + T("يمكنك إعادة التسليم حتى الموعد", "You can resubmit until the due date") : " · " + T("تسليم واحد فقط", "One submission only")}</div></div>`;
    if (!a.grade) h += `<details class="card pad" style="margin-top:12px" ${sb.version ? "" : "open"}><summary style="cursor:pointer;font-weight:700">${ic("target", "sm")} ${T("كيف سيُقيَّم عملك (الروبرك)", "How your work will be assessed (rubric)")}</summary><div style="margin-top:10px">${rubTable(a.rubric)}</div></details>`;
    // مساحة العمل
    if (can) {
      h += `<div class="card pad" style="margin-top:12px"><div class="row sp wrap"><h3 style="font-size:16px">${ic("pen", "sm")} ${sb.version ? T("تعديل التسليم", "Edit your submission") : T("إجابتك", "Your work")}</h3><span class="tiny" id="aSv">${sb.dirty ? T("لديك مسودة محفوظة لم تُسلَّم", "You have a saved draft that is not submitted") : ""}</span></div>`;
      (A.worksheet || []).forEach((w, i) => { h += `<div class="wsq" style="margin-top:10px"><div class="q" dir="rtl">${i + 1}. ${esc(w.q)}</div><textarea class="input" rows="3" data-wa="${i}" dir="auto">${esc(W.ans[i] || "")}</textarea></div>`; });
      if (A.sub_text) h += `<label class="field" style="margin-top:10px"><span>${T("صندوق الإجابة", "Answer box")}</span><textarea class="input" id="aTx" rows="9" dir="auto" placeholder="${T("اكتب إجابتك هنا… تُحفظ مسودتك تلقائيًّا.", "Write your answer here… your draft saves automatically.")}">${esc(W.text)}</textarea><div class="wcount" id="aWc"></div></label>`;
      if (A.sub_link) h += `<label class="field" style="margin-top:10px"><span>${T("رابط عملك (فيديو العرض على Google Drive أو YouTube…)", "Link to your work (presentation video on Google Drive, YouTube…)")}</span>
        <input class="input" id="aLk" dir="ltr" type="url" placeholder="https://" value="${esc(W.link || "")}"><span class="tiny">${T("تأكد أن الرابط مفتوح لمن يملكه (Anyone with the link).", "Make sure the link is shared with “Anyone with the link”.")}</span></label>`;
      if (A.sub_files) h += `<div style="margin-top:10px"><b style="font-size:14px">${T("الملفات", "Files")}</b> <span class="tiny" id="aFc"></span><div class="flist" id="aFl" style="margin-top:6px"></div>
        <label class="drop" id="aDrop" style="margin-top:8px;display:block">${ic("upload")}<b>${T("ارفع ملفًا أو صوّر حلّك", "Upload a file or photograph your work")}</b><span class="tiny">${T("اضغط للاختيار أو اسحب الملف إلى هنا · صور الهاتف تُصغَّر تلقائيًّا", "Tap to choose or drag a file here · phone photos are resized automatically")}</span>
          <input type="file" id="aIn" multiple hidden accept="${FF.accept(A.file_types)}"></label></div>`;
      h += `<label class="check" style="margin-top:14px;align-items:flex-start"><input type="checkbox" id="aInt"> <span>${T("أُقرّ بأن هذا العمل من إنجازي، وأن أي مصدر استعنت به مذكور فيه، وأنني لم أنسخه من زميل.", "I confirm this work is my own, any source I used is cited, and I did not copy it from a classmate.")}</span></label>
        ${st.late_now ? `<div class="tipbox tiny" style="margin-top:10px">${T("انتهى موعد التسليم؛ سيُسجَّل تسليمك متأخرًا. ", "The due date has passed; your submission will be recorded as late. ")}${esc(policy(A))}</div>` : ""}
        <button class="btn primary block lg" id="aGo" style="margin-top:12px">${ic("upload", "sm")}${sb.version ? T("إعادة التسليم", "Resubmit") : T("سلّم الواجب", "Submit assignment")}</button>
        <p class="tiny" style="margin-top:8px;text-align:center">${A.resubmit ? T("يمكنك إعادة التسليم حتى الموعد، ويُصحَّح آخر ما سلّمته.", "You can resubmit until the due date; your latest submission is graded.") : T("تنبيه: هذا الواجب يُسلَّم مرة واحدة فقط.", "Note: this assignment can be submitted only once.")}</p></div>`;
    } else if (!vers.length) {
      const why = { closed: T("انتهت مهلة التسليم ولم تسلّم؛ تُحسب علامتك صفرًا ما لم يمدّد لك المحاضر.", "The submission window has closed without a submission; it counts as zero unless your lecturer grants an extension."), not_open: T("لم يُفتح التسليم بعد؛ يفتح ", "Submissions are not open yet; opens ") + (a.open_at ? fmtDT(a.open_at) : ""), excused: "" }[st.reason] || "";
      if (why) h += `<div class="card pad tiny" style="margin-top:12px">${esc(why)}</div>`;
    }
    // النسخ المسلَّمة
    if (vers.length) h += `<details class="card pad" style="margin-top:12px" ${can ? "" : "open"}><summary style="cursor:pointer;font-weight:700">${ic("list", "sm")} ${T("ما سلّمته", "What you submitted")} (${vers.length})</summary>${vers.map((v, i) => `<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line)">
        <div class="row sp wrap"><b>${T("النسخة ", "Version ")}${v.version}${i === 0 ? " · " + T("الأحدث", "latest") : ""}</b><span class="tiny">${esc(fmtDT(v.submitted_at))}${v.late_minutes ? " · " + T("متأخر ", "late by ") + esc(lateStr(v.late_minutes)) : ""}</span></div>
        ${(A.worksheet || []).map((w, k) => `<div class="tiny" style="margin-top:6px"><b>${k + 1}. ${esc(w.q)}</b></div><div class="anstext" style="padding:8px 10px">${esc((v.answers || [])[k] || "—")}</div>`).join("")}
        ${v.link ? `<div style="margin-top:6px">${ic("clip", "sm")} <a href="${esc(v.link)}" target="_blank" rel="noopener" dir="ltr">${esc(v.link)}</a></div>` : ""}
        ${v.text ? `<div class="anstext" style="margin-top:6px">${esc(v.text)}</div>` : ""}${(v.files || []).length ? `<div class="flist" style="margin-top:6px">${fileRows(v.files)}</div>` : ""}</div>`).join("")}</details>`;
    const box = $("dash"); box.innerHTML = h; wire();
    const allF = [...(a.brief || []), ...W.files, ...vers.flatMap((v) => v.files || []), ...((a.grade && a.grade.files) || [])];
    box.querySelectorAll("[data-fdl]").forEach((b) => (b.onclick = () => FF.download(allF.find((f) => f.id === b.dataset.fdl) || { id: b.dataset.fdl }, b)));
    if (!can) return;
    box.querySelectorAll("[data-wa]").forEach((t) => (t.oninput = () => { W.ans[+t.dataset.wa] = t.value; touch(); }));
    const tx = $("aTx"), wc = () => { const n = wordsOf(W.text), e = $("aWc"); if (!e) return; const mn = +A.words_min || 0, mx = +A.words_max || 0;
      e.textContent = n + " " + T("كلمة", n === 1 ? "word" : "words") + (mn || mx ? " · " + T("المطلوب ", "required ") + (mn && mx ? mn + "–" + mx : mn ? T("على الأقل ", "at least ") + mn : T("حتى ", "up to ") + mx) : "");
      e.classList.toggle("bad", !!n && ((mn && n < mn) || (mx && n > mx))); };
    if (tx) { tx.oninput = () => { W.text = tx.value; wc(); touch(); }; wc(); }
    const lk = $("aLk"); if (lk) lk.oninput = () => { W.link = lk.value.trim(); touch(); };
    if (A.sub_files) drawFiles();
  }
  function drawFiles() {
    const A = W.a.assign, box = $("aFl"); if (!box) return;
    const mx = A.max_files || 3;
    box.innerHTML = fileRows(W.files, true) + W.up.map((u) => `<div class="frow">${FF.badge({ name: u.name })}<div class="nm">${esc(u.name)}<div class="bar"><i style="width:${Math.round(u.p * 100)}%"></i></div></div><span class="sz">${Math.round(u.p * 100)}%</span></div>`).join("");
    $("aFc").textContent = "(" + W.files.length + "/" + mx + ")";
    $("aDrop").classList.toggle("hide", W.files.length + W.up.length >= mx);
    box.querySelectorAll("[data-fdl]").forEach((b) => (b.onclick = () => FF.download(W.files.find((f) => f.id === b.dataset.fdl), b)));
    box.querySelectorAll("[data-fx]").forEach((b) => (b.onclick = async () => { try { await rpc("f_delete", { p_file: b.dataset.fx }); W.files = W.files.filter((f) => f.id !== b.dataset.fx); W.local = true; W.a.sub = Object.assign(W.a.sub || {}, { dirty: true }); drawFiles(); } catch (e) { toast(e.message, true); } }));
    const inp = $("aIn"), drop = $("aDrop");
    inp.onchange = () => { addFiles([...inp.files]); inp.value = ""; };
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("on"); }; drop.ondragleave = () => drop.classList.remove("on");
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove("on"); addFiles([...e.dataTransfer.files]); };
  }
  async function addFiles(list) {
    const A = W.a.assign, mx = A.max_files || 3;
    for (const f0 of list) {
      if (W.files.length + W.up.length >= mx) { toast(T("وصلت إلى الحد الأقصى لعدد الملفات (" + mx + ")", "You have reached the maximum number of files (" + mx + ")"), true); break; }
      if (!FF.extOk(f0.name, A.file_types)) { toast(T("نوع الملف «" + f0.name + "» غير مسموح في هذا الواجب", "The file type of “" + f0.name + "” is not allowed in this assignment"), true); continue; }
      const u = { name: f0.name, p: 0 }; W.up.push(u); drawFiles();
      try {
        const f = await FF.shrink(f0); u.name = f.name;
        const r = await FF.upload(f, { assessment: W.id, role: "sub" }, (p) => { u.p = p; drawFiles(); });
        W.files.push(r); W.local = true; W.a.sub = Object.assign(W.a.sub || {}, { dirty: true });
      } catch (e) { toast(e.message, true); }
      W.up = W.up.filter((x) => x !== u); drawFiles();
    }
  }
  async function submitA() {
    const A = W.a.assign, st = W.a.state;
    if (!$("aInt").checked) return toast(T("أقرّ بأن العمل من إنجازك قبل التسليم", "Confirm the work is your own before submitting"), true);
    if (W.up.length) return toast(T("انتظر حتى يكتمل رفع الملفات", "Wait for the files to finish uploading"), true);
    const n = wordsOf(W.text), mn = +A.words_min || 0, mx = +A.words_max || 0, ans = W.ans.filter((x) => String(x || "").trim()).length;
    if (A.sub_text && n && ((mn && n < mn) || (mx && n > mx))) return toast(T(`عدد كلمات إجابتك ${n}، والمطلوب ${mn && mx ? mn + "–" + mx : mn ? "على الأقل " + mn : "حتى " + mx}`, `Your answer has ${n} words; required ${mn && mx ? mn + "–" + mx : mn ? "at least " + mn : "up to " + mx}`), true);
    if (W.link && !/^https?:\/\/\S+$/i.test(W.link)) return toast(T("الرابط غير صالح؛ انسخه كاملًا ويبدأ بـ https://", "The link is not valid; copy it in full, starting with https://"), true);
    if (!n && !W.files.length && !ans && !W.link) return toast(T("لا يوجد ما يُسلَّم: اكتب إجابتك أو أرفق ملفًا", "Nothing to submit: write your answer or attach a file"), true);
    if ((A.worksheet || []).length && ans < A.worksheet.length && !(await confirmSheet(T("أسئلة بلا إجابة", "Unanswered questions"), T(`أجبت عن ${ans} من ${A.worksheet.length} أسئلة. هل تريد التسليم؟`, `You answered ${ans} of ${A.worksheet.length} questions. Submit anyway?`), T("سلّم", "Submit")))) return;
    const sum = [W.link ? T("رابط", "a link") : "", n ? T(n + " كلمة", n + " words") : "", ans ? T(ans + " إجابة في ورقة العمل", ans + " worksheet answers") : "", W.files.length ? T(W.files.length + " ملف", W.files.length + " file(s)") : ""].filter(Boolean).join(T("، ", ", "));
    if (!(await confirmSheet(T("تسليم الواجب", "Submit assignment"), T("سيُسلَّم: ", "You are submitting: ") + esc(sum) + "." + (st.late_now ? `<div class="tipbox tiny" style="margin-top:10px">${T("التسليم متأخر. ", "This submission is late. ")}${esc(policy(A))}</div>` : "") + (A.resubmit ? "" : `<p class="tiny" style="margin-top:8px">${T("لا يمكنك تعديله بعد التسليم.", "You cannot change it after submitting.")}</p>`), T("سلّم الآن", "Submit now")))) return;
    clearTimeout(W.t); W.dirty = true; await flushDraft();
    try {
      const r = await rpc("s_submit", { p_assessment: W.id, p_integrity: true });
      const files = W.files.slice();
      W.a = await rpc("s_assignment", { p_assessment: W.id }); W.files = (W.a.sub.files || []).slice(); drawA();
      openSheet(`<h3>${ic("checkc", "sm")} ${T("وصل تسليمك", "Submission received")}</h3>
        <p class="muted">${T("احتفظ بهذا الإيصال.", "Keep this receipt.")}</p><dl class="kv" style="margin-top:10px"><dt>${T("الواجب", "Assignment")}</dt><dd>${esc(W.a.title)}</dd><dt>${T("النسخة", "Version")}</dt><dd>${r.version}</dd>
        <dt>${T("الوقت", "Time")}</dt><dd>${esc(fmtDT(r.submitted_at))}</dd><dt>${T("الحالة", "Status")}</dt><dd>${r.late_minutes ? T("متأخر ", "Late by ") + esc(lateStr(r.late_minutes)) + (+r.penalty_pct ? T(" · خصم ", " · deduction ") + nf(+r.penalty_pct, 0) + "%" : "") : T("في الموعد", "On time")}</dd></dl>
        ${files.length ? `<div class="receipt" style="margin-top:10px">${files.map((f) => esc(f.name) + "<br>SHA-256 " + esc((f.sha256 || "").slice(0, 16)) + "…").join("<br>")}</div>` : ""}`);
      refreshHome();
    } catch (e) { toast(e.message, true); }
  }
  async function refreshHome() { try { const h0 = await rpc("s_home"); const k = D.en && D.en.enrollment_id; D.home = h0; D.en = h0.enrollments.find((x) => x.enrollment_id === k) || h0.enrollments[0] || null; } catch (e) { } }
  document.addEventListener("click", (e) => { if (e.target.closest("#aGo")) submitA(); });
  window.addEventListener("beforeunload", (e) => { if (W.a && (W.dirty || W.up.length)) { flushDraft(); e.preventDefault(); e.returnValue = ""; } });

  // تبديل اللغة: إعادة رسم ما على الشاشة باللغة الجديدة
  document.addEventListener("langchange", () => {
    renderChaps();
    if (!$("welcomeBox").classList.contains("hide") && D.home) $("wName").textContent = T("أهلًا، ", "Welcome, ") + firstName(D.home.me.full_name);
    if (D.home && !$("vHome").classList.contains("hide")) { if (W.a && location.hash.startsWith("#/assignment/")) drawA(); else route(); }
    if (X.a && !$("vExam").classList.contains("hide")) render();
    if (lastResult && !$("vResult").classList.contains("hide")) result(...lastResult);
    if ($("sheet") && $("sheet").classList.contains("on")) closeSheet();
  });

  // ===================== البداية =====================
  const s0 = session();
  if (s0 && s0.token && s0.role === "student") { if (s0.must_change) { showSite(); showChange(); } else loadHome(); }
  else showSite();
})();

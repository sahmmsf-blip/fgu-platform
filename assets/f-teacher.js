// لوحة المحاضر — بتصميم منظومة المعلّم في منصة السهم العلمي، مع هيكل الجامعة (مقرر ← شعب ← فصول) والأهداف
(function () {
  const { $, esc, toast, openSheet, closeSheet, confirmSheet, initSkin, skinPicker, spin, greet, firstName, fmtDT, toLocalInput, fromLocalInput, download, csv } = U;
  const { rpc, session, setSession, remembered, lvChip, lvBar, nf, pc, outcomeMastery, chaptersOf, emptyBox, LV, lvOf, copy } = F;
  initSkin("teacher", "white");
  const S = { boot: null, sec: null, roster: [], assess: [], book: null, qs: null, ready: false };
  const sec = () => S.boot.sections.find((x) => x.id === S.sec) || null;
  const course = () => S.boot.courses.find((c) => c.id === (sec() || {}).course_id) || S.boot.courses[0];
  const term = (id) => S.boot.terms.find((t) => t.id === id) || {};
  const comp = (id) => course().components.find((c) => c.id === id) || {};
  const chs = () => chaptersOf(course());
  const opt = (sel, list) => list.map((x) => `<option value="${esc(x[0])}" ${String(x[0]) === String(sel) ? "selected" : ""}>${esc(x[1])}</option>`).join("");
  const active = () => (S.book ? S.book.students.filter((s) => s.status === "active") : []);
  let tempPw = null;

  // ===================== الدخول =====================
  $("skinBtnL").onclick = skinPicker;
  $("tEye").onclick = () => { const p = $("tPass"); p.type = p.type === "password" ? "text" : "password"; };
  function err(msg) { const e = $("loginErr"); e.innerHTML = ic("alert", "sm") + "<span>" + esc(msg) + "</span>"; e.classList.remove("hide"); $("portal").classList.remove("shake"); void $("portal").offsetWidth; $("portal").classList.add("shake"); }
  function showLogin(change) { $("app").classList.add("hide"); $("vLogin").classList.remove("hide"); $("tLogin").classList.toggle("hide", !!change); $("tChange").classList.toggle("hide", !change); $("tOldWrap").classList.toggle("hide", !!tempPw); }
  F.setOnAuth((code) => { if (code === "P0402") { tempPw = null; showLogin(true); return; } setSession(null); showLogin(false); err("انتهت الجلسة. سجّل الدخول من جديد."); });
  $("tLogin").addEventListener("submit", async (e) => {
    e.preventDefault(); $("loginErr").classList.add("hide");
    const btn = $("tGo"); spin(btn, true, "جارٍ الدخول…");
    try {
      const r = await rpc("fgu_login", { p_username: $("tUser").value.trim(), p_password: $("tPass").value, p_remember: $("tRem").checked }, true);
      if (r.role !== "teacher") { spin(btn, false); return err("هذا حساب طالب؛ ادخل من صفحة الطلبة."); }
      setSession(r, $("tRem").checked); spin(btn, false);
      if (r.must_change) { tempPw = $("tPass").value; showLogin(true); return; }
      start();
    } catch (x) { spin(btn, false); err(x.message); }
  });
  $("tChange").addEventListener("submit", async (e) => {
    e.preventDefault(); $("loginErr").classList.add("hide");
    if ($("tNew1").value !== $("tNew2").value) return err("كلمتا المرور غير متطابقتين.");
    const btn = $("tChg"); spin(btn, true, "جارٍ الحفظ…");
    try { await rpc("fgu_change_password", { p_old: tempPw || $("tOld").value, p_new: $("tNew1").value }); const s = session(); s.must_change = false; setSession(s, remembered() || $("tRem").checked); tempPw = null; spin(btn, false); start(); }
    catch (x) { spin(btn, false); err(x.message); }
  });

  // ===================== الهيكل =====================
  const NAV = [
    { g: "القيادة" }, { v: "dash", t: "لوحة القيادة", ic: "home" },
    { g: "داخل المقرر" }, { v: "assess", t: "التقويمات ورصد العلامات", ic: "file" }, { v: "book", t: "سجل العلامات", ic: "award" }, { v: "objs", t: "إتقان الأهداف", ic: "target" }, { v: "records", t: "السجلات والطباعة", ic: "printer" },
    { g: "أدوات التقويم" }, { v: "bank", t: "بنك الأسئلة", ic: "layers" },
    { g: "الإدارة" }, { v: "people", t: "الطلبة", ic: "users" }, { v: "settings", t: "الشعب والفصول والإعدادات", ic: "key" }
  ];
  const BNAV = [["dash", "home", "القيادة"], ["assess", "file", "التقويمات"], ["book", "award", "العلامات"], ["people", "users", "الطلبة"], ["_more", "list", "المزيد"]];
  const VIEWS = {};
  function buildShell() {
    $("sideNav").innerHTML = NAV.map((n) => n.g ? `<div class="grp">${esc(n.g)}</div>` : `<a href="#${n.v}" data-v="${n.v}">${ic(n.ic)}<span>${esc(n.t)}</span></a>`).join("");
    $("bNav").innerHTML = BNAV.map(([v, i, t]) => `<a href="${v === "_more" ? "#" : "#" + v}" data-v="${v}">${ic(i)}<span>${t}</span></a>`).join("");
    $("bNav").querySelector('[data-v="_more"]').onclick = (e) => { e.preventDefault(); toggleSide(true); };
    $("menuBtn").onclick = () => toggleSide(true); $("sideScrim").onclick = () => toggleSide(false);
    $("sideNav").addEventListener("click", (e) => { if (e.target.closest("a")) toggleSide(false); });
    $("skinBtn").onclick = skinPicker;
    $("outBtn").onclick = async () => { try { await rpc("fgu_logout"); } catch (e) { } setSession(null); location.hash = ""; location.reload(); };
    $("secPick").onchange = async (e) => { S.sec = e.target.value; try { localStorage.setItem("fgu_t_sec", S.sec); } catch (x) { } await loadSection(); route(); };
    window.addEventListener("hashchange", route);
  }
  function toggleSide(on) { $("side").classList.toggle("on", on); $("sideScrim").classList.toggle("on", on); }
  function fillShell() {
    $("meName").textContent = S.boot.me.full_name; $("meAv").textContent = firstName(S.boot.me.full_name).slice(0, 1);
    const secs = S.boot.sections.filter((s) => !s.archived);
    $("secPick").innerHTML = secs.map((s) => `<option value="${s.id}" ${s.id === S.sec ? "selected" : ""}>${esc(s.name)} — ${esc(term(s.term_id).name || "")}</option>`).join("");
  }
  async function route() {
    if (!S.ready) return;
    // تحديث بيانات الشعبة تلقائيًّا إذا مضى عليها أكثر من 5 ثوانٍ (محاولات الطلبة تصل أولًا بأول)
    if (S.sec && Date.now() - (S.at || 0) > 5000) { try { await loadSection(); } catch (e) { } }
    let [v, arg] = (location.hash || "#dash").slice(1).split("/");
    if (!VIEWS[v]) v = "dash";
    const def = VIEWS[v];
    document.querySelectorAll(".side-nav a,.bnav a").forEach((a) => a.classList.toggle("on", a.dataset.v === (def.nav || v)));
    $("pgTitle").textContent = def.title; $("pgSub").textContent = course().title + (sec() ? " — " + sec().name + " · " + (term(sec().term_id).name || "") : "");
    $("secPickWrap").classList.toggle("hide", !def.secAware || !S.boot.sections.some((s) => !s.archived));
    fillShell();
    const el = $("view");
    if (def.secAware && !sec()) { el.innerHTML = emptyBox("users", "لا توجد شعبة فعّالة", "أنشئ شعبة من «الشعب والفصول والإعدادات».", '<div style="margin-top:14px"><a class="btn primary" href="#settings">الشعب والفصول</a></div>'); return; }
    try { const r = def.render(el, arg ? decodeURIComponent(arg) : null); if (r && r.catch) r.catch((e) => (el.innerHTML = emptyBox("alert", "حدث خطأ", esc(e.message)))); }
    catch (e) { console.error(e); el.innerHTML = emptyBox("alert", "حدث خطأ أثناء عرض الصفحة", esc(e.message)); }
    window.scrollTo(0, 0);
  }
  async function loadBoot() {
    S.boot = await rpc("t_bootstrap");
    const secs = S.boot.sections.filter((s) => !s.archived);
    let saved = null; try { saved = localStorage.getItem("fgu_t_sec"); } catch (e) { }
    if (!secs.find((s) => s.id === S.sec)) S.sec = (secs.find((s) => s.id === saved) || secs.find((s) => term(s.term_id).is_current) || secs[0] || {}).id || null;
  }
  async function loadSection() {
    if (!S.sec) { S.roster = []; S.assess = []; S.book = null; return; }
    [S.roster, S.assess, S.book] = await Promise.all([rpc("t_roster", { p_section: S.sec }), rpc("t_assessments", { p_section: S.sec }), rpc("t_gradebook", { p_section: S.sec })]);
    S.at = Date.now();
  }
  async function reload() { Object.keys(RC).forEach((k) => delete RC[k]); await loadBoot(); await loadSection(); route(); }
  async function start() {
    $("vLogin").classList.add("hide"); $("app").classList.remove("hide");
    $("view").innerHTML = '<div class="card pad loading">جارٍ التحميل…</div>';
    try { await loadBoot(); await loadSection(); } catch (e) { if (e.code !== "P0401" && e.code !== "P0402") $("view").innerHTML = emptyBox("alert", "تعذّر التحميل", esc(e.message)); return; }
    S.ready = true; fillShell(); route();
  }
  if (!S.shellBuilt) { buildShell(); S.shellBuilt = true; }

  // ===================== لوحة القيادة =====================
  VIEWS.dash = { title: "لوحة القيادة", secAware: true, render(el) {
    const st = active(), c = course(), s0 = sec();
    const tot = st.map((s) => s.total).filter((v) => v != null), ws = st.length ? Math.max(0, ...st.map((s) => s.wsofar || 0)) : 0;
    const avg = tot.length ? tot.reduce((a, b) => a + b, 0) / tot.length : null;
    const om = {}; st.forEach((s) => Object.entries(s.objs || {}).forEach(([k, v]) => { om[k] = om[k] || [0, 0]; om[k][0] += +v[0]; om[k][1] += +v[1]; }));
    const weak = Object.entries(om).filter(([, v]) => v[1] > 0).map(([k, v]) => [k, v[0] / v[1] * 100]).sort((a, b) => a[1] - b[1]).slice(0, 8);
    const never = S.roster.filter((r) => r.status === "active" && !r.last_login).length;
    const quizzes = S.assess.filter((a) => a.kind === "quiz"), openQ = quizzes.filter((a) => a.published && (!a.open_at || new Date(a.open_at) <= new Date()) && (!a.close_at || new Date(a.close_at) > new Date()));
    const risks = st.filter((s) => s.total != null && s.wsofar && s.total / s.wsofar < 0.6).sort((a, b) => a.total / a.wsofar - b.total / b.wsofar);
    const alerts = [];
    if (!st.length) alerts.push({ lvl: "warn", ic: "users", msg: "لا طلبة في الشعبة بعد", sub: "أضفهم لصقًا من Excel بالرقم الجامعي والاسم.", go: "#people", act: "أضف الطلبة" });
    if (never) alerts.push({ lvl: "tip", ic: "id", msg: `${never} طالبًا لم يدخلوا المنصة بعد`, sub: "يدخل كل طالب برقمه الجامعي، وكلمة مروره الأولى هي رقمه الجامعي نفسه.", go: "#people", act: "الطلبة" });
    if (!c.qcount) alerts.push({ lvl: "warn", ic: "layers", msg: "بنك الأسئلة فارغ", sub: "الاختبارات القصيرة الإلكترونية تحتاج أسئلة مربوطة بالأهداف.", go: "#bank", act: "بنك الأسئلة" });
    S.assess.filter((a) => a.kind === "manual" && a.entered < st.length && st.length).slice(0, 3).forEach((a) => alerts.push({ lvl: "tip", ic: "file", msg: `«${a.title}» رُصد لـ ${a.entered} من ${st.length}`, sub: "أكمل رصد العلامات.", go: "#assess", act: "رصد" }));
    S.assess.filter((a) => a.kind === "assignment" && a.ungraded).forEach((a) => alerts.push({ lvl: "warn", ic: "inbox", msg: `«${a.title}»: ${a.ungraded} تسليمًا بانتظار التصحيح`, sub: "صحّح بالروبرك، ثم انشر العلامات ليراها الطلبة.", go: "#grade/" + a.id, act: "صحّح" }));
    S.assess.filter((a) => a.kind === "assignment" && !(a.assign && a.assign.released) && a.graded && a.graded >= a.subs && a.close_at && new Date(a.close_at) < new Date()).forEach((a) => alerts.push({ lvl: "tip", ic: "eye", msg: `«${a.title}» صُحّح ولم تُنشر علاماته`, sub: "لا يرى الطلبة علاماتهم حتى تنشرها.", go: "#grade/" + a.id, act: "انشر" }));
    S.assess.filter((a) => !a.published).slice(0, 3).forEach((a) => alerts.push({ lvl: "tip", ic: "eyeoff", msg: `«${a.title}» مخفي عن الطلبة`, sub: "انشره ليظهر في صفحاتهم.", go: "#assess", act: "التقويمات" }));
    let h = `<div class="vhead"><div><h2>${greet()}، الأستاذ ${esc(firstName(S.boot.me.full_name))}</h2>
      <p>${esc(new Intl.DateTimeFormat("ar-JO-u-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Amman" }).format(new Date()))} · الشعبة الحالية: <b>${esc(s0.name)}</b></p></div>
      <div class="toolbar"><a class="btn primary" href="#assess">${ic("file", "sm")}تقويم جديد</a><a class="btn outline" href="#book">${ic("award", "sm")}سجل العلامات</a><a class="btn outline" href="#people">${ic("users", "sm")}الطلبة</a></div></div>`;
    h += `<div class="kpi-row">
      <div class="kp">${ic("users")}<b class="num">${st.length}</b><span>طالبًا في الشعبة</span><small>${st.length - never} منهم دخلوا المنصة</small></div>
      <div class="kp">${ic("award")}<b class="num">${avg != null ? nf(avg, 1) : "—"}</b><span>متوسط المجموع</span><small>${ws ? "من " + nf(ws, 0) + " محتسبة حتى الآن" : "من 100 — لم تُرصد علامات بعد"}</small></div>
      <div class="kp">${ic("file")}<b class="num">${S.assess.length}</b><span>تقويمًا في الشعبة</span><small>${quizzes.length} منها اختبارات قصيرة</small></div>
      <div class="kp ${risks.length ? "warn" : ""}">${ic("alert")}<b class="num">${risks.length}</b><span>يحتاجون دعمًا</span><small>نسبتهم أقل من 60٪ مما احتُسب</small></div>
      <div class="kp">${ic("layers")}<b class="num">${c.qcount}</b><span>سؤالًا في البنك</span><small>${openQ.length} اختبار مفتوح الآن</small></div></div>`;
    h += '<div class="split" style="margin-top:22px"><div>';
    h += `<div class="sect" style="margin-top:0"><h3>${ic("spark", "sm")}يحتاج انتباهك <span class="tiny">${alerts.length ? alerts.length + " بندًا" : ""}</span></h3>`;
    h += alerts.length ? '<div class="alerts">' + alerts.map((a) => `<a class="al ${a.lvl}" href="${a.go}" style="text-decoration:none;color:inherit"><span class="dot">${ic(a.ic, "sm")}</span><span class="tx">${esc(a.msg)}<small>${esc(a.sub)}</small></span><span class="btn sm soft">${esc(a.act)}</span></a>`).join("") + "</div>"
      : emptyBox("checkc", "كل شيء على ما يرام", "لا يوجد ما يحتاج تدخّلك الآن.");
    h += "</div>";
    h += `<div class="sect"><h3>${ic("target", "sm")}خريطة إتقان الشعبة <span class="tiny">الأهداف الأضعف أولًا</span></h3>`;
    h += weak.length ? '<div class="card pad stack">' + weak.map(([k, p]) => `<a href="#objs" style="color:inherit;text-decoration:none"><div class="row sp" style="font-size:13.5px;align-items:flex-start"><span><span class="lbl-chip" dir="ltr">${k}</span> ${esc((c.objectives.find((o) => o.code === k) || {}).text || "")}</span><b class="num">${pc(p)}</b></div><div style="margin-top:6px">${lvBar(p)}</div></a>`).join("") + "</div>"
      : emptyBox("target", "لم يُقَس أي هدف بعد لهذه الشعبة", "ارصد تقويمًا يدويًّا مقسّمًا على الأهداف، أو انشر اختبارًا قصيرًا.");
    h += "</div></div><div>";
    h += `<div class="card pad"><h3 style="font-size:15.5px;margin-bottom:10px">${ic("award", "sm")} توزيع العلامات</h3><div class="list">` +
      c.components.map((k) => { const v = st.map((s) => s.comps[k.id]).filter((x) => x != null); const a = v.length ? v.reduce((x, y) => x + y, 0) / v.length : null;
        return `<div class="li"><div><b>${esc(k.title)}</b><div class="tiny">متوسط الشعبة ${pc(a)}</div></div><span class="pill">${nf(+k.weight, 0)}٪</span></div>`; }).join("") + "</div></div>";
    h += `<div class="sect"><h3>${ic("user", "sm")}يحتاجون دعمًا</h3>`;
    h += risks.length ? '<div class="risk">' + risks.slice(0, 6).map((x) => `<a class="rk" href="#objs/${x.enrollment_id}" style="text-decoration:none;color:inherit"><span class="avatar avb" style="width:32px;height:32px;font-size:13px">${esc(firstName(x.full_name).slice(0, 1))}</span>
        <span><b style="font-size:14px">${esc(x.full_name)}</b><div class="why">${nf(x.total, 1)} من ${nf(x.wsofar, 0)}</div></span><span class="scorepill">${pc(x.total / x.wsofar * 100)}</span></a>`).join("") + "</div>"
      : '<div class="card pad tiny">لا يوجد طالب نسبته أقل من 60٪ حسب البيانات الحالية.</div>';
    h += "</div>";
    h += `<div class="sect"><h3>${ic("users", "sm")}الشعب</h3><div class="stack">` + S.boot.sections.filter((s) => !s.archived).map((s) => `<button class="card secard" data-sec="${s.id}" style="${s.id === S.sec ? "border-color:var(--accent)" : ""}"><div class="hd"><span class="av">${esc(s.name.replace(/\D/g, "") || s.name.slice(0, 2))}</span>
        <div class="grow"><b>${esc(s.name)}</b><div class="tiny">${esc(term(s.term_id).name || "")} · ${s.n} طالبًا</div></div></div></button>`).join("") + "</div></div>";
    h += "</div></div>";
    el.innerHTML = h;
    el.querySelectorAll("[data-sec]").forEach((b) => (b.onclick = async () => { S.sec = b.dataset.sec; try { localStorage.setItem("fgu_t_sec", S.sec); } catch (e) { } await loadSection(); route(); }));
  } };

  // ===================== الطلبة =====================
  VIEWS.people = { title: "الطلبة", secAware: true, render(el) {
    const R = S.roster, s0 = sec(), act = R.filter((r) => r.status === "active"), wd = R.filter((r) => r.status !== "active");
    let h = `<div class="vhead"><div><h2>${esc(s0.name)} — ${esc(term(s0.term_id).name || "")}</h2><p>${act.length} طالبًا · يدخل الطالب برقمه الجامعي، وكلمة المرور الأولى هي رقمه الجامعي، ويُجبَر على تغييرها في أول دخول</p></div>
      <div class="toolbar"><button class="btn primary" id="pAdd">${ic("file", "sm")}إضافة طلبة (لصق من Excel)</button><button class="btn outline" id="pLink">${ic("refresh", "sm")}ربط طلبة سابقين</button><button class="btn outline" id="pCards">${ic("printer", "sm")}بطاقات الدخول</button></div></div>`;
    h += act.length ? `<div class="tw"><table class="t"><thead><tr><th class="num">م</th><th>الرقم الجامعي</th><th>اسم الطالب</th><th>آخر دخول</th><th class="num">الحالة</th><th></th></tr></thead><tbody>` +
      act.map((r, i) => `<tr><td class="num">${i + 1}</td><td class="mono" dir="ltr" style="text-align:right">${esc(r.username)}</td><td><a href="#objs/${r.enrollment_id}" style="color:inherit"><b>${esc(r.full_name)}</b></a></td>
        <td class="tiny">${r.last_login ? esc(fmtDT(r.last_login, false)) : '<span class="pill scheduled">لم يدخل بعد</span>'}${r.must_change && r.last_login ? ' <span class="pill">ينتظر تغيير كلمة المرور</span>' : ""}</td>
        <td class="num">${r.active ? '<span class="pill open">فعّال</span>' : '<span class="pill ended">موقوف</span>'}</td>
        <td><div class="row" style="gap:6px;justify-content:flex-end"><button class="btn sm outline" data-reset="${r.student_id}">${ic("key", "sm")}إعادة كلمة المرور</button><button class="btn sm ghost" data-edit="${r.student_id}">تعديل</button><button class="btn sm ghost" data-wd="${r.enrollment_id}">انسحاب</button></div></td></tr>`).join("") + "</tbody></table></div>"
      : emptyBox("users", "لا طلبة في هذه الشعبة بعد", "الصق قائمتهم من Excel: الرقم الجامعي ثم الاسم.", '<button class="btn primary" id="pAdd2" style="margin-top:12px">إضافة طلبة</button>');
    if (wd.length) h += `<details class="card pad" style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">المنسحبون (${wd.length})</summary>` + wd.map((r) => `<div class="row sp" style="padding:7px 0;border-bottom:1px solid var(--line)"><span>${esc(r.full_name)} · <span class="mono">${esc(r.username)}</span></span><button class="btn sm outline" data-back="${r.enrollment_id}">إعادة تسجيل</button></div>`).join("") + "</details>";
    el.innerHTML = h;
    [el.querySelector("#pAdd"), el.querySelector("#pAdd2")].forEach((b) => b && (b.onclick = addStudents));
    el.querySelector("#pLink").onclick = linkStudents;
    el.querySelector("#pCards").onclick = () => cards(act.map((r) => ({ username: r.username, full_name: r.full_name })), "بطاقات الدخول — " + s0.name);
    el.querySelectorAll("[data-reset]").forEach((b) => (b.onclick = async () => {
      const r = R.find((x) => x.student_id === b.dataset.reset);
      if (!(await confirmSheet("إعادة كلمة المرور", `ستعود كلمة مرور الطالب <b>${esc(r.full_name)}</b> إلى رقمه الجامعي <b class="mono">${esc(r.username)}</b>، وتتوقف كلمته الحالية، ويُطلب منه تغييرها عند الدخول.`, "إعادة"))) return;
      try { const x = await rpc("t_reset_password", { p_student: r.student_id }); cards([{ username: x.username, full_name: r.full_name, password: x.password }], "أُعيدت كلمة المرور"); await loadSection(); }
      catch (e) { toast(e.message, true); }
    }));
    el.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => {
      const r = R.find((x) => x.student_id === b.dataset.edit);
      const s = openSheet(`<h3>تعديل بيانات الطالب</h3><div class="fields"><label class="field"><span>الاسم الكامل</span><input class="input" id="eN" value="${esc(r.full_name)}"></label>
        <label class="field"><span>الرقم الجامعي (اسم الدخول)</span><input class="input mono" id="eU" dir="ltr" value="${esc(r.username)}"></label>
        <label class="field"><span>البريد الإلكتروني (اختياري)</span><input class="input" id="eE" dir="ltr" value="${esc(r.email || "")}"></label></div>
        <label class="check"><input type="checkbox" id="eA" ${r.active ? "checked" : ""}> الحساب فعّال (إيقافه يمنع دخوله إلى المنصة)</label>
        <p class="tiny">صحّح الرقم الجامعي هنا إن كان خطأ؛ يدخل الطالب بعدها بالرقم الجديد وبكلمة مروره نفسها.</p><button class="btn primary block" id="eS" style="margin-top:12px">حفظ</button>`);
      s.querySelector("#eS").onclick = async (e) => { spin(e.target, true); try { await rpc("t_update_student", { p_student: r.student_id, p: { full_name: s.querySelector("#eN").value, username: s.querySelector("#eU").value, email: s.querySelector("#eE").value, active: s.querySelector("#eA").checked } }); closeSheet(); toast("حُفظ"); await loadSection(); route(); } catch (x) { toast(x.message, true); spin(e.target, false); } };
    }));
    el.querySelectorAll("[data-wd],[data-back]").forEach((b) => (b.onclick = async () => {
      try { await rpc("t_set_enrollment", { p_enrollment: b.dataset.wd || b.dataset.back, p_status: b.dataset.wd ? "withdrawn" : "active" }); await reload(); } catch (e) { toast(e.message, true); }
    }));
  } };
  function addStudents() {
    const s = openSheet(`<h3>إضافة طلبة إلى ${esc(sec().name)}</h3><p class="tiny">الصق من Excel عمودين: <b>الرقم الجامعي | الاسم الكامل</b> (ويمكن عمود ثالث للبريد). كل طالب في سطر.<br>
      كلمة المرور الأولى لكل طالب جديد = رقمه الجامعي، ويُجبَر على تغييرها في أول دخول. وإذا كان رقمه موجودًا من فصل سابق يُربط حسابه نفسه دون تغيير كلمته.</p>
      <textarea class="input mono" id="aT" rows="9" dir="auto" placeholder="2026001	أحمد محمد علي"></textarea><div class="tiny" id="aP" style="margin-top:6px"></div>
      <button class="btn primary block" id="aGo" style="margin-top:10px">إضافة</button>`, true);
    const parse = () => s.querySelector("#aT").value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => { const p = l.split(/\t|,|،|;/).map((x) => x.trim()); if (p.length < 2) { const i = l.indexOf(" "); return { username: l.slice(0, i), full_name: l.slice(i + 1).trim() }; } return { username: p[0], full_name: p[1], email: p[2] || "" }; });
    s.querySelector("#aT").oninput = () => { const r = parse(); s.querySelector("#aP").textContent = r.length ? r.length + " طالبًا: " + r.slice(0, 3).map((x) => x.username + " — " + x.full_name).join("، ") + (r.length > 3 ? "…" : "") : ""; };
    s.querySelector("#aGo").onclick = async (e) => {
      const rows = parse(); if (!rows.length) return toast("الصق قائمة الطلبة أولًا", true);
      spin(e.target, true, "جارٍ الإضافة…");
      try { const res = await rpc("t_add_students", { p_section: S.sec, p_rows: rows }); toast("أُضيف " + res.length + " طالبًا"); await reload(); const nw = res.filter((x) => x.password); if (nw.length) cards(nw, "بطاقات دخول الطلبة الجدد"); else closeSheet(); }
      catch (x) { toast(x.message, true); spin(e.target, false); }
    };
  }
  async function linkStudents() {
    let all; try { all = await rpc("t_all_students"); } catch (e) { return toast(e.message, true); }
    const inSec = new Set(S.roster.map((r) => r.student_id)), cand = all.filter((x) => !inSec.has(x.id));
    const s = openSheet(`<h3>ربط طلبة سابقين بـ ${esc(sec().name)}</h3><p class="tiny">يحتفظ الطالب بحسابه وكلمة مروره، وتبقى علاماته في الشعب السابقة كما هي.</p>` + (cand.length ?
      `<input class="input" id="lQ" placeholder="ابحث بالاسم أو الرقم الجامعي" style="margin:8px 0"><div class="tw" style="max-height:55vh"><table class="t"><thead><tr><th></th><th>الرقم الجامعي</th><th>الاسم</th><th>شعبه السابقة</th></tr></thead><tbody>` +
      cand.map((x) => `<tr data-q="${esc((x.username + " " + x.full_name).toLowerCase())}"><td><input type="checkbox" value="${x.id}"></td><td class="mono">${esc(x.username)}</td><td>${esc(x.full_name)}</td><td class="tiny">${esc(x.sections.join("، "))}</td></tr>`).join("") +
      `</tbody></table></div><button class="btn primary block" id="lGo" style="margin-top:10px">ربط المحددين</button>` : emptyBox("users", "لا يوجد طلبة سابقون غير مسجّلين في هذه الشعبة", "")), true);
    if (!cand.length) return;
    s.querySelector("#lQ").oninput = (e) => { const v = e.target.value.trim().toLowerCase(); s.querySelectorAll("tr[data-q]").forEach((tr) => tr.classList.toggle("hide", !!v && !tr.dataset.q.includes(v))); };
    s.querySelector("#lGo").onclick = async (e) => {
      const ids = [...s.querySelectorAll("input[type=checkbox]:checked")].map((x) => x.value); if (!ids.length) return toast("اختر طالبًا واحدًا على الأقل", true);
      spin(e.target, true); try { await rpc("t_enroll", { p_section: S.sec, p_students: ids }); closeSheet(); toast("رُبط " + ids.length + " طالبًا"); await reload(); } catch (x) { toast(x.message, true); spin(e.target, false); }
    };
  }
  function cards(list, title) {
    const url = location.origin + location.pathname.replace(/teacher\.html$/, ""), withPw = list.some((x) => x.password);
    const s = openSheet(`<h3>${esc(title)}</h3><p class="tiny noprint">${withPw ? "كلمة المرور الأولى = الرقم الجامعي، ويُجبَر الطالب على تغييرها عند أول دخول." : "الدخول بالرقم الجامعي. كلمة المرور الأولى هي الرقم الجامعي نفسه، ومن غيّرها ونسيها تعيدها له من «إعادة كلمة المرور»."}</p>
      <div class="tw"><table class="t creds"><thead><tr><th>الاسم</th><th>الرقم الجامعي (اسم الدخول)</th>${withPw ? "<th>كلمة المرور الأولى</th>" : ""}</tr></thead><tbody>
      ${list.map((x) => `<tr><td>${esc(x.full_name)}</td><td class="mono">${esc(x.username)}</td>${withPw ? `<td class="pw">${esc(x.password || "— (حساب سابق، كلمته كما هي)")}</td>` : ""}</tr>`).join("")}</tbody></table></div>
      <p class="tiny" style="margin-top:10px">رابط المنصة: <span dir="ltr">${esc(url)}</span></p>
      <div class="row noprint" style="margin-top:12px"><button class="btn outline grow" id="cC">${ic("file", "sm")}نسخ كنص</button><button class="btn primary grow" onclick="window.print()">${ic("printer", "sm")}طباعة</button></div>`, true);
    s.querySelector("#cC").onclick = () => copy(list.map((x) => x.full_name + "\t" + x.username + (x.password ? "\t" + x.password : "")).join("\n") + "\n" + url);
  }

  // ===================== التقويمات ورصد العلامات =====================
  VIEWS.assess = { title: "التقويمات ورصد العلامات", secAware: true, render(el) {
    const c = course(), st = active();
    let h = `<div class="vhead"><div><h2>التقويمات</h2><p>مرتبة على توزيع العلامات في الخطة الدراسية. كل تقويم يدوي يُقسَّم إلى أجزاء مربوطة بأهداف الفصول، والاختبار القصير يُسحب من بنك الأسئلة.</p></div>
      <div class="toolbar"><button class="btn primary" id="aNew">＋ تقويم جديد</button></div></div>`;
    h += c.components.map((k) => { const A = S.assess.filter((a) => a.component_id === k.id);
      return `<div class="sect"><h3>${ic(k.kind === "quiz" ? "file" : k.kind === "project" ? "flag" : k.kind === "tasks" ? "check" : "award", "sm")}${esc(k.title)} <span class="pill">${nf(+k.weight, 0)}٪</span></h3>` +
        (A.length ? '<div class="g2">' + A.map((a) => { const codes = a.kind === "quiz" ? (a.quiz.objectives || []) : [...new Set(a.parts.map((p) => p.objective_code))];
          const isA = a.kind === "assignment", prog = a.kind === "quiz" ? a.takers : isA ? a.subs : a.entered, of = st.length || 1;
          return `<div class="card secard"><div class="row sp"><b style="font-family:var(--f-disp)">${esc(a.title)}</b><span class="row" style="gap:4px">${isA ? `<span class="pill ${a.assign && a.assign.released ? "brand" : ""}">${a.assign && a.assign.released ? "العلامات منشورة" : "العلامات غير منشورة"}</span>` : ""}<span class="pill ${a.published ? "open" : "scheduled"}">${a.published ? "منشور" : "مخفي"}</span></span></div>
            <div class="tiny">${isA ? `واجب على المنصة · ${a.parts.length} معايير روبرك · من ${nf(+a.max_score, 2)} · سلّم ${a.subs} من ${st.length} · صُحّح ${a.graded}${a.ungraded ? ` · <b style="color:var(--accent)">ينتظر التصحيح ${a.ungraded}</b>` : ""} · الموعد ${esc(fmtDT(a.close_at, false))}${a.counted ? "" : " · لا يُحتسب"}` : a.kind === "quiz" ? `اختبار قصير · ${a.quiz.n} أسئلة${a.quiz.minutes ? " · " + a.quiz.minutes + " د" : ""} · ${a.attempts} محاولة من ${a.takers} طالبًا${a.close_at ? " · يُغلق " + esc(fmtDT(a.close_at, false)) : ""}` : `يدوي · ${a.parts.length} أجزاء · من ${nf(+a.max_score, 2)} · رُصد لـ ${a.entered} من ${st.length}`}${isA || a.counted ? "" : " · لا يُحتسب"}</div>
            <div class="meter"><i style="width:${Math.round(prog / of * 100)}%"></i></div>
            <div class="row wrap" style="gap:4px">${codes.slice(0, 10).map((x) => `<span class="lbl-chip" dir="ltr">${x}</span>`).join("")}${codes.length > 10 ? `<span class="tiny">+${codes.length - 10}</span>` : ""}</div>
            <div class="row wrap" style="gap:6px">${a.kind === "manual" ? `<button class="btn sm primary" data-marks="${a.id}">${ic("check", "sm")}رصد العلامات</button>` : ""}${isA ? `<a class="btn sm primary" href="#grade/${a.id}">${ic("inbox", "sm")}التسليمات والتصحيح</a><button class="btn sm outline" data-rel="${a.id}">${a.assign && a.assign.released ? "إخفاء العلامات" : "نشر العلامات"}</button>` : ""}<button class="btn sm outline" data-ed="${a.id}">تعديل</button><button class="btn sm ghost" data-del="${a.id}">حذف</button></div></div>`; }).join("") + "</div>"
          : '<div class="card pad tiny">لا تقويمات في هذا المكوّن بعد.</div>') + "</div>"; }).join("");
    el.innerHTML = h;
    el.querySelector("#aNew").onclick = () => editAssessment(null);
    el.querySelectorAll("[data-ed]").forEach((b) => (b.onclick = () => editAssessment(S.assess.find((a) => a.id === b.dataset.ed))));
    el.querySelectorAll("[data-marks]").forEach((b) => (b.onclick = () => marks(S.assess.find((a) => a.id === b.dataset.marks))));
    el.querySelectorAll("[data-rel]").forEach((b) => (b.onclick = async () => { const a = S.assess.find((x) => x.id === b.dataset.rel); if (await releaseFlow(a.id, !(a.assign && a.assign.released), a.title, a.ungraded)) await reload(); }));
    el.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
      const a = S.assess.find((x) => x.id === b.dataset.del);
      if (!(await confirmSheet("حذف التقويم", `سيُحذف «${esc(a.title)}» نهائيًّا مع كل علاماته ومحاولات الطلبة فيه.`, "حذف", true))) return;
      try { await rpc("t_delete_assessment", { p_id: a.id }); toast("حُذف"); await reload(); } catch (e) { toast(e.message, true); }
    }));
  } };
  function objPicker(sel) {
    const set = new Set(sel || []);
    return '<div class="objpick">' + chs().map((ch) => `<details><summary><input type="checkbox" data-chall="${ch.ch}"> الفصل ${ch.ch}: ${esc(ch.title)} <span class="pill" data-chc="${ch.ch}"></span></summary>
      ${ch.objs.map((o) => `<label class="ob"><input type="checkbox" name="qo" value="${o.code}" data-ch="${ch.ch}" ${set.has(o.code) ? "checked" : ""}><span><b dir="ltr">${o.code}</b> ${esc(o.text)}</span></label>`).join("")}</details>`).join("") + "</div>";
  }
  async function editAssessment(a) {
    const c = course();
    if (!S.qs) { try { S.qs = await rpc("t_questions", { p_course: c.id }); } catch (e) { return toast(e.message, true); } }
    const k0 = a ? a.component_id : c.components[0].id, isQ = (id) => comp(id).kind === "quiz";
    const objOpts = (sel) => chs().map((ch) => `<optgroup label="الفصل ${ch.ch}">${ch.objs.map((o) => `<option value="${o.code}" ${o.code === sel ? "selected" : ""}>${o.code} — ${esc(o.text.slice(0, 60))}</option>`).join("")}</optgroup>`).join("");
    const s = openSheet(`<h3>${a ? "تعديل تقويم" : "تقويم جديد"}</h3>
      <div class="fields two"><label class="field"><span>المكوّن (من توزيع العلامات)</span><select class="input" id="xC">${opt(k0, c.components.map((k) => [k.id, k.title + " (" + nf(+k.weight, 0) + "٪)"]))}</select></label>
        <label class="field"><span>العنوان</span><input class="input" id="xT" value="${esc(a ? a.title : "")}" placeholder="مثال: اختبار الفصل 6 / المحطة 3"></label></div>
      <label class="field"><span>طريقة التقويم</span><select class="input" id="xK" ${a ? "disabled" : ""}><option value="manual">يدوي: أرصد العلامات بنفسي مقسّمة على الأهداف</option><option value="quiz">اختبار قصير إلكتروني يحلّه الطالب على المنصة</option><option value="assignment">واجب / ورقة عمل يسلّمها الطالب على المنصة ويُصحَّح بروبرك</option></select></label>
      <div class="row wrap" style="gap:16px;margin-bottom:10px"><label class="check"><input type="checkbox" id="xP" ${a && a.published ? "checked" : ""}> منشور للطلبة</label><label class="check"><input type="checkbox" id="xN" ${!a || a.counted ? "checked" : ""}> يُحتسب في العلامة</label></div>
      <div id="xMan"><div class="tipbox tiny" style="margin-bottom:10px">قسّم التقويم إلى أجزاء (أسئلة أو بنود معيار تصحيح) واربط كل جزء بهدف؛ فتُحسب العلامة وإتقان كل هدف تلقائيًّا.</div>
        <div class="partrow tiny" style="font-weight:700"><span>الجزء</span><span>الهدف</span><span>العلامة القصوى</span><span></span></div><div id="xParts"></div>
        <div class="row wrap" style="gap:8px;margin-top:8px"><button class="btn sm outline" id="xAdd">＋ جزء</button><select class="input" id="xFill" style="width:auto;min-height:34px"><option value="">تعبئة: جزء لكل هدف من فصل…</option>${chs().map((ch) => `<option value="${ch.ch}">الفصل ${ch.ch}</option>`).join("")}</select>
          <span class="tiny" style="margin-inline-start:auto">المجموع: <b class="num" id="xSum">0</b></span></div></div>
      <div id="xQuiz" class="hide"><div class="fields four">
        <label class="field"><span>أسئلة كل محاولة</span><input class="input" type="number" id="qN" min="1" value="${a && a.quiz ? a.quiz.n : 10}"></label>
        <label class="field"><span>العلامة القصوى</span><input class="input" type="number" id="qM" min="1" value="${a ? +a.max_score : 10}"></label>
        <label class="field"><span>المدة بالدقائق (0 بلا حد)</span><input class="input" type="number" id="qT" min="0" value="${a && a.quiz ? (a.quiz.minutes || 0) : 15}"></label>
        <label class="field"><span>المحاولات (0 غير محدود)</span><input class="input" type="number" id="qA" min="0" value="${a && a.quiz ? (a.quiz.attempts || 0) : 0}"></label></div>
        <div class="fields two"><label class="field"><span>يفتح في</span><input class="input" type="datetime-local" id="qO" value="${a && a.open_at ? toLocalInput(a.open_at) : ""}"></label>
          <label class="field"><span>يُغلق في</span><input class="input" type="datetime-local" id="qC" value="${a && a.close_at ? toLocalInput(a.close_at) : ""}"></label></div>
        <div class="tipbox tiny" style="margin-bottom:10px">حسب الخطة الدراسية: يُعاد الاختبار القصير وتُحتسب أفضل محاولة. تُسحب أسئلة عشوائية من الأهداف المختارة مع خلط البدائل، وتظهر الإجابات الصحيحة بعد الإغلاق فقط، ومن لم يحلّه حتى الإغلاق يُحسب له صفر.</div>
        <b style="font-size:14px">الأهداف التي يقيسها <span class="tiny" id="qAv"></span></b>${objPicker(a && a.quiz ? a.quiz.objectives : [])}</div>
      ${asgForm(a)}
      <button class="btn primary block lg" id="xS" style="margin-top:14px">حفظ التقويم</button>`, true);
    const kS = s.querySelector("#xK"); kS.value = a ? a.kind : (isQ(k0) ? "quiz" : "manual");
    const showK = () => { s.querySelector("#xMan").classList.toggle("hide", kS.value !== "manual"); s.querySelector("#xQuiz").classList.toggle("hide", kS.value !== "quiz"); s.querySelector("#xAsg").classList.toggle("hide", kS.value !== "assignment"); };
    s.querySelector("#xC").onchange = () => { if (!a) { kS.value = isQ(s.querySelector("#xC").value) ? "quiz" : "manual"; showK(); } };
    kS.onchange = showK; showK();
    const AW = asgWire(s, a, objOpts);
    const box = s.querySelector("#xParts");
    const sum = () => (s.querySelector("#xSum").textContent = [...box.querySelectorAll("[data-pm]")].reduce((t, x) => t + (+x.value || 0), 0));
    const addRow = (p) => { const d = document.createElement("div"); d.className = "partrow"; if (p && p.id) d.dataset.id = p.id;
      d.innerHTML = `<input class="input" data-pl value="${esc(p ? p.label : "س" + (box.children.length + 1))}"><select class="input" data-po>${objOpts(p && p.objective_code)}</select><input class="input" type="number" data-pm min="0.25" step="0.25" value="${p ? +p.max_score : 5}"><button class="btn sm ghost" type="button" data-rm>✕</button>`;
      box.appendChild(d); d.querySelector("[data-rm]").onclick = () => { d.remove(); sum(); }; d.querySelector("[data-pm]").oninput = sum; d.oninput = () => (d.dataset.touched = 1); sum(); };
    (a && a.parts.length ? a.parts : a ? [] : [null]).forEach(addRow);
    s.querySelector("#xAdd").onclick = () => addRow(null);
    s.querySelector("#xFill").onchange = (e) => { const ch = chs().find((x) => x.ch === +e.target.value); if (!ch) return; if (!a && box.children.length === 1 && !box.children[0].dataset.touched) box.children[0].remove(); ch.objs.forEach((o) => addRow({ label: "ب " + o.code, objective_code: o.code, max_score: 5 })); e.target.value = ""; };
    const upd = () => { chs().forEach((ch) => { const all = [...s.querySelectorAll(`input[name=qo][data-ch="${ch.ch}"]`)], on = all.filter((x) => x.checked).length, h = s.querySelector(`[data-chall="${ch.ch}"]`); h.checked = on === all.length; h.indeterminate = on > 0 && on < all.length; s.querySelector(`[data-chc="${ch.ch}"]`).textContent = on ? on + "/" + all.length : ""; });
      const sel = new Set([...s.querySelectorAll("input[name=qo]:checked")].map((x) => x.value)); s.querySelector("#qAv").textContent = "— متاح في البنك " + S.qs.filter((q) => q.active && sel.has(q.objective_code)).length + " سؤالًا"; };
    s.querySelectorAll("[data-chall]").forEach((h) => { h.onclick = (e) => e.stopPropagation(); h.onchange = () => { s.querySelectorAll(`input[name=qo][data-ch="${h.dataset.chall}"]`).forEach((x) => (x.checked = h.checked)); upd(); }; });
    s.querySelectorAll("input[name=qo]").forEach((x) => (x.onchange = upd)); upd();
    s.querySelector("#xS").onclick = async (e) => {
      const p = { id: a ? a.id : null, section_id: S.sec, component_id: s.querySelector("#xC").value, title: s.querySelector("#xT").value, kind: kS.value, published: s.querySelector("#xP").checked, counted: s.querySelector("#xN").checked };
      if (p.kind === "assignment") { try { Object.assign(p, AW.collect()); } catch (x) { return toast(x.message, true); } }
      else if (p.kind === "manual") { p.parts = [...box.children].map((d) => ({ id: d.dataset.id || null, label: d.querySelector("[data-pl]").value, objective_code: d.querySelector("[data-po]").value, max_score: +d.querySelector("[data-pm]").value })); if (p.parts.some((x) => !(x.max_score > 0))) return toast("العلامة القصوى لكل جزء يجب أن تكون أكبر من صفر", true); }
      else { p.max_score = +s.querySelector("#qM").value; p.open_at = fromLocalInput(s.querySelector("#qO").value); p.close_at = fromLocalInput(s.querySelector("#qC").value);
        p.quiz = { n: +s.querySelector("#qN").value, minutes: +s.querySelector("#qT").value, attempts: +s.querySelector("#qA").value, objectives: [...s.querySelectorAll("input[name=qo]:checked")].map((x) => x.value) }; }
      spin(e.target, true, "جارٍ الحفظ…");
      try {
        const r = await rpc("t_save_assessment", { p });
        for (const f of AW.pending) { try { await FF.upload(f, { assessment: r.id, role: "brief" }); } catch (x) { toast("«" + f.name + "»: " + x.message, true); } }
        closeSheet(); toast("حُفظ التقويم"); await reload();
      } catch (x) { toast(x.message, true); spin(e.target, false); }
    };
  }
  async function marks(a) {
    let sc; try { sc = await rpc("t_scores", { p_assessment: a.id }); } catch (e) { return toast(e.message, true); }
    const st = active();
    const s = openSheet(`<h3>رصد علامات: ${esc(a.title)}</h3><p class="tiny">الخانة الفارغة = لم تُرصد بعد (وتُحسب صفرًا ما دام التقويم يُحتسب). Enter للانتقال إلى الطالب التالي.</p>
      <div class="tw" style="max-height:62vh"><table class="t sticky1"><thead><tr><th>الطالب</th>${a.parts.map((p) => `<th class="num">${esc(p.label)}<div class="tiny" dir="ltr">${p.objective_code} · /${+p.max_score}</div></th>`).join("")}<th class="num">المجموع /${nf(+a.max_score, 2)}</th></tr></thead><tbody>
      ${st.map((x) => `<tr data-e="${x.enrollment_id}"><td><b>${esc(x.full_name)}</b><div class="tiny mono">${esc(x.username)}</div></td>${a.parts.map((p) => { const v = sc[x.enrollment_id + ":" + p.id]; return `<td class="num"><input class="input mark-in num" type="number" min="0" max="${+p.max_score}" step="0.25" data-p="${p.id}" data-max="${+p.max_score}" value="${v == null ? "" : +v}" data-o="${v == null ? "" : +v}"></td>`; }).join("")}<td class="num" data-tot></td></tr>`).join("")}
      </tbody></table></div><div class="row" style="margin-top:12px"><span class="tiny grow" id="mChg"></span><button class="btn primary" id="mS">${ic("check", "sm")}حفظ العلامات</button></div>`, true);
    const ins = [...s.querySelectorAll("input.mark-in")];
    const recalc = () => { let ch = 0; s.querySelectorAll("tr[data-e]").forEach((tr) => { let t = 0; tr.querySelectorAll("input").forEach((i) => { const v = i.value === "" ? null : +i.value; i.classList.toggle("bad", v != null && (v < 0 || v > +i.dataset.max)); t += v || 0; if (i.value !== i.dataset.o) ch++; }); tr.querySelector("[data-tot]").textContent = nf(t, 2); }); s.querySelector("#mChg").textContent = ch ? "• " + ch + " تعديلًا غير محفوظ" : ""; };
    ins.forEach((i, k) => { i.oninput = recalc; i.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); const n = ins[k + a.parts.length] || ins[k + 1]; if (n) n.focus(); } }; });
    recalc();
    s.querySelector("#mS").onclick = async (e) => {
      if (s.querySelector("input.mark-in.bad")) return toast("في علامات خارج المدى المسموح", true);
      const rows = []; s.querySelectorAll("tr[data-e]").forEach((tr) => tr.querySelectorAll("input").forEach((i) => { if (i.value !== i.dataset.o) rows.push({ enrollment_id: tr.dataset.e, part_id: i.dataset.p, score: i.value === "" ? null : +i.value }); }));
      if (!rows.length) return closeSheet();
      spin(e.target, true, "جارٍ الحفظ…");
      try { await rpc("t_save_scores", { p_rows: rows }); closeSheet(); toast("حُفظت " + rows.length + " علامة"); await reload(); } catch (x) { toast(x.message, true); spin(e.target, false); }
    };
  }

  // ===================== سجل العلامات =====================
  VIEWS.book = { title: "سجل العلامات", secAware: true, render(el) {
    const B = S.book, st = B.students, byC = B.components.map((k) => ({ k, A: B.assessments.filter((a) => a.component_id === k.id) }));
    const G2 = F.evalGroups(B.components).find((g) => g.key === "second"), lastSecond = G2 ? G2.comps[G2.comps.length - 1].id : null;
    let h = `<div class="vhead"><div><h2>سجل علامات ${esc(sec().name)}</h2><p>النسبة لكل تقويم من 100٪. المنتصف والنهائي والمشروع: علامة التقويم نفسه. المشاركة والمهام والكويزات: لكل هدف قيس فيها ${course().obj_rule === "latest" ? "أحدث" : "أعلى"} قياس، ثم متوسط الأهداف × الوزن. والمجموع من الأوزان المحتسبة حتى الآن.</p></div>
      <div class="toolbar"><button class="btn outline" id="bCsv">${ic("file", "sm")}تصدير Excel</button><button class="btn outline" onclick="window.print()">${ic("printer", "sm")}طباعة</button></div></div>`;
    h += st.length ? `<div class="tw"><table class="t sticky1"><thead><tr><th rowspan="2">الطالب</th>${byC.map((x) => `<th class="num" colspan="${x.A.length + 1}">${esc(x.k.title)} (${nf(+x.k.weight, 0)}٪)</th>` + (x.k.id === lastSecond ? `<th class="num" rowspan="2" style="background:var(--accent-soft)">التقويم الثاني<br><span class="tiny">من ${nf(G2.weight, 0)}</span></th>` : "")).join("")}<th class="num" rowspan="2">المجموع</th><th class="num" rowspan="2">من</th></tr>
      <tr>${byC.map((x) => x.A.map((a) => `<th class="num" title="${esc(a.title)}">${esc(a.title.slice(0, 14))}${a.published ? "" : " *"}${a.kind === "assignment" && !(S.assess.find((y) => y.id === a.id) || { assign: {} }).assign.released ? " †" : ""}</th>`).join("") + '<th class="num">العلامة</th>').join("")}</tr></thead><tbody>` +
      st.map((x) => `<tr${x.status !== "active" ? ' style="opacity:.5"' : ""}><td><a href="#objs/${x.enrollment_id}" style="color:inherit"><b>${esc(x.full_name)}</b></a><div class="tiny mono">${esc(x.username)}</div></td>
        ${byC.map((c) => c.A.map((a) => `<td class="num">${x.items[a.id] == null ? "—" : nf(x.items[a.id], 1)}</td>`).join("") + `<td class="num"><b>${x.comps[c.k.id] == null ? "—" : nf(x.comps[c.k.id] * c.k.weight / 100, 2)}</b></td>` + (c.k.id === lastSecond ? `<td class="num" style="background:var(--accent-soft)"><b>${F.groupMark(x, G2) == null ? "—" : nf(F.groupMark(x, G2), 2)}</b></td>` : "")).join("")}
        <td class="num"><b class="score">${x.total == null ? "—" : nf(x.total, 2)}</b></td><td class="num tiny">${x.wsofar ? nf(x.wsofar, 0) : "100"}</td></tr>`).join("") + '</tbody></table></div><p class="tiny" style="margin-top:8px">* تقويم مخفي عن الطلبة (يظهر لك فقط). † واجب لم تُنشر علاماته بعد (تراه أنت ولا يراه الطالب). في الواجب: من لم يسلّم بعد انتهاء الموعد يُحسب له صفر، والمعفى لا يُحتسب.</p>'
      : emptyBox("users", "لا طلبة بعد", "");
    el.innerHTML = h;
    el.querySelector("#bCsv") && (el.querySelector("#bCsv").onclick = () => {
      const head = ["الرقم الجامعي", "الاسم", ...byC.flatMap((x) => [...x.A.map((a) => a.title + " ٪"), x.k.title + " (" + x.k.weight + ")", ...(x.k.id === lastSecond ? ["التقويم الثاني (" + G2.weight + ")"] : [])]), "المجموع", "الأوزان المحتسبة"];
      const rows = st.map((x) => [x.username, x.full_name, ...byC.flatMap((c) => [...c.A.map((a) => x.items[a.id] ?? ""), x.comps[c.k.id] != null ? Math.round(x.comps[c.k.id] * c.k.weight) / 100 : "", ...(c.k.id === lastSecond ? [F.groupMark(x, G2) == null ? "" : Math.round(F.groupMark(x, G2) * 100) / 100] : [])]), x.total ?? "", x.wsofar ?? 0]);
      download("علامات " + sec().name + ".csv", csv([head, ...rows]));
    });
  } };

  // ===================== إتقان الأهداف =====================
  VIEWS.objs = { title: "إتقان الأهداف", secAware: true, render(el, arg) {
    const c = course(), st = active();
    if (arg) { const x = S.book.students.find((s) => s.enrollment_id === arg); if (x) return studentProfile(el, x); }
    const agg = {}; st.forEach((s) => Object.entries(s.objs || {}).forEach(([k, v]) => { agg[k] = agg[k] || [0, 0, 0]; agg[k][0] += +v[0]; agg[k][1] += +v[1]; agg[k][2]++; }));
    const oc = outcomeMastery(c, Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, [v[0], v[1]]])));
    let h = `<div class="vhead"><div><h2>إتقان الأهداف — ${esc(sec().name)}</h2><p>النسبة = ما حصّله الطلبة في الأجزاء والأسئلة المربوطة بالهدف ÷ العلامات القصوى لها. المستويات بنظام المنصة: مبتدئ · نامٍ · متمكّن · متميّز.</p></div>
      <div class="toolbar"><select class="input" id="oStu" style="min-width:220px"><option value="">ملف طالب…</option>${st.map((x) => `<option value="${x.enrollment_id}">${esc(x.full_name)}</option>`).join("")}</select></div></div>`;
    h += `<div class="sect" style="margin-top:0"><h3>${ic("chart", "sm")}نتاجات المقرر (الخطة الدراسية)</h3><div class="card list">` + oc.map((o) => `<div class="li" style="align-items:flex-start"><div class="grow"><span class="lbl-chip">${o.seq}</span> ${esc(o.text)}<div style="margin-top:6px">${lvBar(o.pct)}</div></div><div style="text-align:left;min-width:90px"><b class="num">${pc(o.pct)}</b><div>${lvChip(o.pct)}</div></div></div>`).join("") + "</div></div>";
    h += `<div class="sect"><h3>${ic("target", "sm")}أهداف الفصول — متوسط الشعبة</h3>` + chs().map((ch, i) => { const cnt = [0, 0, 0, 0, 0]; ch.objs.forEach((o) => { const v = agg[o.code]; cnt[v && v[1] ? lvOf(v[0] / v[1] * 100) : 0]++; });
      return `<details class="unit" ${i === 0 ? "open" : ""}><summary><div class="ibox">${ic("layers")}</div><div class="grow"><h3>الفصل ${ch.ch}: ${esc(ch.title)}</h3><div class="tiny">${ch.objs.length} أهداف · قيس منها ${ch.objs.length - cnt[0]}</div></div>
        <div class="dist">${[1, 2, 3, 4].map((k) => `<i class="d${k}" style="width:${(cnt[k] / ch.objs.length) * 100}%"></i>`).join("")}</div></summary>
        ${ch.objs.map((o) => { const v = agg[o.code], p = v && v[1] ? v[0] / v[1] * 100 : null; return `<div class="oc"><span class="lbl-chip" dir="ltr">${o.code}</span><span>${esc(o.text)}${v ? `<span class="tiny" style="display:block">${pc(p)} · ${v[2]} طالبًا</span>` : ""}</span>${lvChip(p)}</div>`; }).join("")}</details>`; }).join("") + "</div>";
    el.innerHTML = h;
    el.querySelector("#oStu").onchange = (e) => { if (e.target.value) location.hash = "#objs/" + e.target.value; };
  } };
  function studentProfile(el, x) {
    const c = course(), O = x.objs || {}, oc = outcomeMastery(c, O);
    let h = `<div class="vhead"><div><h2>${esc(x.full_name)}</h2><p>الرقم الجامعي <span class="mono">${esc(x.username)}</span> · المجموع <b>${x.total == null ? "—" : nf(x.total, 2)}</b> من ${nf(x.wsofar || 0, 0)}</p></div>
      <div class="toolbar"><a class="btn outline" href="#objs">${ic("right", "sm")}كل الشعبة</a><button class="btn outline" onclick="window.print()">${ic("printer", "sm")}طباعة التقرير</button></div></div>`;
    h += '<div class="kpi-row">' + c.components.map((k) => `<div class="kp">${ic("award")}<b class="num">${x.comps[k.id] == null ? "—" : nf(x.comps[k.id] * k.weight / 100, 2)}</b><span>${esc(k.title)}</span><small>من ${nf(+k.weight, 0)}</small></div>`).join("") + "</div>";
    h += `<div class="sect"><h3>${ic("chart", "sm")}نتاجات المقرر</h3><div class="card list">` + oc.map((o) => `<div class="li"><div class="grow"><span class="lbl-chip">${o.seq}</span> ${esc(o.text)}<div style="margin-top:6px">${lvBar(o.pct)}</div></div><b class="num">${pc(o.pct)}</b></div>`).join("") + "</div></div>";
    h += `<div class="sect"><h3>${ic("target", "sm")}أهداف الفصول</h3>` + chs().map((ch) => `<details class="unit"><summary><div class="ibox">${ic("layers")}</div><div class="grow"><h3>الفصل ${ch.ch}: ${esc(ch.title)}</h3></div></summary>
      ${ch.objs.map((o) => { const v = O[o.code], p = v && +v[1] ? v[0] / v[1] * 100 : null; return `<div class="oc"><span class="lbl-chip" dir="ltr">${o.code}</span><span>${esc(o.text)}${v ? `<span class="tiny" style="display:block">${nf(+v[0], 2)} من ${nf(+v[1], 2)} · ${pc(p)}</span>` : ""}</span>${lvChip(p)}</div>`; }).join("")}</details>`).join("") + "</div>";
    el.innerHTML = h;
  }

  // ===================== بنك الأسئلة =====================
  VIEWS.bank = { title: "بنك الأسئلة", async render(el) {
    const c = course();
    if (!S.qs) { el.innerHTML = '<div class="card pad loading">جارٍ تحميل البنك…</div>'; S.qs = await rpc("t_questions", { p_course: c.id }); }
    const Q = S.qs, cnt = {}; Q.forEach((q) => { if (q.active) cnt[q.objective_code] = (cnt[q.objective_code] || 0) + 1; });
    let h = `<div class="vhead"><div><h2>بنك الأسئلة</h2><p>${Q.filter((q) => q.active).length} سؤالًا فعّالًا و${Q.filter((q) => !q.active).length} مؤرشفًا. كل سؤال مربوط بهدف من أهداف الفصول، ومنه تُسحب الاختبارات القصيرة.</p></div>
      <div class="toolbar"><button class="btn primary" id="qNew">＋ سؤال</button><button class="btn outline" id="qImp">${ic("file", "sm")}استيراد ملف أسئلة</button></div></div>
      <div class="card pad" style="margin-bottom:12px"><div class="row wrap" style="gap:8px"><select class="input" id="fCh" style="width:auto"><option value="">كل الفصول</option>${chs().map((ch) => `<option value="${ch.ch}">الفصل ${ch.ch} (${ch.objs.reduce((t, o) => t + (cnt[o.code] || 0), 0)})</option>`).join("")}</select>
        <select class="input" id="fOb" style="width:auto"><option value="">كل الأهداف</option>${c.objectives.map((o) => `<option value="${o.code}">${o.code} (${cnt[o.code] || 0})</option>`).join("")}</select>
        <label class="check"><input type="checkbox" id="fAr"> المؤرشفة</label></div></div><div id="qList"></div>`;
    el.innerHTML = h;
    const draw = () => {
      const ch = el.querySelector("#fCh").value, ob = el.querySelector("#fOb").value, ar = el.querySelector("#fAr").checked;
      const Lq = Q.filter((q) => (ar || q.active) && (!ob || q.objective_code === ob) && (!ch || q.objective_code.split("-")[0] === ch));
      el.querySelector("#qList").innerHTML = Lq.length ? '<div class="stack">' + Lq.slice(0, 300).map((q) => `<div class="card pad qitem" style="${q.active ? "" : "opacity:.55"}"><div class="row sp"><span class="row" style="gap:6px"><span class="lbl-chip" dir="ltr">${q.objective_code}</span>${q.difficulty ? `<span class="pill">${esc(q.difficulty)}</span>` : ""}${q.bloom ? `<span class="pill">${esc(q.bloom)}</span>` : ""}</span>
        <span class="row" style="gap:6px"><button class="btn sm outline" data-qe="${q.id}">تعديل</button><button class="btn sm ghost" data-qa="${q.id}">${q.active ? "أرشفة" : "استرجاع"}</button></span></div>
        <div class="stem" style="margin-top:8px">${esc(q.stem)}</div><div class="opts">${q.options.map((o, i) => `<div class="opt rvo ${i === q.correct ? "is-ok" : ""}"><span class="L">${"abcdef"[i]}</span><span class="grow">${esc(o)}</span></div>`).join("")}</div>
        ${q.explanation ? `<p class="tiny" style="margin-top:8px">التفسير: ${esc(q.explanation)}</p>` : ""}</div>`).join("") + "</div>" + (Lq.length > 300 ? '<p class="tiny">يُعرض أول 300 سؤال؛ استعمل التصفية.</p>' : "")
        : emptyBox("layers", "لا أسئلة بهذه التصفية", Q.length ? "" : "يُضاف بنك أسئلة الكتاب كاملًا عبر «استيراد ملف أسئلة».");
      el.querySelectorAll("[data-qe]").forEach((b) => (b.onclick = () => editQ(Q.find((q) => q.id === b.dataset.qe))));
      el.querySelectorAll("[data-qa]").forEach((b) => (b.onclick = async () => { const q = Q.find((x) => x.id === b.dataset.qa); try { await rpc("t_set_question_active", { p_id: q.id, p_active: !q.active }); q.active = !q.active; S.boot = await rpc("t_bootstrap"); route(); } catch (e) { toast(e.message, true); } }));
    };
    ["#fCh", "#fOb", "#fAr"].forEach((x) => (el.querySelector(x).onchange = draw)); draw();
    el.querySelector("#qNew").onclick = () => editQ(null);
    el.querySelector("#qImp").onclick = () => {
      const s = openSheet(`<h3>استيراد ملف أسئلة</h3><p class="tiny">ملف JSON كما يُسلَّم مع بنك الكتاب: مصفوفة عناصر بالشكل <span dir="ltr">{"objective_code":"6-2","stem":"…","options":["…","…","…","…"],"correct":0,"difficulty":"متوسط","bloom":"تطبيق","explanation":"…"}</span></p>
        <input type="file" class="input" id="iF" accept=".json,application/json" style="margin:8px 0"><textarea class="input mono" id="iT" rows="8" dir="ltr"></textarea><div class="tiny" id="iP"></div>
        <button class="btn primary block" id="iGo" style="margin-top:10px">استيراد</button>`, true);
      const parse = () => { const j = JSON.parse(s.querySelector("#iT").value); return Array.isArray(j) ? j : j.questions; };
      s.querySelector("#iT").oninput = () => { try { s.querySelector("#iP").textContent = parse().length + " سؤالًا جاهزًا للاستيراد."; } catch (e) { s.querySelector("#iP").textContent = "النص ليس ملف أسئلة صالحًا بعد."; } };
      s.querySelector("#iF").onchange = async (e) => { const f = e.target.files[0]; if (f) { s.querySelector("#iT").value = await f.text(); s.querySelector("#iT").oninput(); } };
      s.querySelector("#iGo").onclick = async (e) => {
        let arr; try { arr = parse(); } catch (x) { return toast("الملف غير صالح", true); }
        spin(e.target, true, "جارٍ الاستيراد…");
        try { let n = 0; for (let i = 0; i < arr.length; i += 200) n += (await rpc("t_import_questions", { p_course: c.id, p_rows: arr.slice(i, i + 200) })).n; closeSheet(); toast("استُورد " + n + " سؤالًا"); S.qs = null; S.boot = await rpc("t_bootstrap"); route(); }
        catch (x) { toast(x.message, true); spin(e.target, false); }
      };
    };
  } };
  function editQ(q) {
    const c = course();
    const s = openSheet(`<h3>${q ? "تعديل سؤال" : "سؤال جديد"}</h3>
      <label class="field"><span>الهدف</span><select class="input" id="qO">${chs().map((ch) => `<optgroup label="الفصل ${ch.ch}: ${esc(ch.title)}">${ch.objs.map((o) => `<option value="${o.code}" ${q && q.objective_code === o.code ? "selected" : ""}>${o.code} — ${esc(o.text.slice(0, 70))}</option>`).join("")}</optgroup>`).join("")}</select></label>
      <label class="field"><span>نص السؤال</span><textarea class="input" id="qS" rows="3">${esc(q ? q.stem : "")}</textarea></label>
      <div class="tiny" style="margin-bottom:6px">البدائل — اختر الدائرة بجانب الإجابة الصحيحة</div><div id="qOp"></div><button class="btn sm outline" id="qAdd" type="button">＋ بديل</button>
      <div class="fields two" style="margin-top:10px"><label class="field"><span>الصعوبة</span><select class="input" id="qD">${opt(q && q.difficulty, [["", "—"], ["سهل", "سهل"], ["متوسط", "متوسط"], ["صعب", "صعب"]])}</select></label>
        <label class="field"><span>مستوى بلوم</span><select class="input" id="qB">${opt(q && q.bloom, [["", "—"], ["تذكّر", "تذكّر"], ["فهم", "فهم"], ["تطبيق", "تطبيق"], ["تحليل", "تحليل"], ["تقويم", "تقويم"], ["إبداع", "إبداع"]])}</select></label></div>
      <label class="field"><span>التفسير (يظهر للطالب بعد إغلاق الاختبار)</span><textarea class="input" id="qE" rows="2">${esc(q ? q.explanation || "" : "")}</textarea></label>
      <button class="btn primary block" id="qSv">حفظ السؤال</button>`, true);
    const box = s.querySelector("#qOp");
    const add = (t, on) => { const d = document.createElement("div"); d.className = "row"; d.style.marginBottom = "6px"; d.innerHTML = `<input type="radio" name="qc" ${on ? "checked" : ""}><input class="input grow" data-o value="${esc(t || "")}"><button class="btn sm ghost" type="button">✕</button>`; box.appendChild(d); d.querySelector("button").onclick = () => d.remove(); };
    (q ? q.options : ["", "", "", ""]).forEach((o, i) => add(o, q ? i === q.correct : i === 0));
    s.querySelector("#qAdd").onclick = () => add("", false);
    s.querySelector("#qSv").onclick = async (e) => {
      const rows = [...box.children], opts = rows.map((r) => r.querySelector("[data-o]").value.trim()), correct = rows.findIndex((r) => r.querySelector("input[type=radio]").checked);
      if (opts.some((o) => !o)) return toast("لا تترك بديلًا فارغًا", true); if (correct < 0) return toast("حدّد الإجابة الصحيحة", true);
      spin(e.target, true);
      try { await rpc("t_save_question", { p_course: c.id, q: { id: q ? q.id : null, objective_code: s.querySelector("#qO").value, stem: s.querySelector("#qS").value, options: opts, correct, difficulty: s.querySelector("#qD").value || null, bloom: s.querySelector("#qB").value || null, explanation: s.querySelector("#qE").value || null } }); closeSheet(); toast("حُفظ السؤال"); S.qs = null; S.boot = await rpc("t_bootstrap"); route(); }
      catch (x) { toast(x.message, true); spin(e.target, false); }
    };
  }

  // ===================== الإعدادات =====================
  VIEWS.settings = { title: "الشعب والفصول والإعدادات", render(el) {
    const B = S.boot, c = course();
    let h = `<div class="vhead"><div><h2>الشعب والفصول الدراسية</h2><p>مبدئيًّا شعبة واحدة؛ أضف شعبة أو احذفها في أي فصل، واربط طلبة الفصول السابقة بحساباتهم من صفحة «الطلبة».</p></div>
      <div class="toolbar"><button class="btn primary" id="sNew">＋ شعبة</button><button class="btn outline" id="tNew">＋ فصل دراسي</button></div></div><div class="g2">`;
    h += `<div class="card pad"><h3 style="font-size:16px;margin-bottom:10px">${ic("users", "sm")} الشُّعب</h3><div class="list">` + B.sections.map((s) => `<div class="li" style="${s.archived ? "opacity:.55" : ""}"><div><b>${esc(s.name)}</b>${s.archived ? ' <span class="pill">مؤرشفة</span>' : ""}<div class="tiny">${esc(term(s.term_id).name || "")} · ${s.n} طالبًا${s.schedule ? " · " + esc(s.schedule) : ""}</div></div>
      <div class="row" style="gap:6px"><button class="btn sm outline" data-se="${s.id}">تعديل</button>${s.archived ? `<button class="btn sm ghost" data-sun="${s.id}">استرجاع</button>` : `<button class="btn sm ghost" data-sd="${s.id}">حذف</button>`}</div></div>`).join("") + '</div><p class="tiny" style="margin-top:8px">الشعبة التي فيها طلبة أو تقويمات لا تُحذف بل تُؤرشف، فتبقى سجلاتها.</p></div>';
    h += `<div class="card pad"><h3 style="font-size:16px;margin-bottom:10px">${ic("cal", "sm")} الفصول الدراسية</h3><div class="list">` + B.terms.map((t) => `<div class="li"><div><b>${esc(t.name)}</b>${t.is_current ? ' <span class="pill open">الحالي</span>' : ""}<div class="tiny">${t.starts ? esc(t.starts) + " — " + esc(t.ends || "") : ""}</div></div><button class="btn sm outline" data-te="${t.id}">تعديل</button></div>`).join("") + "</div></div>";
    h += `<div class="card pad"><h3 style="font-size:16px;margin-bottom:10px">${ic("award", "sm")} توزيع العلامات (الخطة الدراسية)</h3><div class="list">` + c.components.map((k) => `<div class="li"><span>${esc(k.title)}</span><b class="num">${nf(+k.weight, 0)}٪</b></div>`).join("") + `<div class="li"><b>المجموع</b><b class="num">${nf(c.components.reduce((t, k) => t + +k.weight, 0), 0)}٪</b></div></div></div>`;
    h += `<div class="card pad"><h3 style="font-size:16px;margin-bottom:10px">${ic("target", "sm")} احتساب المشاركة والمهام والكويزات</h3>
      <p class="tiny" style="margin-bottom:10px">لكل هدف قيس في هذين المكوّنين يُحتسب قياس واحد للطالب، ثم علامة المكوّن = متوسط الأهداف المقيسة × وزنه (على نهج منصة السهم العلمي). الهدف الذي لم يُقس لا يدخل في الحساب.</p>
      <div class="seg" id="sRule"><button data-r="highest" aria-pressed="${(c.obj_rule || "highest") === "highest"}">الأعلى: أفضل قياس للهدف</button><button data-r="latest" aria-pressed="${c.obj_rule === "latest"}">الأحدث: آخر قياس للهدف</button></div></div>`;
    h += `<div class="card pad"><h3 style="font-size:16px;margin-bottom:10px">${ic("inbox", "sm")} ملفات الواجبات والأرشفة</h3><div id="stor" class="stbox" style="margin-bottom:10px"><div><span>المساحة</span><b>…</b></div></div>
      <p class="tiny" style="margin-bottom:10px">ملفات الطلبة محفوظة داخل قاعدة البيانات (الخطة المجانية في Supabase: 500 ميغابايت لقاعدة البيانات كلها). في نهاية الفصل: نزّل ملفات الشعبة كاملة، ثم فرّغها لتوفير المساحة؛ تبقى العلامات والروبرك والتعليقات وسجل التسليم كما هي.</p>
      <div class="row wrap" style="gap:8px"><button class="btn outline" id="arZip">${ic("download", "sm")}تنزيل ملفات الشعبة الحالية (ZIP)</button><button class="btn ghost" id="arPurge">تفريغ ملفات الشعبة الحالية</button></div></div>`;
    h += `<div class="card pad"><h3 style="font-size:16px;margin-bottom:10px">${ic("target", "sm")} قوالب الروبرك وبنك التعليقات</h3><div id="tplBox" class="tiny">جارٍ التحميل…</div></div>`;
    h += `<div class="card pad"><h3 style="font-size:16px;margin-bottom:10px">${ic("user", "sm")} حسابي</h3><label class="field"><span>الاسم</span><input class="input" id="pN" value="${esc(B.me.full_name)}"></label>
      <label class="field"><span>البريد الإلكتروني</span><input class="input" id="pE" dir="ltr" value="${esc(B.me.email || "")}"></label><p class="tiny">اسم الدخول: <b class="mono">${esc(B.me.username)}</b></p>
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn primary" id="pS">حفظ</button><button class="btn outline" id="pW">${ic("lock", "sm")}تغيير كلمة المرور</button></div></div>`;
    el.innerHTML = h + "</div>";
    const secForm = (s) => { const b = openSheet(`<h3>${s ? "تعديل شعبة" : "شعبة جديدة"}</h3><label class="field"><span>اسم الشعبة</span><input class="input" id="sN" value="${esc(s ? s.name : "")}" placeholder="مثال: الشعبة 2"></label>
      <label class="field"><span>الموعد (اختياري)</span><input class="input" id="sD" value="${esc(s ? s.schedule || "" : "")}" placeholder="مثال: الأحد 6–8 مساءً"></label>
      ${s ? "" : `<label class="field"><span>الفصل الدراسي</span><select class="input" id="sT">${opt((B.terms.find((t) => t.is_current) || {}).id, B.terms.map((t) => [t.id, t.name]))}</select></label>`}<button class="btn primary block" id="sGo">حفظ</button>`);
      b.querySelector("#sGo").onclick = async (e) => { spin(e.target, true); try { const r = await rpc("t_save_section", { p: { id: s ? s.id : null, course_id: c.id, term_id: s ? s.term_id : b.querySelector("#sT").value, name: b.querySelector("#sN").value, schedule: b.querySelector("#sD").value } }); closeSheet(); if (!s) { S.sec = r.id; try { localStorage.setItem("fgu_t_sec", r.id); } catch (x) { } } toast("حُفظت الشعبة"); await reload(); } catch (x) { toast(x.message, true); spin(e.target, false); } }; };
    const termForm = (t) => { const b = openSheet(`<h3>${t ? "تعديل فصل دراسي" : "فصل دراسي جديد"}</h3><label class="field"><span>الاسم</span><input class="input" id="tN" value="${esc(t ? t.name : "")}" placeholder="مثال: ربيع 2027"></label>
      <div class="fields two"><label class="field"><span>يبدأ</span><input class="input" type="date" id="tS" value="${esc(t && t.starts || "")}"></label><label class="field"><span>ينتهي</span><input class="input" type="date" id="tE" value="${esc(t && t.ends || "")}"></label></div>
      <label class="check"><input type="checkbox" id="tC" ${t && t.is_current ? "checked" : ""}> الفصل الحالي</label><button class="btn primary block" id="tGo" style="margin-top:12px">حفظ</button>`);
      b.querySelector("#tGo").onclick = async (e) => { spin(e.target, true); try { await rpc("t_save_term", { p: { id: t ? t.id : null, name: b.querySelector("#tN").value, starts: b.querySelector("#tS").value || null, ends: b.querySelector("#tE").value || null, is_current: b.querySelector("#tC").checked } }); closeSheet(); toast("حُفظ"); await reload(); } catch (x) { toast(x.message, true); spin(e.target, false); } }; };
    el.querySelectorAll("#sRule button").forEach((b) => (b.onclick = async () => { try { await rpc("t_set_obj_rule", { p_course: c.id, p_rule: b.dataset.r }); toast("حُفظت طريقة الاحتساب"); await reload(); } catch (x) { toast(x.message, true); } }));
    settingsAssign(el, c);
    el.querySelector("#sNew").onclick = () => secForm(null); el.querySelector("#tNew").onclick = () => termForm(null);
    el.querySelectorAll("[data-se]").forEach((b) => (b.onclick = () => secForm(B.sections.find((s) => s.id === b.dataset.se))));
    el.querySelectorAll("[data-te]").forEach((b) => (b.onclick = () => termForm(B.terms.find((t) => t.id === b.dataset.te))));
    el.querySelectorAll("[data-sun]").forEach((b) => (b.onclick = async () => { const s = B.sections.find((x) => x.id === b.dataset.sun); try { await rpc("t_save_section", { p: { id: s.id, name: s.name, schedule: s.schedule, archived: false } }); await reload(); } catch (e) { toast(e.message, true); } }));
    el.querySelectorAll("[data-sd]").forEach((b) => (b.onclick = async () => { const s = B.sections.find((x) => x.id === b.dataset.sd);
      if (!(await confirmSheet("حذف الشعبة", `حذف «${esc(s.name)}»؟ إن كان فيها طلبة أو تقويمات فستُؤرشف بدل الحذف.`, "متابعة", true))) return;
      try { const r = await rpc("t_delete_section", { p_section: s.id }); toast(r.archived ? "أُرشفت الشعبة" : "حُذفت الشعبة"); await reload(); } catch (e) { toast(e.message, true); } }));
    el.querySelector("#pS").onclick = async (e) => { spin(e.target, true); try { await rpc("t_save_profile", { p: { full_name: el.querySelector("#pN").value, email: el.querySelector("#pE").value } }); toast("حُفظ"); await reload(); } catch (x) { toast(x.message, true); spin(e.target, false); } };
    el.querySelector("#pW").onclick = () => { const b = openSheet(`<h3>تغيير كلمة المرور</h3><label class="field"><span>الحالية</span><input class="input" id="w0" type="password" dir="ltr"></label><label class="field"><span>الجديدة (8 أحرف على الأقل، حروف وأرقام)</span><input class="input" id="w1" type="password" dir="ltr"></label><label class="field"><span>تأكيد الجديدة</span><input class="input" id="w2" type="password" dir="ltr"></label><button class="btn primary block" id="wS">حفظ</button>`);
      b.querySelector("#wS").onclick = async (e) => { if (b.querySelector("#w1").value !== b.querySelector("#w2").value) return toast("كلمتا المرور غير متطابقتين", true); spin(e.target, true); try { await rpc("fgu_change_password", { p_old: b.querySelector("#w0").value, p_new: b.querySelector("#w1").value }); closeSheet(); toast("تغيّرت كلمة المرور"); } catch (x) { toast(x.message, true); spin(e.target, false); } }; };
  } };


  function settingsAssign(el, c) {
    const MB = (b) => nf(b / 1048576, 1) + " م.ب";
    rpc("t_storage").then((r) => { const box = el.querySelector("#stor"); if (box) box.innerHTML = `<div><span>ملفات الواجبات</span><b>${MB(r.bytes)}</b></div><div><span>عدد الملفات</span><b>${r.files}</b></div><div><span>قاعدة البيانات كلها</span><b>${MB(r.db_bytes)} من 500</b></div>`; }).catch(() => { });
    const drawTpl = async () => {
      const box = el.querySelector("#tplBox"); if (!box) return;
      try {
        const [T0, C0] = await Promise.all([rpc("t_templates", { p_course: c.id }), rpc("t_comments", { p_course: c.id })]); G.cm = C0;
        box.innerHTML = `<b>قوالب الروبرك (${T0.length})</b>${T0.length ? '<div class="list">' + T0.map((t) => `<div class="li"><span>${esc(t.title)} <span class="tiny">· ${t.criteria.length} معايير · من ${nf(t.criteria.reduce((a, p) => a + +p.max_score, 0), 2)}</span></span><button class="btn sm ghost" data-td="${t.id}">حذف</button></div>`).join("") + "</div>" : '<p class="tiny">احفظ روبرك أي واجب قالبًا من شاشة تعديله ليُعاد استعماله.</p>'}
          <b style="display:block;margin-top:12px">بنك التعليقات (${C0.length})</b>${C0.length ? '<div class="cbank">' + C0.map((x) => `<span class="cb"><span title="${esc(x.text)}">${esc(x.text)}</span><i data-cd="${x.id}">✕</i></span>`).join("") + "</div>" : '<p class="tiny">تُضاف التعليقات من شاشة التصحيح.</p>'}`;
        box.querySelectorAll("[data-td]").forEach((b) => (b.onclick = async () => { try { await rpc("t_template_del", { p_id: b.dataset.td }); drawTpl(); } catch (e) { toast(e.message, true); } }));
        box.querySelectorAll("[data-cd]").forEach((b) => (b.onclick = async () => { try { await rpc("t_comment_del", { p_id: b.dataset.cd }); drawTpl(); } catch (e) { toast(e.message, true); } }));
      } catch (e) { box.textContent = e.message; }
    };
    drawTpl();
    el.querySelector("#arZip").onclick = (e) => { const L0 = S.assess.filter((a) => a.kind === "assignment"); if (!L0.length) return toast("لا واجبات في هذه الشعبة", true); zipAssign(L0, e.currentTarget, "واجبات " + sec().name); };
    el.querySelector("#arPurge").onclick = async () => {
      if (!sec()) return;
      if (!(await confirmSheet("تفريغ ملفات الشعبة", `ستُحذف من المنصة ملفات تسليم الطلبة وملفات الملاحظات في <b>${esc(sec().name)}</b> نهائيًّا (تبقى ملفات التعليمات، والعلامات، والروبرك، والتعليقات، وسجل التسليم).<br><b>نزّل ملف ZIP أولًا واحفظه.</b>`, "فرّغ الملفات", true))) return;
      try { const r = await rpc("t_purge_files", { p_section: S.sec }); toast("فُرّغ " + r.files + " ملفًا (" + MB(r.bytes) + ")"); route(); } catch (e) { toast(e.message, true); }
    };
  }

  // ===================== السجلات والطباعة (على نمط منصة السهم العلمي) =====================
  // سلّم تقديرات جامعة فلوريدا العالمية (كما اعتمده المحاضر)
  const GRADES = [[95, "A+", 4.00], [90, "A", 3.75], [85, "B+", 3.50], [80, "B", 3.00], [77, "C+", 2.50], [73, "C", 2.00], [70, "C-", 1.75], [67, "D+", 1.50], [60, "D", 1.00], [0, "F", 0.00]];
  const gradeOf = (p) => (p == null ? null : GRADES.find((g) => p >= g[0]));
  const RKINDS = [
    ["sum", "السجل التجميعي", "الأول + مكوّنات الثاني الأدائي ومجموعه + النهائي + المجموع والتقدير"],
    ["marks", "كشف العلامات المختصر", "الأول والثاني والنهائي والمجموع والتقدير فقط"],
    ["det", "السجل التفصيلي", "كل هدف من أهداف الفصول عمود بنص عمودي"],
    ["checklist", "قائمة الشطب", "إتقان أهداف فصول محددة (✓ / ✗)"],
    ["evidence", "سجل القياس بالأدوات", "كل تقويم بأداته وتاريخه وأهدافه (دليل للجامعة)"],
    ["asub", "سجل تسليم الواجبات", "لكل واجب: في الموعد / متأخر / لم يسلّم / معفى، والعلامة"],
    ["arub", "نتائج الروبرك حسب الأهداف", "مستوى كل طالب في كل معيار من معايير الواجبات"]
  ];
  const RF = { kind: "sum", secs: "cur", chs: [], show: "level", sort: "id", only: "all", orient: "auto" };
  const RC = {};   // ذاكرة بيانات الشعب الأخرى
  const DK = { name: "1F2937", info: "16325A", comp: ["1E3A8A", "0F5F58", "7C2D12", "9A3412", "581C87", "155E75"], total: "713F12", grade: "334155", ch: ["065F46", "7C2D12", "581C87", "155E75", "9D174D", "3F6212", "1E3A8A", "9A3412", "0F5F58", "713F12"] };
  const LT = { comp: ["E8EFFF", "E0F5F2", "FDF1E7", "FFF1E6", "F3EBFB", "E6F6FA"], total: "FDF6D8", grade: "F1F5F9" };
  const LVF = ["", "FFE4D6", "FDEFC8", "DDE7FD", "D9F2E1"], LVC = ["", "9A3412", "854D0E", "1E40AF", "166534"];
  const PCSS = `
  .paper{background:#fff;color:#111827;font-family:"IBM Plex Sans Arabic",Arial,sans-serif;direction:rtl}
  .paper .doc{padding:14px 16px;min-width:max-content}
  .paper .doc+.doc{border-top:2px dashed #cbd5e1}
  .rh{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;margin-bottom:10px;border-bottom:2px solid #16325a;padding-bottom:8px}
  .rh .side{font-family:Amiri,serif;font-size:14.5px;font-weight:700;line-height:1.6;color:#1f2937}
  .rh .side img{width:54px;height:54px;border-radius:50%;float:right;margin-left:10px;background:#fff}
  .rh .l{text-align:left}
  .rh .t{text-align:center;font-family:Amiri,serif;font-size:25px;font-weight:700;color:#16325a;line-height:1.25}
  .rh .t span{display:block;font-size:16px;color:#7c2d12}
  table.r{border-collapse:collapse;font-size:12px;margin-inline:auto}
  table.r th,table.r td{border:1px solid #94a3b8;padding:3px 6px;text-align:center;vertical-align:middle}
  table.r th{font-family:Amiri,serif;font-weight:700;font-size:13.5px;color:#fff;line-height:1.3}
  table.r th small{display:block;font-size:11px;font-weight:400;opacity:.92}
  table.r th.vt{padding:6px 1px;width:26px;max-width:30px;vertical-align:bottom}
  table.r th.vt div{writing-mode:vertical-rl;transform:rotate(180deg);font-family:"IBM Plex Sans Arabic",Arial,sans-serif;font-size:10px;font-weight:500;line-height:1.3;max-height:200px;text-align:start;white-space:normal;margin:0 auto}
  table.r td.nm{text-align:right;white-space:nowrap;min-width:170px}
  table.r td.wrap{text-align:right;white-space:normal;max-width:380px;font-size:11.5px}
  table.r td.b{font-weight:700}
  table.r td.dim{color:#9ca3af}
  table.r td.ltr{direction:ltr}
  table.r th.cd{font-family:Arial,sans-serif;font-size:11px;padding:4px 2px;direction:ltr;min-width:30px}
  .lg{columns:2;column-gap:24px;font-size:10.5px;line-height:1.55;color:#1f2937;margin-top:8px;max-width:1100px}
  .lg b{display:block;column-span:all;font-family:Amiri,serif;font-size:13px;color:#16325a;margin-bottom:2px}
  .lg div{break-inside:avoid}.lg span{font-weight:700;color:#7c2d12}
  table.r thead{display:table-header-group}
  table.r tr{break-inside:avoid}
  .rn{font-size:11px;color:#374151;margin-top:8px;line-height:1.7;max-width:1100px}
  .rs{display:flex;justify-content:space-around;margin-top:20px;font-family:Amiri,serif;font-size:14.5px;font-weight:700;color:#1f2937;gap:20px}`;
  const hex = (c) => "#" + c;
  let LOGO_DATA = null;   // الشعار مضمّنًا في الصفحة المطبوعة (لا يعتمد على تحميل ملف من نافذة الطباعة)
  const LOGO_URL = () => LOGO_DATA || new URL("assets/logo.png", location.href).href;
  async function loadLogo() {
    if (LOGO_DATA) return;
    try { const bl = await (await fetch("assets/logo.png")).blob(); LOGO_DATA = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(bl); }); } catch (e) { }
  }
  const XLSX_URL = "https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js";
  function loadScript(src) { return new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error("تعذّر تحميل مكتبة Excel؛ تحقق من الاتصال")); document.head.appendChild(s); }); }

  function printDoc(title, html, orient) {
    const w = window.open("", "_blank");
    if (!w) { toast("اسمح للمتصفح بفتح نافذة جديدة للطباعة", true); return; }
    const land = orient === "landscape";
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
      <style>${PCSS}
      @page{size:A4 ${land ? "landscape" : "portrait"};margin:8mm}
      html,body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .paper .doc{min-width:0;padding:0}.paper .doc+.doc{border:0;break-before:page;page-break-before:always}
      .bar{position:sticky;top:0;background:#16325a;color:#fff;padding:10px 14px;font:14px Arial;display:flex;gap:10px;align-items:center;justify-content:space-between}
      .bar button{background:#fff;color:#16325a;border:0;border-radius:8px;padding:8px 14px;font-weight:700;font-size:14px}
      @media print{.bar{display:none}}</style></head>
      <body><div class="bar"><span>${esc(title)} — A4 ${land ? "أفقي" : "عمودي"}</span><button onclick="window.print()">طباعة / حفظ PDF</button></div>
      <div class="paper" id="pp">${html}</div></body></html>`);
    w.document.close();
    const fit = () => {
      const target = land ? 1060 : 735;
      w.document.querySelectorAll(".doc").forEach((d) => { const wd = Math.max(d.scrollWidth, 1); d.style.zoom = Math.min(1, target / wd).toFixed(3); });
      setTimeout(() => { w.focus(); w.print(); }, 450);
    };
    const go = () => (w.document.fonts && w.document.fonts.ready ? w.document.fonts.ready.then(fit) : fit());
    if (w.document.readyState === "complete") go(); else w.addEventListener("load", go);
  }

  // بيانات شعبة: الحالية من الذاكرة، والأخرى تُجلب عند الحاجة
  async function secData(id) {
    if (id === S.sec) return { book: S.book, assess: S.assess };
    if (!RC[id]) { const [book, assess] = await Promise.all([rpc("t_gradebook", { p_section: id }), rpc("t_assessments", { p_section: id })]); RC[id] = { book, assess }; }
    return RC[id];
  }
  const scopeChs = () => { const all = chs(); return RF.chs.length ? all.filter((c) => RF.chs.includes(c.ch)) : all; };
  const scopeLabel = () => RF.chs.length ? "الفصول: " + RF.chs.slice().sort((a, b) => a - b).join("، ") : "كل فصول الكتاب";
  function rheader(secObj, title, sub) {
    const t = term(secObj.term_id);
    return { title, sub, right: ["جامعة فلوريدا العالمية", "التعليم المهني والمستمر — برنامج ريادة الأعمال"],
      left: ["المقرر: " + course().title, "الشعبة: " + secObj.name, "الفصل الدراسي: " + (t.name || ""), "المحاضر: " + (S.boot.me.full_name || "")] };
  }
  function studs(book) {
    let L = book.students.filter((s) => s.status === "active");
    if (RF.only === "risk") L = L.filter((s) => s.total != null && s.wsofar && s.total / s.wsofar < 0.6);
    if (RF.sort === "alpha") L = L.slice().sort((a, b) => a.full_name.localeCompare(b.full_name, "ar"));
    else if (RF.sort === "total") L = L.slice().sort((a, b) => (b.total == null ? -1 : b.total / (b.wsofar || 1)) - (a.total == null ? -1 : a.total / (a.wsofar || 1)));
    else L = L.slice().sort((a, b) => String(a.username).localeCompare(String(b.username)));
    return L;
  }
  const pctOf = (s) => (s.total != null && s.wsofar ? s.total / s.wsofar * 100 : null);
  const cell = (v, o) => Object.assign({ v: v == null ? "—" : v, dim: v == null }, o || {});
  const base = [{ h: "م", dark: DK.info, w: 5 }, { h: "الرقم الجامعي", dark: DK.info, w: 14 }, { h: "اسم الطالب", dark: DK.name, nm: true, w: 30 }];
  const baseRow = (s, i) => [cell(i + 1), cell(s.username), cell(s.full_name)];

  function rmodel(kind, secObj, D) {
    const book = D.book, C = book.components, L = studs(book);
    const ws = L.length ? Math.max(...L.map((s) => s.wsofar || 0)) : 0;
    let M;
    if (kind === "sum" || kind === "marks") {
      M = rheader(secObj, RKINDS.find((k) => k[0] === kind)[1], secObj.name);
      const EG = F.evalGroups(C), GC = { first: [DK.comp[0], LT.comp[0]], second: [DK.comp[1], LT.comp[1]], final: [DK.comp[3], LT.comp[3]] };
      let groups = [];
      if (kind === "sum") EG.forEach((g) => {
        if (g.key === "second") {
          g.comps.forEach((k) => groups.push({ h: k.title, s: "من " + nf(+k.weight, 0), ids: [k.id], dark: GC.second[0], light: LT.comp[4], g: "second", gt: g.title + " — من " + nf(g.weight, 0) }));
          groups.push({ h: "مجموع التقويم الثاني", s: "من " + nf(g.weight, 0), ids: g.comps.map((k) => k.id), dark: GC.second[0], light: GC.second[1], g: "second", gt: g.title + " — من " + nf(g.weight, 0), b: true });
        } else groups.push({ h: g.title, s: "من " + nf(g.weight, 0), ids: g.comps.map((k) => k.id), dark: GC[g.key][0], light: GC[g.key][1], b: true });
      });
      else groups = EG.map((g) => ({ h: g.title, s: "من " + nf(g.weight, 0), ids: g.comps.map((k) => k.id), dark: GC[g.key][0], light: GC[g.key][1], b: true }));
      M.cols = base.concat(groups.map((g) => ({ h: g.h, s: g.s, dark: g.dark, light: g.light, g: g.g, gt: g.gt, gdark: g.dark, b: g.b, w: 12 })),
        [{ h: "المجموع", s: "من " + (ws ? nf(ws, 0) : "100"), dark: DK.total, light: LT.total, b: true, w: 10 }, { h: "النسبة", dark: DK.total, light: LT.total, w: 9 },
         { h: "التقدير", dark: DK.grade, light: LT.grade, b: true, w: 8 }, { h: "النقاط", dark: DK.grade, light: LT.grade, w: 8 }]);
      M.rows = L.map((s, i) => {
        const p = pctOf(s), g = gradeOf(p);
        return baseRow(s, i).concat(groups.map((gr) => {
          const vals = gr.ids.map((id) => { const k = C.find((x) => x.id === id); return s.comps[id] == null ? null : s.comps[id] * k.weight / 100; }).filter((v) => v != null);
          return cell(vals.length ? nf(vals.reduce((a, b) => a + b, 0), 2) : null, { b: !!gr.b });
        }), [cell(s.total == null ? null : nf(s.total, 2), { b: true }), cell(p == null ? null : nf(p, 1) + "%"),
          cell(g ? g[1] : null, { b: true, color: g && g[1] === "F" ? "B91C1C" : null, fill: g && g[1] === "F" ? "FEE2E2" : null }), cell(g ? g[2].toFixed(2) : null)]);
      });
      M.note = `${ws ? "" : "لم تُرصد علامات بعد. "}المنتصف والنهائي والمشروع: علامة التقويم نفسه × وزنه. المشاركة والمهام والكويزات: لكل هدف قيس فيها يُحتسب ${course().obj_rule === "latest" ? "أحدث" : "أعلى"} قياس للطالب، ثم متوسط الأهداف المقيسة × وزن المكوّن. «المجموع من ${ws ? nf(ws, 0) : 100}» = مجموع أوزان المكوّنات التي فيها علامات محتسبة حتى الآن${ws < 100 ? "؛ لذلك النسبة والتقدير مؤقتان حتى تكتمل الأوزان إلى 100" : ""}. سلّم التقدير: A+ 95–100 (4.00)، A 90–94 (3.75)، B+ 85–89 (3.50)، B 80–84 (3.00)، C+ 77–79 (2.50)، C 73–76 (2.00)، C- 70–72 (1.75)، D+ 67–69 (1.50)، D 60–66 (1.00)، F أقل من 60. يُحسب التقدير من النسبة دون تقريب.`;
      M.sign = true;
    } else if (kind === "det" || kind === "checklist") {
      const CH = scopeChs(), check = kind === "checklist";
      M = rheader(secObj, check ? "قائمة الشطب لإتقان الأهداف" : "السجل التفصيلي لأهداف الفصول", secObj.name + " — " + scopeLabel());
      M.cols = base.slice();
      CH.forEach((ch, ci) => ch.objs.forEach((o) => M.cols.push({ h: o.code, code: true, g: "c" + ch.ch, gt: "الفصل " + ch.ch, dark: DK.ch[ci % 10], gdark: DK.ch[ci % 10], w: 6 })));
      M.legend = CH.flatMap((ch) => ch.objs.map((o) => [o.code, o.text]));
      M.cols.push({ h: check ? "أتقن" : "قيس", s: check ? "من المقيس" : "من الأهداف", dark: DK.total, light: LT.total, b: true, w: 9 });
      const objs = CH.flatMap((c) => c.objs);
      M.rows = L.map((s, i) => {
        let meas = 0, mast = 0;
        const cs = objs.map((o) => {
          const v = (s.objs || {})[o.code];
          if (!v || !+v[1]) return cell(null);
          const p = v[0] / v[1] * 100, k = lvOf(p); meas++; if (p >= 70) mast++;
          if (check) return cell(p >= 70 ? "✓" : "✗", { b: true, color: p >= 70 ? "166534" : "9A3412", fill: p >= 70 ? "D9F2E1" : "FFE4D6" });
          return cell(RF.show === "mark" ? nf(p, 0) : String(k), { b: true, fill: LVF[k], color: LVC[k] });
        });
        return baseRow(s, i).concat(cs, [cell(check ? mast + "/" + meas : meas + "/" + objs.length, { b: true })]);
      });
      M.note = check ? "✓ = متقن (70% فأكثر من علامات الأسئلة والأجزاء المربوطة بالهدف)؛ ✗ = لم يُتقن بعد؛ — = لم يُقَس بعد." :
        (RF.show === "mark" ? "الخلية = نسبة الطالب في الهدف من علامات الأسئلة والأجزاء المربوطة به؛ — = لم يُقَس بعد." :
          "الخلية = مستوى الإتقان: 1 مبتدئ (أقل من 50%)، 2 نامٍ (50–69%)، 3 متمكّن (70–84%)، 4 متميّز (85% فأكثر)؛ — = لم يُقَس بعد.");
      M.sign = true;
    } else if (kind === "asub") {
      const R = D.rep || [], now = new Date();
      M = rheader(secObj, "سجل تسليم الواجبات", secObj.name);
      M.cols = base.slice();
      R.forEach((a, ai) => { const gt = a.title + " — " + (a.close_at ? fmtDT(a.close_at, false) : "");
        M.cols.push({ h: "التسليم", g: "a" + ai, gt, dark: DK.comp[ai % 6], gdark: DK.comp[ai % 6], w: 13 }, { h: "العلامة", s: "من " + nf(+a.max, 2) + (a.released ? "" : " (غير منشورة)"), g: "a" + ai, gt, dark: DK.comp[ai % 6], light: LT.comp[ai % 6], b: true, w: 9 }); });
      M.cols.push({ h: "سلّم", s: "من المطلوب", dark: DK.total, light: LT.total, b: true, w: 9 }, { h: "متأخر", dark: DK.total, light: LT.total, w: 8 }, { h: "لم يسلّم", dark: DK.grade, light: LT.grade, w: 8 });
      M.rows = L.map((s, i) => {
        let req = 0, done = 0, lt = 0, miss = 0;
        const cs = R.flatMap((a) => {
          const sb = a.subs.find((z) => z.enrollment_id === s.enrollment_id) || {}, A = a.assign || {};
          let due = sb.extension_until || a.close_at; if (["penalty", "free"].includes(A.late) && A.cutoff_at && (!due || A.cutoff_at > due)) due = A.cutoff_at;
          if (sb.reopen_until && (!due || sb.reopen_until > due)) due = sb.reopen_until;
          const passed = due && new Date(due) < now;
          if (sb.excused) return [cell("معفى", { color: "475569", fill: "F1F5F9" }), cell(null)];
          if (sb.version > 0) { req++; done++; if (sb.late_minutes > 0) lt++;
            return [sb.late_minutes > 0 ? cell("متأخر " + lateTxt(sb.late_minutes), { color: "854D0E", fill: "FDEFC8", wrap: true }) : cell("✓ في الموعد", { color: "166534", fill: "D9F2E1" }), cell(sb.graded ? nf(+sb.score, 2) : "لم يُصحَّح", { b: true, dim: !sb.graded })]; }
          if (passed) { req++; miss++; return [cell("✗ لم يسلّم", { color: "9A3412", fill: "FFE4D6", b: true }), cell(sb.graded ? nf(+sb.score, 2) : "0", { b: true })]; }
          return [cell("لم يحن الموعد", { dim: true }), cell(null)];
        });
        return baseRow(s, i).concat(cs, [cell(req ? done + "/" + req : null, { b: true }), cell(lt), cell(miss, { color: miss ? "9A3412" : null })]);
      });
      M.note = "✓ في الموعد = سلّم قبل موعد التسليم (أو قبل تمديده الخاص). متأخر = سلّم بعد الموعد في واجب يسمح بالتأخير، ومدة التأخير بجانبه. ✗ لم يسلّم = انتهت مهلة التسليم دون تسليم، فيُحسب له صفر. معفى = عذر مقبول لا يُحتسب. «لم يُصحَّح» = سلّم وينتظر التصحيح.";
      M.sign = true;
    } else if (kind === "arub") {
      const R = (D.rep || []).filter((a) => a.parts.length), o = course().objectives;
      M = rheader(secObj, "نتائج الروبرك حسب الأهداف", secObj.name + " — " + (RF.show === "mark" ? "النسب" : "المستويات"));
      M.cols = base.slice(); M.legend = [];
      R.forEach((a, ai) => a.parts.forEach((p) => { M.cols.push({ h: p.objective_code, code: true, g: "a" + ai, gt: a.title, dark: DK.ch[ai % 10], gdark: DK.ch[ai % 10], w: 6 });
        M.legend.push([p.objective_code, a.title + " — " + p.label + ": " + ((o.find((y) => y.code === p.objective_code) || {}).text || "")]); }));
      M.cols.push({ h: "المتوسط", s: "من نقاط الروبرك", dark: DK.total, light: LT.total, b: true, w: 9 });
      M.rows = L.map((s, i) => {
        let t = 0, m = 0;
        const cs = R.flatMap((a) => { const sb = a.subs.find((z) => z.enrollment_id === s.enrollment_id);
          return a.parts.map((p) => { const r = sb && sb.graded && sb.rubric ? sb.rubric[p.id] : null; if (!r || r.pts == null) return cell(null);
            const pct = +r.pts / +p.max * 100, k = lvOf(pct); t += +r.pts; m += +p.max;
            return cell(RF.show === "mark" ? nf(pct, 0) : String(k), { b: true, fill: LVF[k], color: LVC[k] }); }); });
        return baseRow(s, i).concat(cs, [cell(m ? nf(t / m * 100, 1) + "%" : null, { b: true })]);
      });
      M.note = (RF.show === "mark" ? "الخلية = نسبة نقاط الطالب في المعيار من علامته القصوى. " : "الخلية = مستوى الطالب في المعيار: 1 مبتدئ (أقل من 50%)، 2 نامٍ (50–69%)، 3 متمكّن (70–84%)، 4 متميّز (85% فأكثر). ") + "رأس العمود رمز الهدف الذي يقيسه المعيار، والمفتاح أسفل الجدول يبيّن الواجب والمعيار والهدف. النقاط قبل خصم التأخير، وتظهر المعايير المصحّحة فقط؛ — = لم يُصحَّح أو لم يسلّم.";
      M.sign = true;
    } else {
      const codes = new Set(scopeChs().flatMap((c) => c.objs.map((o) => o.code)));
      const A = D.assess.filter((a) => { const oc = a.kind === "quiz" ? (a.quiz.objectives || []) : a.parts.map((p) => p.objective_code); return !RF.chs.length || oc.some((x) => codes.has(x)); });
      M = rheader(secObj, "سجل القياس بالأدوات", secObj.name + " — " + scopeLabel());
      M.cols = [{ h: "م", dark: DK.info, w: 5 }, { h: "التقويم", dark: DK.name, nm: true, w: 28 }, { h: "المكوّن", dark: DK.info, wrap: true, w: 18 }, { h: "الأداة", dark: DK.info, wrap: true, w: 18 },
        { h: "التاريخ", dark: DK.info, w: 16 }, { h: "الأهداف المقيسة", dark: DK.comp[1], wrap: true, w: 26 }, { h: "العلامة القصوى", dark: DK.comp[0], w: 9 },
        { h: "عدد الطلبة", s: "الذين قيسوا", dark: DK.comp[0], w: 9 }, { h: "متوسط الشعبة", dark: DK.total, light: LT.total, b: true, w: 10 }];
      const act = book.students.filter((s) => s.status === "active");
      M.rows = A.map((a, i) => {
        const oc = a.kind === "quiz" ? (a.quiz.objectives || []) : [...new Set(a.parts.map((p) => p.objective_code))];
        const v = act.map((s) => s.items[a.id]).filter((x) => x != null);
        const dt = a.kind !== "manual" ? [a.open_at && "من " + fmtDT(a.open_at, false), a.close_at && "إلى " + fmtDT(a.close_at, false)].filter(Boolean).join(" ") : "";
        return [cell(i + 1), cell(a.title, { wrap: true }), cell(comp(a.component_id).title || "", { wrap: true }),
          cell(a.kind === "quiz" ? `اختبار إلكتروني (${a.quiz.n} أسئلة من بنك الأسئلة)` : a.kind === "assignment" ? `واجب يسلّمه الطالب على المنصة، يُصحَّح بروبرك (${a.parts.length} معايير)` : `رصد المحاضر (${a.parts.length} أجزاء)`, { wrap: true }),
          cell(dt || null, { wrap: true }), cell(oc.join("، "), { wrap: true, ltr: true }), cell(nf(+a.max_score, 2)), cell(v.length), cell(v.length ? nf(v.reduce((x, y) => x + y, 0) / v.length, 1) + "%" : null, { b: true })];
      });
      M.note = "متوسط الشعبة = متوسط نسب الطلبة الذين قيسوا بالتقويم (للاختبار الإلكتروني: أفضل محاولة لكل طالب). تفصيل علامة كل طالب في كل تقويم في الصفحة التالية.";
      M.sign = true;
      // الصفحة الثانية: علامات الطلبة في كل تقويم
      const M2 = rheader(secObj, "سجل القياس بالأدوات — علامات الطلبة", secObj.name + " — " + scopeLabel());
      M2.cols = base.concat(A.map((a, i) => ({ h: a.title, s: "من " + nf(+a.max_score, 2), vt: true, dark: DK.comp[i % 6], w: 7 })));
      M2.rows = L.map((s, i) => baseRow(s, i).concat(A.map((a) => cell(s.items[a.id] == null ? null : nf(s.items[a.id] * a.max_score / 100, 2)))));
      M2.note = "الخلية = علامة الطالب في التقويم (للاختبار الإلكتروني: أفضل محاولة)؛ — = لم يُرصد له أو لم يحل الاختبار.";
      M2.sign = true;
      M.extra = M2;
    }
    const fix = (X) => { const vt = X.cols.filter((x) => x.vt || x.code).length; X.orient = RF.orient !== "auto" ? RF.orient : (X.cols.length > 9 || vt > 4 || kind === "evidence" || kind === "asub") ? "landscape" : "portrait"; return X; };
    fix(M); if (M.extra) fix(M.extra);
    return M;
  }
  async function rmodels() {
    const ids = RF.secs === "all" ? S.boot.sections.filter((s) => !s.archived).map((s) => s.id) : [S.sec];
    const out = [];
    for (const id of ids) {
      const so = S.boot.sections.find((s) => s.id === id), D0 = await secData(id);
      const D = ["asub", "arub"].includes(RF.kind) ? Object.assign({}, D0, { rep: await rpc("t_assign_report", { p_section: id }) }) : D0;
      const M = rmodel(RF.kind, so, D); out.push(M); if (M.extra) out.push(M.extra);
    }
    return out;
  }
  function rhtml(M) {
    let h = `<div class="doc"><div class="rh"><div class="side"><img src="${LOGO_URL()}" alt="">${M.right.map(esc).join("<br>")}</div><div class="t">${esc(M.title)}<span>${esc(M.sub)}</span></div><div class="side l">${M.left.map(esc).join("<br>")}</div></div>`;
    const hasG = M.cols.some((x) => x.g);
    h += '<table class="r"><thead><tr>';
    for (let i = 0; i < M.cols.length;) {
      const c = M.cols[i];
      if (hasG && c.g) { let j = i; while (j < M.cols.length && M.cols[j].g === c.g) j++; h += `<th colspan="${j - i}" style="background:${hex(c.gdark || c.dark)}">${esc(c.gt)}</th>`; i = j; }
      else { h += `<th ${hasG ? 'rowspan="2"' : ""} class="${c.vt ? "vt" : ""}" style="background:${hex(c.dark)}">${c.vt ? `<div>${esc(c.h)}</div>` : esc(c.h)}${c.s ? `<small>${esc(c.s)}</small>` : ""}</th>`; i++; }
    }
    h += "</tr>";
    if (hasG) h += "<tr>" + M.cols.filter((c) => c.g).map((c) => `<th class="${c.vt ? "vt" : ""}${c.code ? " cd" : ""}" style="background:${hex(c.dark)}">${c.vt ? `<div>${esc(c.h)}</div>` : esc(c.h)}${c.s ? `<small>${esc(c.s)}</small>` : ""}</th>`).join("") + "</tr>";
    h += "</thead><tbody>";
    M.rows.forEach((r, ri) => { h += "<tr>" + r.map((x, i) => { const c = M.cols[i] || {}, cls = [c.nm ? "nm" : "", x.wrap || c.wrap ? "wrap" : "", x.b || c.b ? "b" : "", x.dim ? "dim" : "", x.ltr ? "ltr" : ""].join(" ");
      const bg = x.fill || c.light || (ri % 2 ? "F8FAFC" : "FFFFFF");
      return `<td class="${cls}" style="background:${hex(bg)}${x.color ? ";color:" + hex(x.color) : ""}">${esc(x.v)}</td>`; }).join("") + "</tr>"; });
    if (!M.rows.length) h += `<tr><td colspan="${M.cols.length}" style="padding:18px;color:#6b7280">لا بيانات ضمن هذه الفلاتر.</td></tr>`;
    h += `</tbody></table><div class="rn">${esc(M.note)}</div>`;
    if (M.legend) h += `<div class="lg"><b>مفتاح الأهداف</b>${M.legend.map(([c, t]) => `<div><span dir="ltr">${esc(c)}</span> ${esc(t)}</div>`).join("")}</div>`;
    if (M.sign) h += `<div class="rs"><span>المحاضر: ${esc(S.boot.me.full_name || "")} ..........</span><span>مدير البرنامج: ....................</span><span>عميد الكلية: ....................</span></div>`;
    return h + "</div>";
  }
  async function rxlsx(models, name) {
    await loadScript(XLSX_URL); const X = window.XLSX;
    const border = { top: { style: "thin", color: { rgb: "94A3B8" } }, bottom: { style: "thin", color: { rgb: "94A3B8" } }, left: { style: "thin", color: { rgb: "94A3B8" } }, right: { style: "thin", color: { rgb: "94A3B8" } } };
    const hs = (fill, rot) => ({ font: { name: "Amiri", bold: true, sz: rot ? 9 : 12, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: fill } }, border,
      alignment: { horizontal: "center", vertical: "center", wrapText: true, readingOrder: 2, textRotation: rot ? 90 : 0 } });
    const ds = (x, c) => ({ font: { name: "Arial", sz: 11, bold: !!(x.b || c.b), color: { rgb: x.color || (x.dim ? "9CA3AF" : "111827") } }, fill: { patternType: "solid", fgColor: { rgb: x.fill || c.light || "FFFFFF" } }, border,
      alignment: { horizontal: c.nm || x.wrap || c.wrap ? "right" : "center", vertical: "center", wrapText: !!(x.wrap || c.wrap), readingOrder: 2 } });
    const wb = X.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] };
    models.forEach((M, mi) => {
      const aoa = [], st = [], merges = [], n = M.cols.length, hasG = M.cols.some((x) => x.g);
      const put = (r, c, v, s) => { aoa[r] = aoa[r] || []; aoa[r][c] = v; st.push([r, c, s]); };
      put(0, 0, M.title + " — " + M.sub, { font: { name: "Amiri", bold: true, sz: 18, color: { rgb: "16325A" } }, alignment: { horizontal: "center", readingOrder: 2 } }); merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: n - 1 } });
      put(1, 0, M.right.concat(M.left).join("   |   "), { font: { name: "Amiri", sz: 12, color: { rgb: "374151" } }, alignment: { horizontal: "center", readingOrder: 2, wrapText: true } }); merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: n - 1 } });
      const r1 = 3, r2 = hasG ? 4 : 3;
      for (let i = 0; i < n;) {
        const c = M.cols[i];
        if (hasG && c.g) { let j = i; while (j < n && M.cols[j].g === c.g) j++;
          for (let k = i; k < j; k++) { put(r1, k, k === i ? c.gt : "", hs(c.gdark || c.dark)); put(r2, k, M.cols[k].h + (M.cols[k].s ? " (" + M.cols[k].s + ")" : ""), hs(M.cols[k].dark, M.cols[k].vt)); }
          merges.push({ s: { r: r1, c: i }, e: { r: r1, c: j - 1 } }); i = j; }
        else { put(r1, i, c.h + (c.s ? " (" + c.s + ")" : ""), hs(c.dark, c.vt)); if (hasG) { put(r2, i, "", hs(c.dark)); merges.push({ s: { r: r1, c: i }, e: { r: r2, c: i } }); } i++; }
      }
      M.rows.forEach((row, ri) => row.forEach((x, ci) => { const num = typeof x.v === "string" && /^-?\d+(\.\d+)?$/.test(x.v) && ci !== 1 ? +x.v : x.v; put(r2 + 1 + ri, ci, typeof num === "number" ? num : String(num), ds(x, M.cols[ci])); }));
      const last = r2 + M.rows.length + 2;
      put(last, 0, M.note, { font: { name: "Arial", sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "right", wrapText: true, readingOrder: 2 } }); merges.push({ s: { r: last, c: 0 }, e: { r: last, c: n - 1 } });
      if (M.legend) { put(last + 1, 0, "مفتاح الأهداف: " + M.legend.map(([c, t]) => c + " " + t).join("  •  "), { font: { name: "Arial", sz: 9, color: { rgb: "374151" } }, alignment: { horizontal: "right", wrapText: true, readingOrder: 2, vertical: "top" } }); merges.push({ s: { r: last + 1, c: 0 }, e: { r: last + 1, c: n - 1 } }); }
      put(last + 2, 0, "المحاضر: " + (S.boot.me.full_name || "") + "        مدير البرنامج: ..................        عميد الكلية: ..................", { font: { name: "Amiri", sz: 12 }, alignment: { horizontal: "center", readingOrder: 2 } });
      merges.push({ s: { r: last + 2, c: 0 }, e: { r: last + 2, c: n - 1 } });
      for (let r = 0; r <= last + 2; r++) { aoa[r] = aoa[r] || []; for (let k = 0; k < n; k++) if (aoa[r][k] === undefined) aoa[r][k] = ""; }
      const sh = X.utils.aoa_to_sheet(aoa);
      st.forEach(([r, c, s]) => { const a = X.utils.encode_cell({ r, c }); if (sh[a]) sh[a].s = s; });
      sh["!merges"] = merges; sh["!cols"] = M.cols.map((c) => ({ wch: c.w || 10 }));
      sh["!rows"] = []; sh["!rows"][0] = { hpt: 30 }; sh["!rows"][1] = { hpt: 24 }; sh["!rows"][r2] = { hpt: M.cols.some((c) => c.vt) ? 170 : 40 }; sh["!rows"][last] = { hpt: 60 }; if (M.legend) sh["!rows"][last + 1] = { hpt: Math.min(400, 14 * Math.ceil(M.legend.length / 2)) };
      sh["!views"] = [{ RTL: true }];
      sh["!pageSetup"] = { paperSize: 9, orientation: M.orient === "landscape" ? "landscape" : "portrait", fitToWidth: 1, fitToHeight: 0 };
      X.utils.book_append_sheet(wb, sh, (M.sub.split("—")[0].trim() + " " + (mi + 1)).replace(/[\\/:*?"<>|[\]]/g, "-").slice(0, 30));
    });
    X.writeFile(wb, name.replace(/[\\/:*?"<>|]/g, "-") + ".xlsx"); toast("نُزّل ملف Excel");
  }

  VIEWS.records = { title: "السجلات والطباعة", secAware: true, render(el) {
    if (!document.getElementById("pcss")) { const s = document.createElement("style"); s.id = "pcss"; s.textContent = PCSS; document.head.appendChild(s); }
    const chapKinds = ["det", "checklist", "evidence"].includes(RF.kind);
    el.innerHTML = `<div class="vhead"><div><h2>السجلات والطباعة</h2><p>سجلات رسمية جاهزة — كلها تُطبع على A4 من الهاتف أو الحاسوب، وتُصدَّر إلى Excel منسّق</p></div></div>
      <div class="card pad filters">
        <div><span class="lbl">السجل</span><div class="kinds">${RKINDS.map(([k, t, d]) => `<button class="kind" data-k="${k}" aria-pressed="${RF.kind === k}"><b>${t}</b><span>${d}</span></button>`).join("")}</div></div>
        <div class="fields three">
          <label class="field"><span>الشعب</span><select class="input" id="fSecs">${opt(RF.secs, [["cur", "الشعبة الحالية: " + sec().name], ["all", "كل الشعب (كل شعبة في صفحة)"]])}</select></label>
          <label class="field"><span>الطلبة</span><select class="input" id="fOnly">${opt(RF.only, [["all", "كل الطلبة"], ["risk", "المحتاجون دعمًا فقط (أقل من 60%)"]])}</select></label>
          <label class="field"><span>الترتيب</span><select class="input" id="fSort">${opt(RF.sort, [["id", "الرقم الجامعي"], ["alpha", "أبجديًّا"], ["total", "بالنسبة (الأعلى أولًا)"]])}</select></label></div>
        <div class="${chapKinds ? "" : "hide"}"><span class="lbl">النطاق — علّم الفصول (بلا تعليم = كل الفصول)</span>
          <div class="chips">${chs().map((c) => `<label class="chip lchip"><input type="checkbox" class="fC" data-c="${c.ch}" ${RF.chs.includes(c.ch) ? "checked" : ""}>الفصل ${c.ch} <span class="tiny">${esc(c.title)}</span></label>`).join("")}</div></div>
        <div class="row wrap"><div class="seg ${RF.kind === "det" || RF.kind === "arub" ? "" : "hide"}" id="fShow"><button data-s="level" aria-pressed="${RF.show === "level"}">الخلايا: المستوى 1–4</button><button data-s="mark" aria-pressed="${RF.show === "mark"}">الخلايا: النسبة</button></div>
          <div class="seg" id="fOrient"><button data-o="auto" aria-pressed="${RF.orient === "auto"}">A4 تلقائي</button><button data-o="portrait" aria-pressed="${RF.orient === "portrait"}">A4 عمودي</button><button data-o="landscape" aria-pressed="${RF.orient === "landscape"}">A4 أفقي</button></div>
          <span class="grow"></span><button class="btn primary" id="fPrint">${ic("printer", "sm")}طباعة / PDF</button><button class="btn outline" id="fXlsx">Excel منسّق</button></div></div>
      <div class="rec-scroll" style="margin-top:14px"><div class="paper" id="recPaper"><div class="loading" style="padding:20px">جارٍ التحضير…</div></div></div>`;
    const re = () => route();
    loadLogo();
    const preview = async () => { const box = el.querySelector("#recPaper"); try { const ms = await rmodels(); if (box.isConnected) box.innerHTML = ms.map(rhtml).join(""); } catch (e) { box.innerHTML = emptyBox("alert", "تعذّر تحضير السجل", esc(e.message)); } };
    el.querySelectorAll(".kind").forEach((b) => (b.onclick = () => { RF.kind = b.dataset.k; re(); }));
    el.querySelector("#fSecs").onchange = (e) => { RF.secs = e.target.value; preview(); };
    el.querySelector("#fOnly").onchange = (e) => { RF.only = e.target.value; preview(); };
    el.querySelector("#fSort").onchange = (e) => { RF.sort = e.target.value; preview(); };
    el.querySelectorAll(".fC").forEach((cb) => (cb.onchange = () => { RF.chs = RF.chs.filter((x) => x !== +cb.dataset.c); if (cb.checked) RF.chs.push(+cb.dataset.c); preview(); }));
    el.querySelectorAll("#fShow button").forEach((b) => (b.onclick = () => { RF.show = b.dataset.s; re(); }));
    el.querySelectorAll("#fOrient button").forEach((b) => (b.onclick = () => { RF.orient = b.dataset.o; re(); }));
    el.querySelector("#fPrint").onclick = async () => { try { await loadLogo(); const ms = await rmodels(); printDoc(ms[0].title + " — " + ms[0].sub, ms.map(rhtml).join(""), ms[0].orient); } catch (e) { toast(e.message, true); } };
    el.querySelector("#fXlsx").onclick = async (e) => { spin(e.target, true); try { const ms = await rmodels(); await rxlsx(ms, ms[0].title + " - " + (RF.secs === "all" ? "كل الشعب" : sec().name)); } catch (x) { toast(x.message, true); } spin(e.target, false); };
    preview();
  } };


  // ===================== الواجبات وأوراق العمل (الإصدار 1.5) =====================
  const RLV = ["متميّز", "متمكّن", "نامٍ", "مبتدئ"], RLF = [1, 0.75, 0.5, 0.25];
  const round2 = (v) => Math.round(v * 100) / 100;
  const lateTxt = (m) => { m = +m || 0; if (!m) return ""; const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60; return [d && d + " يوم", h && h + " ساعة", !d && mi && mi + " دقيقة"].filter(Boolean).join(" و"); };
  const policyTxt = (A) => A.late === "penalty" ? `يُقبل المتأخر بخصم ${nf(+A.penalty_pct || 10, 0)}٪ عن كل يوم${A.cutoff_at ? " حتى " + fmtDT(A.cutoff_at, false) : ""}` : A.late === "free" ? `يُقبل المتأخر بلا خصم${A.cutoff_at ? " حتى " + fmtDT(A.cutoff_at, false) : ""} ويُعلَّم متأخرًا` : "لا تسليم بعد الموعد";
  const words = (t) => (String(t || "").trim().match(/\S+/g) || []).length;

  function asgForm(a) {
    const g = (a && a.assign) || {}, ft = g.file_types || FF.DEF;
    return `<div id="xAsg" class="hide">
      <div class="tipbox tiny" style="margin-bottom:10px">يسلّم الطالب على المنصة (كتابة، أو ملفات، أو إجابات ورقة عمل)، وتصحّح أنت بروبرك كل معيار فيه مربوط بهدف؛ فتدخل علامته في المكوّن وفي إتقان الأهداف تلقائيًّا. لا يرى الطالب علامته حتى تضغط «نشر العلامات».${a && a.graded ? "<br><b>تنبيه:</b> صُحّح هذا الواجب لـ " + a.graded + " طالبًا؛ حذف معيار يحذف علاماته، وإضافة معيار تتطلب إعادة تصحيحهم." : ""}</div>
      <label class="field"><span>التعليمات للطالب</span><textarea class="input" id="gI" rows="4" placeholder="المطلوب، والمصادر المسموحة، وشكل التسليم…">${esc(g.instructions || "")}</textarea></label>
      <div class="field"><span>ملفات مرفقة بالتعليمات (ورقة العمل، نموذج، بيانات…)</span><div class="flist" id="gBrief"></div>
        <button class="btn sm outline" type="button" id="gBriefAdd" style="margin-top:6px;justify-self:start">${ic("clip", "sm")}إرفاق ملف</button><input type="file" id="gBriefIn" multiple hidden></div>
      <b style="font-size:14px">طريقة التسليم <span class="tiny">(واحدة أو أكثر)</span></b>
      <div class="row wrap" style="gap:16px;margin:8px 0 10px"><label class="check"><input type="checkbox" id="gTx" ${g.sub_text !== false ? "checked" : ""}> صندوق إجابة يكتب فيه الطالب</label>
        <label class="check"><input type="checkbox" id="gFl" ${g.sub_files ? "checked" : ""}> رفع ملفات</label><label class="check"><input type="checkbox" id="gWs" ${(g.worksheet || []).length ? "checked" : ""}> أسئلة ورقة عمل يجيب عنها</label></div>
      <div id="gTxO" class="fields two"><label class="field"><span>أقل عدد كلمات (0 بلا حد)</span><input class="input" type="number" min="0" id="gWmin" value="${g.words_min || 0}"></label><label class="field"><span>أكثر عدد كلمات (0 بلا حد)</span><input class="input" type="number" min="0" id="gWmax" value="${g.words_max || 0}"></label></div>
      <div id="gFlO"><span class="tiny">أنواع الملفات المسموحة</span><div class="chips" style="margin:6px 0">${Object.entries(FF.TYPES).map(([k, v]) => `<label class="chip lchip"><input type="checkbox" class="gFt" value="${k}" ${ft.includes(k) ? "checked" : ""}>${esc(v[1])}</label>`).join("")}</div>
        <label class="field" style="max-width:220px"><span>أقصى عدد للملفات</span><input class="input" type="number" min="1" max="10" id="gMx" value="${g.max_files || 3}"></label><p class="tiny">حد الملف الواحد 4 ميغابايت، وتُصغَّر صور الهاتف تلقائيًّا قبل رفعها.</p></div>
      <div id="gWsO"><div class="tiny" style="margin-bottom:6px">أسئلة ورقة العمل — لكل سؤال خانة إجابة خاصة عند الطالب</div><div id="gWsL"></div><button class="btn sm outline" type="button" id="gWsAdd">＋ سؤال</button></div>
      <div class="fields two" style="margin-top:12px"><label class="field"><span>يفتح في (فارغ = فور النشر)</span><input class="input" type="datetime-local" id="gO" value="${a && a.open_at ? toLocalInput(a.open_at) : ""}"></label>
        <label class="field"><span>موعد التسليم *</span><input class="input" type="datetime-local" id="gD" value="${a && a.close_at ? toLocalInput(a.close_at) : ""}"></label></div>
      <b style="font-size:14px">التسليم بعد الموعد</b>
      <div class="seg" id="gLate" style="margin:8px 0;display:flex">${[["none", "لا تسليم بعد الموعد"], ["penalty", "مسموح بخصم"], ["free", "مسموح بلا خصم"]].map(([k, t]) => `<button type="button" data-l="${k}" aria-pressed="${(g.late || "none") === k}">${t}</button>`).join("")}</div>
      <div id="gLateO" class="fields two"><label class="field" id="gPpW"><span>الخصم عن كل يوم تأخير (٪)</span><input class="input" type="number" min="1" max="100" id="gPp" value="${g.penalty_pct || 10}"></label>
        <label class="field"><span>الإغلاق النهائي (لا يُقبل بعده شيء)</span><input class="input" type="datetime-local" id="gCu" value="${g.cutoff_at ? toLocalInput(g.cutoff_at) : ""}"></label></div>
      <label class="check" style="margin:6px 0 12px"><input type="checkbox" id="gRs" ${g.resubmit !== false ? "checked" : ""}> يسمح للطالب بإعادة التسليم حتى الموعد (تُحفظ كل نسخة، ويُصحَّح آخرها)</label>
      <div class="row sp wrap" style="margin-top:6px"><b style="font-size:15px">${ic("target", "sm")} الروبرك — معايير التصحيح <span class="tiny">كل معيار مربوط بهدف، وله أربعة مستويات</span></b><span class="tiny">العلامة القصوى: <b class="num" id="gSum">0</b></span></div>
      <div id="gCrit" style="margin-top:8px"></div>
      <div class="row wrap" style="gap:8px"><button class="btn sm outline" type="button" id="gCAdd">＋ معيار</button>
        <select class="input" id="gCFill" style="width:auto;min-height:34px"><option value="">معيار لكل هدف من فصل…</option>${chs().map((ch) => `<option value="${ch.ch}">الفصل ${ch.ch}</option>`).join("")}</select>
        <select class="input" id="gTpl" style="width:auto;min-height:34px"><option value="">قوالب الروبرك…</option></select><button class="btn sm ghost" type="button" id="gTplSave">حفظ الروبرك قالبًا</button></div></div>`;
  }
  function asgWire(s, a, objOpts) {
    const q = (x) => s.querySelector(x), c = course(), A0 = (a && a.assign) || {};
    // طرق التسليم
    const num = () => [...q("#gWsL").children].forEach((d, i) => (d.firstChild.textContent = i + 1 + "."));
    const wsAdd = (t) => { const d = document.createElement("div"); d.className = "row"; d.style.marginBottom = "6px";
      d.innerHTML = `<span class="tiny num" style="min-width:22px"></span><input class="input grow" data-ws value="${esc(t)}" placeholder="نص السؤال"><button class="btn sm ghost" type="button">✕</button>`;
      q("#gWsL").appendChild(d); d.querySelector("button").onclick = () => { d.remove(); num(); }; num(); };
    (A0.worksheet || []).forEach((w) => wsAdd(w.q));
    const tog = () => { q("#gTxO").classList.toggle("hide", !q("#gTx").checked); q("#gFlO").classList.toggle("hide", !q("#gFl").checked); q("#gWsO").classList.toggle("hide", !q("#gWs").checked); };
    ["#gTx", "#gFl", "#gWs"].forEach((x) => (q(x).onchange = () => { if (x === "#gWs" && q("#gWs").checked && !q("#gWsL").children.length) wsAdd(""); tog(); }));
    q("#gWsAdd").onclick = () => wsAdd(""); tog();
    // التأخير
    let late = A0.late || "none";
    const lt = () => { s.querySelectorAll("#gLate button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.l === late)); q("#gLateO").classList.toggle("hide", late === "none"); q("#gPpW").classList.toggle("hide", late !== "penalty"); };
    s.querySelectorAll("#gLate button").forEach((b) => (b.onclick = () => { late = b.dataset.l; lt(); })); lt();
    // ملفات التعليمات: تُرفع فورًا في واجب محفوظ، وبعد الحفظ في واجب جديد
    const brief = a ? (a.brief || []).slice() : [], queue = [];
    const drawBrief = () => {
      q("#gBrief").innerHTML = brief.map((f) => `<div class="frow">${FF.badge(f)}<span class="nm">${esc(f.name)}</span><span class="sz">${FF.size(f.size)}</span><button class="btn sm ghost" type="button" data-bd="${f.id}">✕</button></div>`).join("") +
        queue.map((f, i) => `<div class="frow">${FF.badge({ name: f.name, mime: f.type })}<span class="nm">${esc(f.name)}</span><span class="sz">يُرفع عند الحفظ</span><button class="btn sm ghost" type="button" data-bq="${i}">✕</button></div>`).join("");
      s.querySelectorAll("[data-bd]").forEach((b) => (b.onclick = async () => { try { await rpc("f_delete", { p_file: b.dataset.bd }); brief.splice(brief.findIndex((f) => f.id === b.dataset.bd), 1); drawBrief(); } catch (e) { toast(e.message, true); } }));
      s.querySelectorAll("[data-bq]").forEach((b) => (b.onclick = () => { queue.splice(+b.dataset.bq, 1); drawBrief(); }));
    };
    q("#gBriefAdd").onclick = () => q("#gBriefIn").click();
    q("#gBriefIn").onchange = async (e) => {
      for (const f of [...e.target.files]) {
        if (f.size > FF.MAX) { toast("«" + f.name + "» أكبر من 4 ميغابايت", true); continue; }
        if (a) { try { brief.push(await FF.upload(f, { assessment: a.id, role: "brief" })); } catch (x) { toast(x.message, true); } } else queue.push(f);
      }
      e.target.value = ""; drawBrief();
    };
    drawBrief();
    // الروبرك
    const box = q("#gCrit");
    const sum = () => (q("#gSum").textContent = nf([...box.children].reduce((t, d) => t + (+d.querySelector("[data-cm]").value || 0), 0), 2));
    const addCrit = (p) => {
      const d = document.createElement("div"); d.className = "crit"; if (p && p.id) d.dataset.id = p.id;
      const mx = p ? +(p.max_score != null ? p.max_score : p.max) : 4;
      const lv = p && p.levels && p.levels.length === 4 ? p.levels : RLF.map((k, i) => ({ name: RLV[i], pts: round2(mx * k), desc: "" }));
      d.innerHTML = `<div class="hd"><input class="input" data-cl placeholder="المعيار (مثال: دقة الحسابات)" value="${esc(p ? p.label : "")}"><select class="input" data-co>${objOpts(p && p.objective_code)}</select>
          <input class="input num" type="number" min="0.25" step="0.25" data-cm value="${mx}" title="العلامة القصوى للمعيار"><button class="btn sm ghost" type="button" data-rm title="حذف المعيار">✕</button></div>
        <div class="lv4">${lv.map((l, i) => `<div><label><span>${RLV[i]}</span><input class="input num" type="number" min="0" step="0.25" data-lp="${i}" value="${+l.pts}"></label><textarea class="input" data-ld="${i}" placeholder="وصف الأداء في هذا المستوى">${esc(l.desc || "")}</textarea></div>`).join("")}</div>`;
      box.appendChild(d);
      d.querySelector("[data-rm]").onclick = () => { d.remove(); sum(); };
      d.querySelector("[data-cm]").oninput = (e) => { const m = +e.target.value || 0; d.querySelectorAll("[data-lp]").forEach((x, i) => (x.value = round2(m * RLF[i]))); sum(); };
      d.querySelector('[data-lp="0"]').oninput = (e) => { d.querySelector("[data-cm]").value = e.target.value; sum(); };
      sum();
    };
    (a && a.kind === "assignment" ? a.parts : []).forEach(addCrit);
    q("#gCAdd").onclick = () => addCrit(null);
    q("#gCFill").onchange = (e) => { const ch = chs().find((x) => x.ch === +e.target.value); if (ch) ch.objs.forEach((o) => addCrit({ label: "الهدف " + o.code, objective_code: o.code, max_score: 4 })); e.target.value = ""; };
    let TPL = [];
    rpc("t_templates", { p_course: c.id }).then((r) => { TPL = r; q("#gTpl").innerHTML = `<option value="">قوالب الروبرك (${r.length})…</option>` + r.map((t) => `<option value="${t.id}">${esc(t.title)} — ${t.criteria.length} معايير</option>`).join(""); }).catch(() => { });
    q("#gTpl").onchange = (e) => { const t = TPL.find((x) => x.id === e.target.value); e.target.value = ""; if (!t) return; t.criteria.forEach((p) => addCrit(Object.assign({}, p, { id: null }))); toast("أُضيفت معايير القالب «" + t.title + "»"); };
    const parts = () => [...box.children].map((d) => {
      const p = { id: d.dataset.id || null, label: d.querySelector("[data-cl]").value.trim(), objective_code: d.querySelector("[data-co]").value,
        levels: [0, 1, 2, 3].map((i) => ({ name: RLV[i], pts: +d.querySelector(`[data-lp="${i}"]`).value, desc: d.querySelector(`[data-ld="${i}"]`).value.trim() })) };
      p.max_score = p.levels[0].pts; return p;
    });
    const check = (P) => {
      if (!P.length) throw new Error("أضف معيارًا واحدًا على الأقل إلى الروبرك");
      P.forEach((p) => {
        if (!p.label) throw new Error("اكتب اسم كل معيار في الروبرك");
        if (!(p.max_score > 0)) throw new Error("علامة «" + p.label + "» يجب أن تكون أكبر من صفر");
        for (let i = 0; i < 3; i++) if (!(p.levels[i].pts >= p.levels[i + 1].pts) || p.levels[i + 1].pts < 0) throw new Error("نقاط مستويات «" + p.label + "» يجب أن تتنازل من «متميّز» إلى «مبتدئ» ولا تقل عن صفر");
      });
      return P;
    };
    q("#gTplSave").onclick = async () => {
      let P; try { P = check(parts()); } catch (x) { return toast(x.message, true); }
      const t = window.prompt("اسم القالب (مثال: روبرك حل مسألة مالية)", q("#xT") ? q("#xT").value : ""); if (!t) return;
      try { await rpc("t_template_save", { p_course: c.id, p_title: t, p_criteria: P.map((p) => ({ label: p.label, objective_code: p.objective_code, max_score: p.max_score, levels: p.levels })) }); toast("حُفظ القالب"); } catch (x) { toast(x.message, true); }
    };
    return { pending: queue, collect() {
      const close = fromLocalInput(q("#gD").value); if (!close) throw new Error("حدّد موعد التسليم");
      const P = check(parts());
      const ws = q("#gWs").checked ? [...q("#gWsL").querySelectorAll("[data-ws]")].map((x) => x.value.trim()).filter(Boolean).map((t) => ({ q: t })) : [];
      const ft = [...s.querySelectorAll(".gFt:checked")].map((x) => x.value);
      if (q("#gFl").checked && !ft.length) throw new Error("اختر نوع ملف واحدًا على الأقل");
      if (q("#gWs").checked && !ws.length) throw new Error("اكتب سؤالًا واحدًا على الأقل في ورقة العمل، أو ألغِ خيارها");
      const wmin = +q("#gWmin").value || 0, wmax = +q("#gWmax").value || 0;
      if (wmax && wmin > wmax) throw new Error("أقل عدد كلمات أكبر من أكثره");
      const open = fromLocalInput(q("#gO").value); if (open && open >= close) throw new Error("موعد الفتح يجب أن يسبق موعد التسليم");
      return { open_at: open, close_at: close, parts: P, assign: { instructions: q("#gI").value.trim(), sub_text: q("#gTx").checked, sub_files: q("#gFl").checked, worksheet: ws,
        words_min: wmin, words_max: wmax, file_types: ft.length ? ft : FF.DEF, max_files: Math.max(1, Math.min(10, +q("#gMx").value || 3)), late,
        penalty_pct: late === "penalty" ? Math.max(1, Math.min(100, +q("#gPp").value || 10)) : null, cutoff_at: late !== "none" ? fromLocalInput(q("#gCu").value) : null, resubmit: q("#gRs").checked } };
    } };
  }
  async function releaseFlow(id, on, title, ungraded) {
    const body = on ? `سيرى الطلبة علاماتهم في «${esc(title)}» مع مستوياتهم في الروبرك وملاحظاتك، وتدخل علامتهم في مجموعهم.${ungraded ? `<div class="tipbox tiny" style="margin-top:10px">ما زال ${ungraded} تسليمًا بلا تصحيح؛ لن تظهر علاماتهم حتى تصحّحها.</div>` : ""}<p class="tiny" style="margin-top:8px">من لم يسلّم بعد انتهاء الموعد يُحسب له صفر. وأي تعديل لعلامة بعد النشر يتطلب كتابة سببه ويُسجَّل.</p>`
      : `ستختفي علامات «${esc(title)}» عن الطلبة وتخرج من مجموعهم حتى تنشرها مجددًا.`;
    if (!(await confirmSheet(on ? "نشر العلامات" : "إخفاء العلامات", body, on ? "انشر" : "أخفِ", !on))) return false;
    try { await rpc("t_release", { p_assessment: id, p_on: on }); toast(on ? "نُشرت العلامات" : "أُخفيت العلامات"); return true; } catch (e) { toast(e.message, true); return false; }
  }

  // ---------- شاشة التسليمات والتصحيح ----------
  const G = { aid: null, d: null, sel: null, ver: null, rub: {}, rubFor: null, pen: 0, fb: "", cm: null, filter: "all", prev: null };
  const sumSc = (x) => Object.values(x.scores || {}).reduce((t, v) => t + +v, 0);
  function subSt(x) {
    const sb = x.sub, st = x.state || {};
    if (sb && sb.excused) return ["ex", "معفى"];
    if (sb && sb.version > 0) {
      const regr = sb.graded_at && new Date(sb.graded_at) < new Date(sb.submitted_at);
      if (sb.graded_at && !regr) return ["ok", "مصحّح"];
      return [sb.late_minutes > 0 ? "late" : "wait", regr ? "أعاد التسليم — يحتاج تصحيحًا" : sb.late_minutes > 0 ? "متأخر — بانتظار التصحيح" : "بانتظار التصحيح"];
    }
    if (sb && sb.graded_at) return ["ok", "مصحّح (بلا تسليم على المنصة)"];
    if (!st.can_edit && st.reason === "closed") return ["miss", "لم يسلّم — يُحسب صفرًا"];
    if (sb && sb.dirty) return ["draft", "مسودة لم تُسلَّم بعد"];
    return ["", "لم يسلّم بعد"];
  }
  const FILT = [["all", "الكل"], ["todo", "بانتظار التصحيح"], ["none", "لم يسلّم"], ["late", "متأخر"], ["ok", "مصحّح"]];
  const inFilt = (x) => { const k = subSt(x)[0]; return G.filter === "all" || (G.filter === "todo" && (k === "wait" || k === "late")) || (G.filter === "none" && (k === "" || k === "miss" || k === "draft")) || (G.filter === "late" && x.sub && x.sub.late_minutes > 0) || (G.filter === "ok" && k === "ok"); };
  async function gLoad() {
    const [d, cm] = await Promise.all([rpc("t_subs", { p_assessment: G.aid }), G.cm ? Promise.resolve(G.cm) : rpc("t_comments", { p_course: course().id })]);
    G.d = d; G.cm = cm;
  }
  VIEWS.grade = { title: "التسليمات والتصحيح", nav: "assess", secAware: true, async render(el, arg) {
    if (!arg) { location.hash = "#assess"; return; }
    if (G.aid !== arg) { Object.assign(G, { aid: arg, d: null, sel: null, ver: null, rubFor: null, filter: "all" }); el.innerHTML = '<div class="card pad loading">جارٍ تحميل التسليمات…</div>'; }
    await gLoad(); gDraw(el);
  } };
  function gDraw(el) {
    const d = G.d, A = d.assign || {}, X = d.students;
    const k = X.map(subSt), subm = X.filter((x) => x.sub && x.sub.version > 0).length, late = X.filter((x) => x.sub && x.sub.version > 0 && x.sub.late_minutes > 0).length;
    const ok = k.filter((z) => z[0] === "ok").length, wait = k.filter((z) => z[0] === "wait" || z[0] === "late").length;
    const sc = X.filter((x) => x.sub && x.sub.graded_at).map(sumSc), avg = sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : null;
    let h = `<div class="vhead"><div><h2>${esc(d.title)}</h2><p>الموعد ${esc(fmtDT(d.close_at))} · ${esc(policyTxt(A))}${A.resubmit ? " · إعادة التسليم مسموحة" : ""} · ${A.released ? '<b style="color:var(--ok)">العلامات منشورة للطلبة</b>' : "<b>العلامات غير منشورة</b>"}</p></div>
      <div class="toolbar"><a class="btn outline" href="#assess">${ic("right", "sm")}التقويمات</a><button class="btn ${A.released ? "outline" : "primary"}" id="gRel">${ic("eye", "sm")}${A.released ? "إخفاء العلامات" : "نشر العلامات"}</button>
        <button class="btn outline" id="gAn">${ic("chart", "sm")}التحليل</button><button class="btn outline" id="gSim">${ic("copy", "sm")}فحص التشابه</button><button class="btn outline" id="gZip">${ic("download", "sm")}تنزيل الكل ZIP</button><button class="btn ghost" id="gEd">${ic("pen", "sm")}تعديل الواجب</button></div></div>`;
    h += `<div class="kpi-row"><div class="kp">${ic("inbox")}<b class="num">${subm}/${X.length}</b><span>سلّموا</span><small>${X.length ? Math.round(subm / X.length * 100) : 0}٪ من الشعبة</small></div>
      <div class="kp ${wait ? "warn" : ""}">${ic("pen")}<b class="num">${wait}</b><span>بانتظار التصحيح</span><small>صُحّح ${ok}</small></div>
      <div class="kp">${ic("clock")}<b class="num">${late}</b><span>تسليم متأخر</span><small>${esc(A.late === "none" ? "التأخير غير مسموح" : A.late === "penalty" ? "بخصم " + nf(+A.penalty_pct || 10, 0) + "٪/يوم" : "بلا خصم")}</small></div>
      <div class="kp">${ic("award")}<b class="num">${avg != null ? nf(avg, 2) : "—"}</b><span>متوسط المصحَّح</span><small>من ${nf(+d.max, 2)}</small></div></div>`;
    h += `<div class="row wrap" style="margin:16px 0 10px;gap:8px"><div class="seg" id="gF">${FILT.map(([f, t]) => `<button data-f="${f}" aria-pressed="${G.filter === f}">${t} <span class="tiny">${X.filter((x) => { const o = G.filter; G.filter = f; const r = inFilt(x); G.filter = o; return r; }).length}</span></button>`).join("")}</div></div>`;
    const L = X.filter(inFilt);
    if (!G.sel || !X.find((x) => x.enrollment_id === G.sel)) G.sel = ((X.find((x) => ["wait", "late"].includes(subSt(x)[0])) || X[0]) || {}).enrollment_id;
    h += `<div class="gwrap"><div class="card glist">${L.length ? L.map((x) => { const z = subSt(x); return `<button class="gi ${x.enrollment_id === G.sel ? "on" : ""}" data-s="${x.enrollment_id}" title="${esc(z[1])}"><span class="sdot ${z[0]}"></span><span class="nm">${esc(x.full_name)}</span>${x.sub && x.sub.graded_at ? `<span class="sc num">${nf(sumSc(x), 2)}</span>` : x.sub && x.sub.late_minutes > 0 ? '<span class="pill warn">متأخر</span>' : ""}</button>`; }).join("") : '<div class="tiny" style="padding:12px">لا أحد بهذه التصفية.</div>'}
      <div class="tiny" style="padding:10px 8px 4px;line-height:2"><span class="sdot ok" style="display:inline-block"></span> مصحّح · <span class="sdot wait" style="display:inline-block"></span> بانتظار التصحيح · <span class="sdot late" style="display:inline-block"></span> متأخر · <span class="sdot miss" style="display:inline-block"></span> لم يسلّم بعد الموعد · <span class="sdot draft" style="display:inline-block"></span> مسودة</div></div><div id="gDet"></div></div>`;
    el.innerHTML = h;
    el.querySelectorAll("#gF button").forEach((b) => (b.onclick = () => { G.filter = b.dataset.f; gDraw(el); }));
    el.querySelectorAll(".gi").forEach((b) => (b.onclick = () => { G.sel = b.dataset.s; G.ver = null; gDraw(el); if (innerWidth < 900) el.querySelector("#gDet").scrollIntoView({ behavior: "smooth" }); }));
    el.querySelector("#gRel").onclick = async () => { if (await releaseFlow(d.id, !A.released, d.title, wait)) { await gLoad(); gDraw(el); loadSection(); } };
    el.querySelector("#gAn").onclick = analytics;
    el.querySelector("#gSim").onclick = similarity;
    el.querySelector("#gZip").onclick = (e) => zipAssign([d], e.currentTarget, d.title);
    el.querySelector("#gEd").onclick = () => { const a = S.assess.find((x) => x.id === d.id); if (a) editAssessment(a); };
    gDetail(el.querySelector("#gDet"), el);
  }
  function filesBlock(files, pre) {
    if (!files || !files.length) return "";
    return `<div class="flist">${files.map((f) => `<div><div class="frow">${FF.badge(f)}<span class="nm" title="${esc(f.name)}">${esc(f.name)}</span><span class="sz">${FF.size(f.size)}</span>
      ${f.purged ? '<span class="pill">مؤرشف</span>' : `${FF.canPreview(f) ? `<button class="btn sm outline" type="button" data-pv="${pre}|${f.id}">${ic("eye", "sm")}عرض</button>` : ""}<button class="btn sm ghost" type="button" data-dl="${f.id}">${ic("download", "sm")}</button>`}</div><div class="fprev" id="pv-${pre}-${f.id}"></div></div>`).join("")}</div>`;
  }
  function wireFiles(box, files) {
    box.querySelectorAll("[data-dl]").forEach((b) => (b.onclick = () => FF.download(files.find((f) => f.id === b.dataset.dl) || { id: b.dataset.dl }, b)));
    box.querySelectorAll("[data-pv]").forEach((b) => (b.onclick = () => {
      const [pre, id] = b.dataset.pv.split("|"), pv = box.querySelector("#pv-" + pre + "-" + id);
      if (pv.innerHTML) { pv.innerHTML = ""; return; } FF.preview(files.find((f) => f.id === id), pv);
    }));
  }
  function gDetail(box, el) {
    const d = G.d, x = d.students.find((s) => s.enrollment_id === G.sel);
    if (!x) { box.innerHTML = emptyBox("users", "لا طلبة في الشعبة", ""); return; }
    const sb = x.sub || {}, A = d.assign || {}, rel = !!A.released, vers = sb.versions || [], z = subSt(x), P = d.parts;
    const v = (G.ver != null && vers.find((y) => y.version === G.ver)) || vers[0] || null;
    if (G.rubFor !== x.enrollment_id) { G.rubFor = x.enrollment_id; G.rub = JSON.parse(JSON.stringify(sb.rubric || {})); G.pen = sb.penalty_pct != null ? +sb.penalty_pct : 0; G.fb = sb.feedback || ""; G.reason = ""; }
    const L = d.students.filter(inFilt), i = L.findIndex((y) => y.enrollment_id === x.enrollment_id);
    let h = `<div class="card pad"><div class="row sp wrap" style="gap:8px"><div><h3 style="font-size:18px">${esc(x.full_name)}</h3><div class="tiny"><span class="mono">${esc(x.username)}</span> · <span class="sdot ${z[0]}" style="display:inline-block"></span> ${esc(z[1])}</div></div>
      <div class="row" style="gap:6px"><button class="btn sm outline" id="gPrev" ${i <= 0 ? "disabled" : ""}>${ic("right", "sm")}السابق</button><button class="btn sm outline" id="gNext" ${i < 0 || i >= L.length - 1 ? "disabled" : ""}>التالي${ic("left", "sm")}</button></div></div>`;
    // التسليم
    if (v) {
      h += `<div class="stbox" style="margin-top:12px"><div><span>النسخة</span><b>${v.version}${vers.length > 1 ? " من " + vers.length : ""}</b></div><div><span>وقت التسليم</span><b>${esc(fmtDT(v.submitted_at))}</b></div>
        <div><span>التأخير</span><b style="${v.late_minutes ? "color:var(--warn)" : ""}">${v.late_minutes ? esc(lateTxt(v.late_minutes)) : "في الموعد"}</b></div><div><span>إقرار النزاهة</span><b>${sb.integrity ? "✓ أقرّ بأن العمل من إنجازه" : "—"}</b></div></div>`;
      if (vers.length > 1) h += `<div class="vsel" style="margin-top:10px"><span class="tiny">النسخ:</span>${vers.map((y) => `<button class="btn sm ${y.version === v.version ? "primary" : "outline"}" data-ver="${y.version}">${y.version}${y.version === vers[0].version ? " (الأحدث)" : ""}</button>`).join("")}</div>`;
      if (sb.dirty) h += `<div class="tipbox tiny" style="margin-top:10px">يعدّل الطالب الآن مسودة جديدة لم يسلّمها بعد؛ ترى هنا آخر نسخة سلّمها.</div>`;
      (A.worksheet || []).forEach((w, k) => { h += `<div class="wsq" style="margin-top:10px"><div class="q">${k + 1}. ${esc(w.q)}</div><div class="anstext">${esc(((v.answers || [])[k]) || "—")}</div></div>`; });
      if (v.text) h += `<div style="margin-top:12px"><div class="row sp"><b>الإجابة المكتوبة</b><span class="tiny">${words(v.text)} كلمة</span></div><div class="anstext" style="margin-top:6px">${esc(v.text)}</div></div>`;
      if (v.files && v.files.length) h += `<div style="margin-top:12px"><b>الملفات (${v.files.length})</b><div style="margin-top:6px">${filesBlock(v.files, "s")}</div></div>`;
    } else h += `<div class="tipbox tiny" style="margin-top:12px">${sb.excused ? "الطالب معفى من هذا الواجب؛ لا يُحتسب له." : "لم يسلّم على المنصة" + (z[0] === "miss" ? "، وانتهى الموعد فيُحسب له صفر ما لم تمدّد له أو تعفه." : " بعد.") + " ويمكنك تصحيحه بالروبرك إن سلّمك ورقيًّا."}</div>`;
    h += "</div>";
    // الروبرك
    h += `<div class="card pad" style="margin-top:12px"><div class="row sp wrap"><h3 style="font-size:16px">${ic("target", "sm")} التصحيح بالروبرك</h3><span class="tiny">اضغط المستوى، أو اكتب علامة مخصّصة؛ ولكل معيار ملاحظة</span></div>
      <div class="rubwrap" style="margin-top:8px"><table class="rub pick"><thead><tr><th>المعيار</th>${RLV.map((n) => `<th>${n}</th>`).join("")}<th>العلامة والملاحظة</th></tr></thead><tbody>
      ${P.map((p) => { const r = G.rub[p.id] || {}; return `<tr data-p="${p.id}"><td class="cn"><b>${esc(p.label)}</b><span class="lbl-chip" dir="ltr">${p.objective_code}</span> <span class="tiny">من ${nf(+p.max, 2)}</span></td>
        ${(p.levels || []).map((l, k) => `<td class="lc ${r.lvl === k ? "sel" : ""}" data-k="${k}"><span class="p num">${nf(+l.pts, 2)}</span>${esc(l.desc || "")}</td>`).join("")}
        <td class="cx"><input class="input num" type="number" min="0" max="${+p.max}" step="0.25" data-pts value="${r.pts == null ? "" : r.pts}" placeholder="—"><textarea class="input" data-c placeholder="ملاحظة على المعيار">${esc(r.c || "")}</textarea></td></tr>`; }).join("")}
      </tbody></table></div>
      <div class="row sp wrap" style="margin-top:10px;gap:12px"><div class="gtot"><span class="tiny">العلامة</span><b class="num" id="gTot">—</b><span class="tiny">من ${nf(+d.max, 2)}</span><span id="gLv"></span></div>
        <label class="row" style="gap:6px"><span class="tiny">خصم التأخير ٪</span><input class="input num" type="number" min="0" max="100" step="1" id="gPen" value="${G.pen}" style="width:80px"></label></div>
      <div class="tiny" id="gRaw"></div>
      <label class="field" style="margin-top:12px"><span>ملاحظات عامة للطالب</span><textarea class="input" id="gFb" rows="4" placeholder="ما أحسنه، وما يحتاج تحسينه، وخطوته التالية…">${esc(G.fb)}</textarea></label>
      <div class="row sp wrap"><span class="tiny">بنك التعليقات — اضغط لإدراج تعليق</span><button class="btn sm ghost" id="gCbAdd">＋ حفظ المحدد في البنك</button></div><div class="cbank" id="gCb"></div>
      <div style="margin-top:12px"><b style="font-size:14px">ملفات ملاحظات للطالب</b> <span class="tiny">(نسخة مصحّحة، أو تسجيل، أو نموذج حل)</span><div style="margin-top:6px">${filesBlock(sb.feedback_files || [], "f")}</div>
        <button class="btn sm outline" id="gFfAdd" style="margin-top:6px">${ic("clip", "sm")}إرفاق ملف</button><input type="file" id="gFfIn" multiple hidden></div>
      ${rel && sb.graded_at ? `<label class="field" style="margin-top:12px"><span>سبب تعديل العلامة (مطلوب لأن العلامات منشورة)</span><input class="input" id="gWhy" value="${esc(G.reason || "")}" placeholder="مثال: مراجعة بعد اعتراض الطالب"></label>` : ""}
      <div class="row wrap" style="gap:8px;margin-top:14px"><button class="btn primary" id="gSave">${ic("check", "sm")}حفظ التصحيح</button><button class="btn outline" id="gSaveN">حفظ والتالي${ic("left", "sm")}</button>${sb.graded_at ? '<button class="btn ghost" id="gUn">إلغاء التصحيح</button>' : ""}
        <span class="tiny grow" style="text-align:end">${sb.graded_at ? "صُحّح " + esc(fmtDT(sb.graded_at, false)) + (rel ? " · منشور للطالب" : " · غير منشور بعد") : "لم يُصحَّح بعد"}</span></div></div>`;
    // الاستثناءات والسجل
    h += `<details class="card pad" style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">${ic("key", "sm")} استثناءات لهذا الطالب ${sb.extension_until || sb.excused || sb.reopen_until ? '<span class="pill warn">مفعّل</span>' : ""}</summary>
      <div class="fields two" style="margin-top:10px"><label class="field"><span>تمديد موعد التسليم له حتى</span><input class="input" type="datetime-local" id="gExt" value="${sb.extension_until ? toLocalInput(sb.extension_until) : ""}"></label>
        <div class="row" style="gap:6px;align-self:end"><button class="btn sm outline" id="gExtS">حفظ التمديد</button>${sb.extension_until ? '<button class="btn sm ghost" id="gExtC">إلغاء التمديد</button>' : ""}</div></div>
      <div class="fields two"><label class="field"><span>طلب إعادة التسليم حتى</span><input class="input" type="datetime-local" id="gRo" value="${sb.reopen_until ? toLocalInput(sb.reopen_until) : ""}"></label>
        <label class="field"><span>ما المطلوب منه في الإعادة</span><input class="input" id="gRoN" value="${esc(sb.reopen_note || "")}" placeholder="مثال: صحّح حساب هامش المساهمة"></label></div>
      <div class="row wrap" style="gap:6px"><button class="btn sm outline" id="gRoS">إرسال طلب الإعادة</button>${sb.reopen_until ? '<button class="btn sm ghost" id="gRoC">إلغاء الطلب</button>' : ""}
        <span class="grow"></span><label class="check"><input type="checkbox" id="gEx" ${sb.excused ? "checked" : ""}> معفى من هذا الواجب (عذر مقبول — لا يُحتسب له)</label></div>
      ${(sb.log || []).length ? `<div style="margin-top:12px"><b class="tiny">سجل تعديل العلامة</b>${sb.log.map((g) => `<div class="logl">${esc(fmtDT(g.at, false))}: ${g.old == null ? "—" : nf(+g.old, 2)} ← ${g.new == null ? "أُلغي التصحيح" : nf(+g.new, 2)}${g.reason ? " · " + esc(g.reason) : ""}</div>`).join("")}</div>` : ""}</details>`;
    box.innerHTML = h;
    // الملفات
    wireFiles(box, [...(v ? v.files || [] : []), ...(sb.feedback_files || [])]);
    box.querySelectorAll("[data-ver]").forEach((b) => (b.onclick = () => { G.ver = +b.dataset.ver; gDetail(box, el); }));
    box.querySelector("#gPrev").onclick = () => { if (i > 0) { G.sel = L[i - 1].enrollment_id; G.ver = null; gDraw(el); } };
    box.querySelector("#gNext").onclick = () => { if (i < L.length - 1) { G.sel = L[i + 1].enrollment_id; G.ver = null; gDraw(el); } };
    // الروبرك
    const tot = () => {
      let raw = 0, n = 0; P.forEach((p) => { const r = G.rub[p.id]; if (r && r.pts != null && r.pts !== "") { raw += +r.pts; n++; } });
      const pen = Math.max(0, Math.min(100, +G.pen || 0)), fin = P.reduce((t, p) => { const r = G.rub[p.id]; return t + (r && r.pts != null && r.pts !== "" ? round2(+r.pts * (1 - pen / 100)) : 0); }, 0);
      box.querySelector("#gTot").textContent = n ? nf(fin, 2) : "—";
      box.querySelector("#gLv").innerHTML = n === P.length ? lvChip(fin / +d.max * 100) : `<span class="tiny">قيّمت ${n} من ${P.length} معايير</span>`;
      box.querySelector("#gRaw").textContent = pen && n ? `قبل الخصم ${nf(raw, 2)} − خصم ${nf(pen, 0)}٪` + (v && v.late_minutes ? ` (تأخر ${lateTxt(v.late_minutes)})` : "") : "";
    };
    box.querySelectorAll("tr[data-p]").forEach((tr) => {
      const p = P.find((y) => y.id === tr.dataset.p), inp = tr.querySelector("[data-pts]");
      tr.querySelectorAll(".lc").forEach((td) => (td.onclick = () => {
        const k = +td.dataset.k; G.rub[p.id] = Object.assign(G.rub[p.id] || {}, { lvl: k, pts: +p.levels[k].pts });
        tr.querySelectorAll(".lc").forEach((t) => t.classList.toggle("sel", t === td)); inp.value = +p.levels[k].pts; tot();
      }));
      inp.oninput = () => { const val = inp.value === "" ? null : Math.max(0, Math.min(+p.max, +inp.value)); const k = val == null ? null : p.levels.findIndex((l) => +l.pts === val);
        G.rub[p.id] = Object.assign(G.rub[p.id] || {}, { pts: val, lvl: k >= 0 ? k : null }); tr.querySelectorAll(".lc").forEach((t) => t.classList.toggle("sel", +t.dataset.k === k)); tot(); };
      tr.querySelector("[data-c]").oninput = (e) => { G.rub[p.id] = Object.assign(G.rub[p.id] || {}, { c: e.target.value }); };
    });
    box.querySelector("#gPen").oninput = (e) => { G.pen = e.target.value; tot(); };
    const fb = box.querySelector("#gFb"); fb.oninput = () => (G.fb = fb.value);
    const why = box.querySelector("#gWhy"); if (why) why.oninput = () => (G.reason = why.value);
    tot();
    // بنك التعليقات
    const drawCb = () => {
      const cb = box.querySelector("#gCb");
      cb.innerHTML = G.cm.length ? G.cm.map((c) => `<span class="cb" data-ci="${c.id}" title="${esc(c.text)}"><span>${esc(c.text)}</span><i data-cx="${c.id}" title="حذف من البنك">✕</i></span>`).join("") : '<span class="tiny">البنك فارغ؛ اكتب تعليقًا تكرّره كثيرًا، وحدّده، ثم احفظه.</span>';
      cb.querySelectorAll("[data-ci]").forEach((b) => (b.onclick = (e) => { if (e.target.dataset.cx) return; const t = G.cm.find((c) => c.id === b.dataset.ci).text; fb.value = (fb.value.trim() ? fb.value.trim() + "\n" : "") + t; G.fb = fb.value; fb.focus(); }));
      cb.querySelectorAll("[data-cx]").forEach((b) => (b.onclick = async () => { try { await rpc("t_comment_del", { p_id: b.dataset.cx }); G.cm = G.cm.filter((c) => c.id !== b.dataset.cx); drawCb(); } catch (e) { toast(e.message, true); } }));
    };
    drawCb();
    box.querySelector("#gCbAdd").onclick = async () => {
      const t = (fb.value.substring(fb.selectionStart, fb.selectionEnd) || fb.value).trim(); if (!t) return toast("اكتب التعليق في الملاحظات أولًا (أو حدّد جزءًا منه)", true);
      try { const r = await rpc("t_comment_save", { p_course: course().id, p_text: t }); G.cm.push({ id: r.id, text: t }); drawCb(); toast("حُفظ في بنك التعليقات"); } catch (e) { toast(e.message, true); }
    };
    // ملفات الملاحظات
    box.querySelector("#gFfAdd").onclick = () => box.querySelector("#gFfIn").click();
    box.querySelector("#gFfIn").onchange = async (e) => {
      const b = box.querySelector("#gFfAdd"); spin(b, true, "جارٍ الرفع…");
      for (const f of [...e.target.files]) { try { await FF.upload(await FF.shrink(f), { assessment: d.id, role: "feedback", enrollment: x.enrollment_id }); } catch (er) { toast(er.message, true); } }
      await gLoad(); gDraw(el);
    };
    box.querySelectorAll('[data-dl]').forEach((b) => { const f = (sb.feedback_files || []).find((y) => y.id === b.dataset.dl); if (f) { const del = document.createElement("button"); del.className = "btn sm ghost"; del.textContent = "✕"; del.title = "حذف"; del.onclick = async () => { try { await rpc("f_delete", { p_file: f.id }); await gLoad(); gDraw(el); } catch (er) { toast(er.message, true); } }; b.after(del); } });
    // الحفظ
    const save = async (btn, next) => {
      const miss = P.filter((p) => !G.rub[p.id] || G.rub[p.id].pts == null || G.rub[p.id].pts === "");
      if (miss.length) return toast("قيّم كل المعايير: " + miss.map((p) => p.label).join("، "), true);
      spin(btn, true, "جارٍ الحفظ…");
      try {
        await rpc("t_grade", { p_assessment: d.id, p_enrollment: x.enrollment_id, p_rubric: G.rub, p_feedback: G.fb, p_penalty: +G.pen || 0, p_reason: G.reason || null });
        toast("حُفظ التصحيح"); G.rubFor = null; await gLoad();
        if (next) { const L2 = G.d.students.filter(inFilt); const nx = L2.slice(L2.findIndex((y) => y.enrollment_id === x.enrollment_id) + 1).find((y) => ["wait", "late"].includes(subSt(y)[0])) || L2[L2.findIndex((y) => y.enrollment_id === x.enrollment_id) + 1]; if (nx) G.sel = nx.enrollment_id; G.ver = null; }
        gDraw(el); loadSection();
      } catch (e) { toast(e.message, true); spin(btn, false); }
    };
    box.querySelector("#gSave").onclick = (e) => save(e.currentTarget, false);
    box.querySelector("#gSaveN").onclick = (e) => save(e.currentTarget, true);
    const un = box.querySelector("#gUn");
    if (un) un.onclick = async () => {
      if (rel && !(G.reason || "").trim()) return toast("العلامات منشورة؛ اكتب سبب إلغاء التصحيح في خانة السبب", true);
      if (!(await confirmSheet("إلغاء التصحيح", `ستُحذف علامة <b>${esc(x.full_name)}</b> في هذا الواجب ويعود «بانتظار التصحيح».`, "ألغِ التصحيح", true))) return;
      try { await rpc("t_ungrade", { p_assessment: d.id, p_enrollment: x.enrollment_id, p_reason: G.reason || null }); G.rubFor = null; await gLoad(); gDraw(el); loadSection(); } catch (e) { toast(e.message, true); }
    };
    // الاستثناءات
    const setX = async (p, msg) => { try { await rpc("t_sub_set", { p_assessment: d.id, p_enrollment: x.enrollment_id, p }); toast(msg); await gLoad(); gDraw(el); loadSection(); } catch (e) { toast(e.message, true); } };
    box.querySelector("#gExtS").onclick = () => { const t = fromLocalInput(box.querySelector("#gExt").value); if (!t) return toast("اختر تاريخ التمديد", true); setX({ extension_until: t }, "مُدّد الموعد لهذا الطالب"); };
    const ec = box.querySelector("#gExtC"); if (ec) ec.onclick = () => setX({ extension_until: null }, "أُلغي التمديد");
    box.querySelector("#gRoS").onclick = () => { const t = fromLocalInput(box.querySelector("#gRo").value); if (!t || new Date(t) <= new Date()) return toast("اختر موعدًا قادمًا لإعادة التسليم", true); setX({ reopen_until: t, reopen_note: box.querySelector("#gRoN").value }, "أُرسل طلب إعادة التسليم"); };
    const rc = box.querySelector("#gRoC"); if (rc) rc.onclick = () => setX({ reopen_until: null, reopen_note: null }, "أُلغي طلب الإعادة");
    box.querySelector("#gEx").onchange = (e) => setX({ excused: e.target.checked }, e.target.checked ? "أُعفي الطالب من الواجب" : "أُلغي الإعفاء");
  }
  // التحليل: نسبة التسليم، ومتوسط كل معيار، وتوزيع المستويات، والأهداف الأضعف
  function analytics() {
    const d = G.d, P = d.parts, X = d.students, gr = X.filter((x) => x.sub && x.sub.graded_at && x.sub.rubric);
    const subm = X.filter((x) => x.sub && x.sub.version > 0), onT = subm.filter((x) => !x.sub.late_minutes).length, ex = X.filter((x) => x.sub && x.sub.excused).length;
    const rows = P.map((p) => {
      const cnt = [0, 0, 0, 0, 0]; let t = 0, n = 0;
      gr.forEach((x) => { const r = x.sub.rubric[p.id]; if (!r || r.pts == null) return; const v = +r.pts; t += v; n++;
        const k = r.lvl != null ? r.lvl : v <= 0 ? 4 : p.levels.reduce((b, l, i) => (Math.abs(+l.pts - v) < Math.abs(+p.levels[b].pts - v) ? i : b), 0); cnt[k]++; });
      return { p, avg: n ? t / n / +p.max * 100 : null, cnt, n };
    });
    const o = course().objectives;
    const weak = rows.filter((r) => r.avg != null && r.avg < 70).sort((a, b) => a.avg - b.avg);
    openSheet(`<h3>${ic("chart", "sm")} تحليل «${esc(d.title)}»</h3>
      <div class="stbox" style="margin:10px 0"><div><span>سلّموا</span><b>${subm.length} من ${X.length - ex}</b></div><div><span>في الموعد</span><b>${onT}</b></div><div><span>متأخرون</span><b>${subm.length - onT}</b></div><div><span>معفون</span><b>${ex}</b></div><div><span>مصحَّح</span><b>${gr.length}</b></div></div>
      <p class="tiny">المتوسطات من نقاط الروبرك قبل خصم التأخير — تقيس جودة العمل نفسه.</p>
      <div class="tw"><table class="t"><thead><tr><th>المعيار</th><th>الهدف</th><th class="num">المتوسط</th><th>توزيع المستويات (متميّز ← مبتدئ ← صفر)</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td><b>${esc(r.p.label)}</b></td><td><span class="lbl-chip" dir="ltr">${r.p.objective_code}</span></td><td class="num">${r.avg == null ? "—" : pc(r.avg)} ${r.avg == null ? "" : lvChip(r.avg)}</td>
        <td>${r.n ? `<div class="distbar">${r.cnt.map((c, k) => c ? `<i class="d${4 - k}" style="width:${c / r.n * 100}%" title="${k < 4 ? RLV[k] : "صفر"}: ${c}"></i>` : "").join("")}</div><span class="tiny">${r.cnt.slice(0, 4).map((c, k) => RLV[k] + " " + c).join(" · ")}${r.cnt[4] ? " · صفر " + r.cnt[4] : ""}</span>` : '<span class="tiny">—</span>'}</td></tr>`).join("")}</tbody></table></div>
      <div class="sect"><h3>${ic("spark", "sm")} أهداف تحتاج إعادة تدريس</h3>${weak.length ? '<div class="list card">' + weak.map((r) => `<div class="li"><span><span class="lbl-chip" dir="ltr">${r.p.objective_code}</span> ${esc((o.find((y) => y.code === r.p.objective_code) || {}).text || "")}<div class="tiny">المعيار: ${esc(r.p.label)}</div></span><b class="num">${pc(r.avg)}</b></div>`).join("") + "</div>" : '<p class="tiny">لا معيار متوسطه أقل من 70٪ حتى الآن.</p>'}</div>`, true);
  }
  // فحص التشابه: نص الطلبة (5 كلمات متتالية) + الملفات المتطابقة بصمةً
  function similarity() {
    const d = G.d, docs = d.students.filter((x) => x.sub && x.sub.version > 0);
    const norm = (t) => String(t || "").replace(/[ً-ْـ]/g, "").replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[^\p{L}\p{N}\s]/gu, " ").toLowerCase().split(/\s+/).filter(Boolean);
    const sh = (t) => { const w = norm(t), s = new Set(); for (let i = 0; i + 5 <= w.length; i++) s.add(w.slice(i, i + 5).join(" ")); return s; };
    const S2 = docs.map((x) => ({ x, s: sh([x.sub.text, ...(x.sub.answers || [])].join(" \n ")) }));
    const pairs = [];
    for (let i = 0; i < S2.length; i++) for (let j = i + 1; j < S2.length; j++) {
      const a = S2[i].s, b = S2[j].s; if (a.size < 4 || b.size < 4) continue;
      let inter = 0; a.forEach((g) => b.has(g) && inter++); const jac = inter / (a.size + b.size - inter);
      if (jac >= 0.2) pairs.push([S2[i].x, S2[j].x, jac, inter]);
    }
    pairs.sort((a, b) => b[2] - a[2]);
    const byHash = {}; docs.forEach((x) => (x.sub.files || []).forEach((f) => { if (f.sha256) (byHash[f.sha256] = byHash[f.sha256] || []).push([x, f]); }));
    const dup = Object.values(byHash).filter((g) => new Set(g.map((y) => y[0].enrollment_id)).size > 1);
    openSheet(`<h3>${ic("copy", "sm")} فحص التشابه بين الطلبة</h3><p class="tiny">مقارنة داخلية بين تسليمات هذه الشعبة فقط: نسبة العبارات المشتركة (كل 5 كلمات متتالية) في الإجابات المكتوبة، والملفات المتطابقة تمامًا. النسبة مؤشر للمراجعة وليست حكمًا؛ اقرأ التسليمين قبل أي قرار.</p>
      <div class="sect"><h3>النصوص المتشابهة (20٪ فأكثر)</h3>${pairs.length ? pairs.map(([a, b, j, n]) => `<div class="simrow"><span><b>${esc(a.full_name)}</b> ↔ <b>${esc(b.full_name)}</b><div class="tiny">${n} عبارة مشتركة</div></span><span class="pill ${j >= 0.5 ? "bad" : "warn"}">${pc(j * 100)}</span></div>`).join("") : '<p class="tiny">لا تشابه لافت في النصوص.</p>'}</div>
      <div class="sect"><h3>ملفات متطابقة بين طلبة مختلفين</h3>${dup.length ? dup.map((g) => `<div class="simrow"><span>${g.map(([x, f]) => `<b>${esc(x.full_name)}</b> <span class="tiny">(${esc(f.name)})</span>`).join(" ↔ ")}</span><span class="pill bad">متطابق</span></div>`).join("") : '<p class="tiny">لا ملفات متطابقة.</p>'}</div>`, true);
  }
  // تنزيل تسليمات واجب أو أكثر في ملف ZIP واحد (مجلد لكل طالب)
  async function zipAssign(list, btn, name) {
    const lab = btn ? btn.innerHTML : "";
    try {
      if (btn) btn.textContent = "تحضير…";
      const J = await FF.zipLib(), z = new J();
      const sum = [["الواجب", "الرقم الجامعي", "اسم الطالب", "الحالة", "النسخة", "وقت التسليم", "التأخير", "العلامة", "من", "المستوى"]];
      let nf0 = 0;
      for (const d0 of list) {
        const d = d0.students ? d0 : await rpc("t_subs", { p_assessment: d0.id }), A = d.assign || {};
        const root = list.length > 1 ? z.folder(FF.safe(d.title)) : z;
        for (const x of d.students) {
          const sb = x.sub || {}, st = subSt(x), sc = sb.graded_at ? sumSc(x) : null;
          sum.push([d.title, x.username, x.full_name, st[1], sb.version || "", sb.submitted_at ? fmtDT(sb.submitted_at, false) : "", lateTxt(sb.late_minutes), sc == null ? "" : round2(sc), +d.max, sc == null ? "" : LV[lvOf(sc / d.max * 100)]]);
          if (!sb.version) continue;
          const dir = root.folder(FF.safe(x.username + " - " + x.full_name));
          if (sb.text) dir.file("الإجابة المكتوبة.txt", sb.text);
          if ((A.worksheet || []).length) dir.file("إجابات ورقة العمل.txt", A.worksheet.map((w, k) => k + 1 + ". " + w.q + "\n" + ((sb.answers || [])[k] || "—")).join("\n\n"));
          let k = 0;
          for (const f of sb.files || []) { if (f.purged) continue; k++; if (btn) btn.textContent = "ملف " + ++nf0 + "…"; const r = await FF.blob(f.id); dir.file(k + " - " + FF.safe(f.name), r.blob); }
        }
      }
      z.file("ملخص التسليمات.csv", csv(sum));
      if (btn) btn.textContent = "ضغط…";
      FF.save(await z.generateAsync({ type: "blob" }), FF.safe(name) + ".zip"); toast("نُزّل ملف ZIP (" + nf0 + " ملفًا)");
    } catch (e) { toast(e.message, true); }
    if (btn) btn.innerHTML = lab;
  }

  // ===================== البداية =====================
  const s0 = session();
  if (s0 && s0.token && s0.role === "teacher") { if (s0.must_change) showLogin(true); else start(); }
  else showLogin(false);
})();

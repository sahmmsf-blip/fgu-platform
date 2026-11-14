// لوحة المحاضر
(function () {
  const { rpc, esc, $, $$, toast, modal, confirmBox, busy, pct, lvl, bar, dt, toLocalInput, fromLocalInput, copy, outcomeMastery, logout, guard } = FGU;
  if (!guard("teacher")) return;
  const S = { boot: null, sec: null, tab: "dash", roster: [], assess: [], book: null, qs: null };
  const course = () => S.boot.courses.find((c) => c.id === (S.sec && S.sec.course_id)) || S.boot.courses[0];
  const term = (id) => S.boot.terms.find((t) => t.id === id) || {};
  const comp = (id) => course().components.find((c) => c.id === id) || {};
  const main = $("#main");
  const objLabel = (code) => { const o = course().objectives.find((x) => x.code === code); return o ? `${code} — ${o.text}` : code; };
  const chapters = () => { const m = new Map(); course().objectives.forEach((o) => { if (!m.has(o.chapter)) m.set(o.chapter, { ch: o.chapter, title: o.chapter_title, objs: [] }); m.get(o.chapter).objs.push(o); }); return [...m.values()]; };

  // ── التحميل ──
  async function boot(keepSec) {
    S.boot = await rpc("t_bootstrap");
    const secs = S.boot.sections.filter((s) => !s.archived);
    const saved = (() => { try { return localStorage.getItem("fgu.sec"); } catch (e) { return null; } })();
    S.sec = secs.find((s) => s.id === (keepSec || saved)) || secs.find((s) => term(s.term_id).is_current) || secs[0] || null;
    const sel = $("#selSec");
    sel.innerHTML = secs.length ? secs.map((s) => `<option value="${s.id}" ${S.sec && s.id === S.sec.id ? "selected" : ""}>${esc(s.name)} — ${esc(term(s.term_id).name || "")} (${s.n})</option>`).join("") : `<option>لا شعب بعد</option>`;
    $("#courseName").textContent = course() ? course().title : "";
    await loadSection();
  }
  async function loadSection() {
    S.qs = null;
    if (!S.sec) { S.roster = []; S.assess = []; S.book = null; return render(); }
    [S.roster, S.assess, S.book] = await Promise.all([rpc("t_roster", { p_section: S.sec.id }), rpc("t_assessments", { p_section: S.sec.id }), rpc("t_gradebook", { p_section: S.sec.id })]);
    render();
  }
  function drawSel() { const secs = S.boot.sections.filter((s) => !s.archived); $("#selSec").innerHTML = secs.length ? secs.map((s) => `<option value="${s.id}" ${S.sec && s.id === S.sec.id ? "selected" : ""}>${esc(s.name)} — ${esc(term(s.term_id).name || "")} (${s.n})</option>`).join("") : `<option>لا شعب بعد</option>`; }
  async function refresh() { [S.roster, S.assess, S.book, S.boot] = await Promise.all([rpc("t_roster", { p_section: S.sec.id }), rpc("t_assessments", { p_section: S.sec.id }), rpc("t_gradebook", { p_section: S.sec.id }), rpc("t_bootstrap")]); S.sec = S.boot.sections.find((x) => x.id === S.sec.id) || S.sec; drawSel(); render(); }
  $("#selSec").onchange = (e) => { S.sec = S.boot.sections.find((s) => s.id === e.target.value); try { localStorage.setItem("fgu.sec", S.sec.id); } catch (x) { } loadSection(); };
  $("#btnOut").onclick = logout;
  $("#tabs").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; $$("#tabs button").forEach((x) => x.classList.toggle("on", x === b)); S.tab = b.dataset.t; render(); };
  function render() {
    if (!S.sec && S.tab !== "settings" && S.tab !== "bank") { main.innerHTML = `<div class="card empty">لا توجد شعبة فعّالة. أنشئ شعبة من <b>الإعدادات</b>.</div>`; return; }
    ({ dash, people, assess, book, objs, bank, settings })[S.tab]();
  }
  const active = () => S.book.students.filter((s) => s.status === "active");

  // ── الرئيسية ──
  function dash() {
    const st = active(), c = course();
    const tot = st.map((s) => s.total).filter((v) => v != null), ws = st.length ? Math.max(0, ...st.map((s) => s.wsofar || 0)) : 0;
    const avg = tot.length ? tot.reduce((a, b) => a + b, 0) / tot.length : null;
    const om = {}; st.forEach((s) => Object.entries(s.objs || {}).forEach(([k, v]) => { om[k] = om[k] || [0, 0]; om[k][0] += +v[0]; om[k][1] += +v[1]; }));
    const weak = Object.entries(om).filter(([, v]) => v[1] > 0).map(([k, v]) => [k, v[0] / v[1] * 100]).sort((a, b) => a[1] - b[1]).slice(0, 6);
    const never = S.roster.filter((r) => r.status === "active" && !r.last_login).length;
    main.innerHTML = `
      <div class="kpis">
        <div class="kpi"><b>${st.length}</b><span>طالب في ${esc(S.sec.name)}</span></div>
        <div class="kpi g"><b>${avg == null ? "—" : avg.toFixed(1)}</b><span>متوسط المجموع (من ${ws} محسوبة حتى الآن)</span></div>
        <div class="kpi"><b>${S.assess.length}</b><span>تقويمًا في الشعبة</span></div>
        <div class="kpi g"><b>${c.qcount}</b><span>سؤالًا فعّالًا في البنك</span></div>
      </div>
      ${never ? `<div class="note" style="margin-bottom:14px">${never} طالبًا لم يدخلوا المنصة بعد. من تبويب <b>الطلبة</b> يمكنك طباعة بطاقات الدخول لهم.</div>` : ""}
      <div class="grid2">
        <div class="card"><h2>توزيع العلامات (الخطة الدراسية)</h2>
          <div class="tw"><table class="t"><tr><th>المكوّن</th><th class="c">الوزن</th><th class="c">متوسط الشعبة</th></tr>
          ${c.components.map((k) => { const v = st.map((s) => s.comps[k.id]).filter((x) => x != null); return `<tr><td>${esc(k.title)}</td><td class="c num">${k.weight}%</td><td class="c">${v.length ? pct(v.reduce((a, b) => a + b, 0) / v.length) : "—"}</td></tr>`; }).join("")}
          </table></div></div>
        <div class="card"><h2>أضعف الأهداف في الشعبة</h2>
          ${weak.length ? weak.map(([k, p]) => `<div class="obj"><span class="code">${k}</span><span class="small">${esc((c.objectives.find((o) => o.code === k) || {}).text || "")}</span>${bar(p)}<span class="num small">${pct(p, 0)}</span></div>`).join("") : `<p class="muted">تظهر هنا بعد رصد علامات أو حلّ اختبارات.</p>`}
        </div>
      </div>`;
  }

  // ── الطلبة ──
  function people() {
    const R = S.roster;
    main.innerHTML = `
      <div class="card"><div class="row"><h2 class="grow">طلبة ${esc(S.sec.name)} — ${esc(term(S.sec.term_id).name || "")}</h2>
        <button class="btn pri" id="bAdd">إضافة طلبة</button><button class="btn" id="bLink">ربط طلبة سابقين</button><button class="btn" id="bCards">بطاقات الدخول</button></div>
      ${R.length ? `<div class="tw"><table class="t"><tr><th>#</th><th>الرقم الجامعي</th><th>الاسم</th><th>آخر دخول</th><th>الحالة</th><th></th></tr>
        ${R.map((r, i) => `<tr><td class="num">${i + 1}</td><td class="num">${esc(r.username)}</td><td>${esc(r.full_name)}</td>
          <td class="small">${r.last_login ? dt(r.last_login) : `<span class="pill warn">لم يدخل بعد</span>`}${r.must_change && r.last_login ? ` <span class="pill">ينتظر تغيير كلمة المرور</span>` : ""}</td>
          <td>${r.status === "active" ? (r.active ? `<span class="pill ok">مسجّل</span>` : `<span class="pill bad">موقوف</span>`) : `<span class="pill">منسحب</span>`}</td>
          <td class="row" style="gap:.3em"><button class="btn sm" data-reset="${r.student_id}">كلمة مرور جديدة</button><button class="btn sm" data-edit="${r.student_id}">تعديل</button>
          <button class="btn sm" data-st="${r.enrollment_id}" data-v="${r.status === "active" ? "withdrawn" : "active"}">${r.status === "active" ? "انسحاب" : "إعادة تسجيل"}</button></td></tr>`).join("")}
        </table></div>` : `<div class="empty">لا طلبة في الشعبة بعد. اضغط «إضافة طلبة».</div>`}
      </div>`;
    $("#bAdd").onclick = addStudents; $("#bLink").onclick = linkStudents; $("#bCards").onclick = () => cards(R.filter((r) => r.status === "active").map((r) => ({ username: r.username, full_name: r.full_name, password: null })));
    $$("[data-reset]").forEach((b) => b.onclick = async () => {
      const r = R.find((x) => x.student_id === b.dataset.reset);
      if (!(await confirmBox(`إنشاء كلمة مرور مؤقتة جديدة للطالب ${r.full_name}؟ ستتوقف كلمته الحالية، وسيُطلب منه تغييرها عند الدخول.`, "إنشاء"))) return;
      const res = await busy(b, () => rpc("t_reset_password", { p_student: r.student_id })); if (!res) return;
      cards([{ username: res.username, full_name: r.full_name, password: res.password }], "كلمة المرور الجديدة"); refresh();
    });
    $$("[data-edit]").forEach((b) => b.onclick = () => {
      const r = R.find((x) => x.student_id === b.dataset.edit);
      const m = modal({ title: "تعديل بيانات الطالب", body: `<label class="f"><span>الاسم الكامل</span><input type="text" id="eN" value="${esc(r.full_name)}"></label>
        <label class="f"><span>البريد الإلكتروني (اختياري)</span><input type="email" id="eE" dir="ltr" value="${esc(r.email || "")}"></label>
        <label class="row"><input type="checkbox" id="eA" style="width:auto" ${r.active ? "checked" : ""}> الحساب فعّال (إيقافه يمنع دخوله إلى المنصة كلها)</label>
        <p class="muted small">الرقم الجامعي (${esc(r.username)}) هو اسم الدخول ولا يُعدَّل.</p>`, foot: `<button class="btn pri" id="eS">حفظ</button>` });
      $("#eS", m).onclick = (e) => busy(e.target, async () => { await rpc("t_update_student", { p_student: r.student_id, p: { full_name: $("#eN", m).value, email: $("#eE", m).value, active: $("#eA", m).checked } }); m.close(); toast("حُفظ", "ok"); refresh(); });
    });
    $$("[data-st]").forEach((b) => b.onclick = async () => { await busy(b, () => rpc("t_set_enrollment", { p_enrollment: b.dataset.st, p_status: b.dataset.v })); refresh(); });
  }
  function addStudents() {
    const m = modal({ title: "إضافة طلبة إلى " + S.sec.name, wide: true, body: `
      <p class="muted">الصق قائمة الطلبة: كل طالب في سطر — <b>الرقم الجامعي</b> ثم <b>الاسم الكامل</b> (مفصولين بفاصلة أو مسافة جدولة، ويمكن النسخ مباشرة من Excel). ويمكن إضافة البريد عمودًا ثالثًا.</p>
      <textarea id="aT" dir="auto" placeholder="2026001	أحمد محمد علي&#10;2026002	سارة خالد يوسف"></textarea>
      <p class="info small">الطالب الجديد يحصل على كلمة مرور مؤقتة تظهر لك مرة واحدة الآن، ويُجبَر على تغييرها عند أول دخول. وإذا كان الرقم الجامعي موجودًا من فصل سابق يُربط حسابه نفسه بهذه الشعبة دون كلمة مرور جديدة.</p>
      <div id="aP"></div>`, foot: `<button class="btn pri" id="aS">إضافة</button>` });
    const parse = () => $("#aT", m).value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => { const p = l.split(/\t|,|،|;/).map((x) => x.trim()); if (p.length < 2) { const i = l.indexOf(" "); return { username: l.slice(0, i), full_name: l.slice(i + 1).trim() }; } return { username: p[0], full_name: p[1], email: p[2] || "" }; });
    $("#aT", m).oninput = () => { const rows = parse(); $("#aP", m).innerHTML = rows.length ? `<p class="small muted">${rows.length} طالبًا: ${rows.slice(0, 4).map((r) => esc(r.username + " — " + r.full_name)).join("، ")}${rows.length > 4 ? "…" : ""}</p>` : ""; };
    $("#aS", m).onclick = (e) => busy(e.target, async () => {
      const rows = parse(); if (!rows.length) return toast("الصق قائمة الطلبة أولًا", "err");
      const res = await rpc("t_add_students", { p_section: S.sec.id, p_rows: rows }); m.close();
      toast(`أُضيف ${res.length} طالبًا`, "ok"); await refresh(); S.boot = await rpc("t_bootstrap");
      const nw = res.filter((r) => r.password); if (nw.length) cards(nw, "بطاقات دخول الطلبة الجدد");
    });
  }
  async function linkStudents() {
    const all = await rpc("t_all_students"); const inSec = new Set(S.roster.map((r) => r.student_id));
    const cand = all.filter((s) => !inSec.has(s.id));
    const m = modal({ title: "ربط طلبة سابقين بـ " + S.sec.name, wide: true, body: cand.length ? `
      <input type="text" id="lQ" placeholder="ابحث بالاسم أو الرقم الجامعي" style="margin-bottom:10px">
      <div class="tw" style="max-height:50vh;overflow:auto"><table class="t"><tr><th></th><th>الرقم الجامعي</th><th>الاسم</th><th>شعبه السابقة</th></tr>
      ${cand.map((s) => `<tr data-q="${esc((s.username + " " + s.full_name).toLowerCase())}"><td><input type="checkbox" value="${s.id}" style="width:auto"></td><td class="num">${esc(s.username)}</td><td>${esc(s.full_name)}</td><td class="small muted">${esc(s.sections.join("، "))}</td></tr>`).join("")}
      </table></div><p class="muted small">يحتفظ الطالب بحسابه وكلمة مروره، وتبقى علاماته في الشعب السابقة كما هي.</p>` : `<div class="empty">لا يوجد طلبة سابقون غير مسجّلين في هذه الشعبة.</div>`,
      foot: cand.length ? `<button class="btn pri" id="lS">ربط المحددين</button>` : "" });
    if (!cand.length) return;
    $("#lQ", m).oninput = (e) => { const v = e.target.value.trim().toLowerCase(); $$("tr[data-q]", m).forEach((tr) => tr.classList.toggle("hide", v && !tr.dataset.q.includes(v))); };
    $("#lS", m).onclick = (e) => busy(e.target, async () => {
      const ids = $$("input[type=checkbox]:checked", m).map((x) => x.value); if (!ids.length) return toast("اختر طالبًا واحدًا على الأقل", "err");
      await rpc("t_enroll", { p_section: S.sec.id, p_students: ids }); m.close(); toast(`رُبط ${ids.length} طالبًا`, "ok"); refresh();
    });
  }
  function cards(list, title) {
    const url = location.origin + location.pathname.replace(/teacher\.html$/, "");
    const m = modal({ title: title || "بطاقات الدخول", wide: true, body: `
      <p class="muted noprint">${list.some((x) => x.password) ? "انسخ كلمات المرور أو اطبعها الآن؛ لن تظهر مرة أخرى. وكل طالب يُجبَر على تغييرها عند أول دخول." : "بطاقات بالرقم الجامعي ورابط المنصة (كلمات المرور لا تُعرض؛ لإصدار كلمة جديدة استعمل «كلمة مرور جديدة»)."}</p>
      <div class="tw"><table class="t creds"><tr><th>الاسم</th><th>الرقم الجامعي (اسم الدخول)</th>${list.some((x) => x.password) ? "<th>كلمة المرور المؤقتة</th>" : ""}</tr>
      ${list.map((x) => `<tr><td>${esc(x.full_name)}</td><td class="num">${esc(x.username)}</td>${list.some((y) => y.password) ? `<td class="pw">${esc(x.password || "— (حساب سابق)")}</td>` : ""}</tr>`).join("")}</table></div>
      <p class="small" style="margin-top:10px">رابط المنصة: <span class="ltr">${esc(url)}</span></p>`,
      foot: `<button class="btn" id="cC">نسخ كنص</button><button class="btn pri" onclick="window.print()">طباعة</button>` });
    $("#cC", m).onclick = () => copy(list.map((x) => `${x.full_name}\t${x.username}${x.password ? "\t" + x.password : ""}`).join("\n") + "\n" + url);
  }

  // ── التقويمات ──
  function assess() {
    const c = course();
    main.innerHTML = `<div class="row" style="margin-bottom:12px"><h2 class="grow" style="margin:0">التقويمات — ${esc(S.sec.name)}</h2><button class="btn pri" id="bNew">تقويم جديد</button></div>
      ${c.components.map((k) => { const L = S.assess.filter((a) => a.component_id === k.id); return `<div class="card"><h2>${esc(k.title)} <span class="pill gold">${k.weight}%</span></h2>
        ${L.length ? `<div class="tw"><table class="t"><tr><th>العنوان</th><th>النوع</th><th class="c">العلامة</th><th>الأهداف</th><th>الحالة</th><th></th></tr>
        ${L.map((a) => { const codes = a.kind === "quiz" ? (a.quiz.objectives || []) : [...new Set(a.parts.map((p) => p.objective_code))];
          const st = a.kind === "quiz" ? `${a.takers} طالبًا حلّوه (${a.attempts} محاولة)<br><span class="small muted">${a.open_at ? "من " + dt(a.open_at) : ""} ${a.close_at ? "إلى " + dt(a.close_at) : "بلا موعد إغلاق"}</span>` : `رُصد لـ ${a.entered} من ${active().length}`;
          return `<tr><td><b>${esc(a.title)}</b>${a.counted ? "" : ` <span class="pill">لا يُحتسب</span>`}</td><td>${a.kind === "quiz" ? "إلكتروني" : "يدوي"}</td><td class="c num">${+a.max_score}</td>
          <td class="small">${codes.slice(0, 8).join("، ")}${codes.length > 8 ? "…" : ""}</td><td class="small">${a.published ? `<span class="pill ok">منشور للطلبة</span>` : `<span class="pill warn">مخفي</span>`}<br>${st}</td>
          <td class="row" style="gap:.3em">${a.kind === "manual" ? `<button class="btn sm pri" data-marks="${a.id}">رصد العلامات</button>` : ""}<button class="btn sm" data-ed="${a.id}">تعديل</button><button class="btn sm danger" data-del="${a.id}">حذف</button></td></tr>`; }).join("")}
        </table></div>` : `<p class="muted small">لا تقويمات في هذا المكوّن بعد.</p>`}</div>`; }).join("")}`;
    $("#bNew").onclick = () => editAssessment(null);
    $$("[data-ed]").forEach((b) => b.onclick = () => editAssessment(S.assess.find((a) => a.id === b.dataset.ed)));
    $$("[data-marks]").forEach((b) => b.onclick = () => marks(S.assess.find((a) => a.id === b.dataset.marks)));
    $$("[data-del]").forEach((b) => b.onclick = async () => {
      const a = S.assess.find((x) => x.id === b.dataset.del);
      if (!(await confirmBox(`حذف «${a.title}» نهائيًا مع كل علاماته ومحاولات الطلبة فيه؟`, "حذف"))) return;
      await busy(b, () => rpc("t_delete_assessment", { p_id: a.id })); refresh();
    });
  }
  function objPicker(selected, name) {
    const set = new Set(selected || []);
    return chapters().map((ch) => `<details class="ch"><summary><input type="checkbox" data-chall="${ch.ch}" style="width:auto"> الفصل ${ch.ch}: ${esc(ch.title)} <span class="pill" data-chc="${ch.ch}"></span></summary><div>
      ${ch.objs.map((o) => `<label class="row small" style="align-items:flex-start;margin:.3em 0"><input type="checkbox" name="${name}" value="${o.code}" data-ch="${ch.ch}" style="width:auto;margin-top:.3em" ${set.has(o.code) ? "checked" : ""}><span><b class="ltr">${o.code}</b> ${esc(o.text)}</span></label>`).join("")}</div></details>`).join("");
  }
  function wirePicker(m, name, onChange) {
    const upd = () => { chapters().forEach((ch) => { const all = $$(`input[name=${name}][data-ch="${ch.ch}"]`, m), on = all.filter((x) => x.checked).length; const h = $(`[data-chall="${ch.ch}"]`, m); h.checked = on === all.length; h.indeterminate = on > 0 && on < all.length; $(`[data-chc="${ch.ch}"]`, m).textContent = on ? on + "/" + all.length : ""; }); onChange && onChange(); };
    $$("[data-chall]", m).forEach((h) => { h.onclick = (e) => e.stopPropagation(); h.onchange = () => { $$(`input[name=${name}][data-ch="${h.dataset.chall}"]`, m).forEach((x) => x.checked = h.checked); upd(); }; });
    $$(`input[name=${name}]`, m).forEach((x) => x.onchange = upd); upd();
  }
  async function editAssessment(a) {
    const c = course();
    if (!S.qs) S.qs = await rpc("t_questions", { p_course: c.id });
    const isQuizComp = (cid) => (comp(cid).kind === "quiz");
    const k0 = a ? a.component_id : c.components[0].id;
    const m = modal({ title: a ? "تعديل تقويم" : "تقويم جديد", wide: true, body: `
      <div class="grid2">
        <label class="f"><span>المكوّن (من توزيع العلامات)</span><select id="xC">${c.components.map((k) => `<option value="${k.id}" ${k.id === k0 ? "selected" : ""}>${esc(k.title)} (${k.weight}%)</option>`).join("")}</select></label>
        <label class="f"><span>العنوان</span><input type="text" id="xT" value="${esc(a ? a.title : "")}" placeholder="مثال: اختبار الفصل 6 / المحطة 3"></label>
        <label class="f"><span>طريقة التقويم</span><select id="xK" ${a ? "disabled" : ""}><option value="manual">يدوي: أرصد العلامات بنفسي (مقسّمة على الأهداف)</option><option value="quiz">اختبار إلكتروني يحلّه الطالب على المنصة</option></select></label>
      </div>
      <div class="row small" style="margin-bottom:10px"><label class="row"><input type="checkbox" id="xP" style="width:auto" ${a && a.published ? "checked" : ""}> منشور للطلبة</label>
        <label class="row"><input type="checkbox" id="xN" style="width:auto" ${!a || a.counted ? "checked" : ""}> يُحتسب في العلامة</label></div>
      <div id="xMan">
        <p class="info small">قسّم التقويم إلى أجزاء (أسئلة أو بنود معيار تصحيح)، واربط كل جزء بهدف من أهداف الفصول. هكذا تُحسب علامة الطالب، ويُحسب إتقانه لكل هدف تلقائيًا.</p>
        <div class="tw"><table class="t" id="xParts"><tr><th>الجزء</th><th>الهدف</th><th class="c">العلامة القصوى</th><th></th></tr></table></div>
        <div class="row" style="margin-top:8px"><button class="btn sm" id="xAdd">+ جزء</button><span class="muted small">أو تعبئة سريعة:</span><select id="xFillCh" style="width:auto"><option value="">جزء لكل هدف من فصل…</option>${chapters().map((ch) => `<option value="${ch.ch}">الفصل ${ch.ch}</option>`).join("")}</select>
          <span class="right">المجموع: <b class="num" id="xSum">0</b></span></div>
      </div>
      <div id="xQuiz" class="hide">
        <div class="grid2">
          <label class="f"><span>عدد الأسئلة لكل محاولة</span><input type="number" id="qN" min="1" value="${a && a.quiz ? a.quiz.n : 10}"></label>
          <label class="f"><span>العلامة القصوى</span><input type="number" id="qM" min="1" value="${a ? +a.max_score : 10}"></label>
          <label class="f"><span>مدة المحاولة بالدقائق (0 = بلا حد)</span><input type="number" id="qT" min="0" value="${a && a.quiz ? (a.quiz.minutes || 0) : 15}"></label>
          <label class="f"><span>عدد المحاولات المسموح (0 = غير محدود)</span><input type="number" id="qA" min="0" value="${a && a.quiz ? (a.quiz.attempts || 0) : 0}"></label>
          <label class="f"><span>يفتح في</span><input type="datetime-local" id="qO" value="${toLocalInput(a && a.open_at)}"></label>
          <label class="f"><span>يُغلق في</span><input type="datetime-local" id="qC" value="${toLocalInput(a && a.close_at)}"></label>
        </div>
        <p class="note small">حسب الخطة الدراسية: الاختبارات القصيرة تُعاد وتُحتسب أفضل محاولة. في كل محاولة تُسحب أسئلة عشوائية من الأهداف المختارة وتُخلط البدائل. وتظهر الإجابات الصحيحة للطالب بعد موعد الإغلاق فقط. ومن لم يحلّ الاختبار حتى إغلاقه تُحسب له صفرًا.</p>
        <h3>الأهداف التي يقيسها الاختبار <span class="muted small" id="qAvail"></span></h3>
        <div id="qObjs">${objPicker(a && a.quiz ? a.quiz.objectives : [], "qo")}</div>
      </div>`, foot: `<button class="btn pri" id="xS">حفظ</button>` });
    const kSel = $("#xK", m); kSel.value = a ? a.kind : (isQuizComp(k0) ? "quiz" : "manual");
    const showK = () => { $("#xMan", m).classList.toggle("hide", kSel.value !== "manual"); $("#xQuiz", m).classList.toggle("hide", kSel.value !== "quiz"); };
    $("#xC", m).onchange = () => { if (!a) { kSel.value = isQuizComp($("#xC", m).value) ? "quiz" : "manual"; showK(); } };
    kSel.onchange = showK; showK();
    const objOpts = (sel) => chapters().map((ch) => `<optgroup label="الفصل ${ch.ch}: ${esc(ch.title)}">${ch.objs.map((o) => `<option value="${o.code}" ${o.code === sel ? "selected" : ""}>${o.code} — ${esc(o.text.slice(0, 70))}</option>`).join("")}</optgroup>`).join("");
    const tb = $("#xParts", m);
    const sum = () => { $("#xSum", m).textContent = $$("[data-pm]", tb).reduce((s, x) => s + (+x.value || 0), 0); };
    const addRow = (p) => { const tr = document.createElement("tr"); if (p && p.id) tr.dataset.id = p.id;
      tr.innerHTML = `<td><input type="text" data-pl value="${esc(p ? p.label : "س" + ($$("tr", tb).length))}" style="width:110px"></td><td><select data-po>${objOpts(p && p.objective_code)}</select></td><td class="c"><input type="number" data-pm min="0.5" step="0.5" value="${p ? +p.max_score : 5}" style="width:90px"></td><td><button class="btn sm danger" data-rm>×</button></td>`;
      tb.appendChild(tr); tr.oninput = () => tr.dataset.touched = "1"; $("[data-rm]", tr).onclick = () => { tr.remove(); sum(); }; $("[data-pm]", tr).oninput = sum; sum(); };
    (a && a.parts.length ? a.parts : (a ? [] : [null])).forEach(addRow);
    $("#xAdd", m).onclick = () => addRow(null);
    $("#xFillCh", m).onchange = (e) => { const ch = chapters().find((x) => x.ch === +e.target.value); const rows0 = $$("tr", tb).slice(1); if (ch && !a && rows0.length === 1 && !rows0[0].dataset.touched) rows0[0].remove(); if (ch) ch.objs.forEach((o) => addRow({ label: "ب " + o.code, objective_code: o.code, max_score: 5 })); e.target.value = ""; };
    const avail = () => { const sel = new Set($$("input[name=qo]:checked", m).map((x) => x.value)); const n = S.qs.filter((q) => q.active && sel.has(q.objective_code)).length; $("#qAvail", m).textContent = `— متاح في البنك: ${n} سؤالًا`; };
    wirePicker(m, "qo", avail);
    $("#xS", m).onclick = (e) => busy(e.target, async () => {
      const p = { id: a ? a.id : null, section_id: S.sec.id, component_id: $("#xC", m).value, title: $("#xT", m).value, kind: kSel.value, published: $("#xP", m).checked, counted: $("#xN", m).checked };
      if (p.kind === "manual") {
        p.parts = $$("tr", tb).slice(1).map((tr) => ({ id: tr.dataset.id || null, label: $("[data-pl]", tr).value, objective_code: $("[data-po]", tr).value, max_score: +$("[data-pm]", tr).value }));
        if (p.parts.some((x) => !(x.max_score > 0))) return toast("العلامة القصوى لكل جزء يجب أن تكون أكبر من صفر", "err");
      } else {
        p.max_score = +$("#qM", m).value; p.open_at = fromLocalInput($("#qO", m).value); p.close_at = fromLocalInput($("#qC", m).value);
        p.quiz = { n: +$("#qN", m).value, minutes: +$("#qT", m).value, attempts: +$("#qA", m).value, objectives: $$("input[name=qo]:checked", m).map((x) => x.value) };
      }
      await rpc("t_save_assessment", { p }); m.close(); toast("حُفظ التقويم", "ok"); refresh();
    });
  }
  async function marks(a) {
    const sc = await rpc("t_scores", { p_assessment: a.id }); const st = active();
    const m = modal({ title: "رصد علامات: " + a.title, wide: true, body: `
      <p class="muted small">اكتب علامة كل جزء. الخانة الفارغة تعني لم تُرصد بعد (وتُحسب صفرًا في المجموع ما دام التقويم يُحتسب). تتنقّل بين الخانات بـ Enter.</p>
      <div class="tw" style="max-height:60vh;overflow:auto"><table class="t sticky1"><tr><th>الطالب</th>${a.parts.map((p) => `<th class="c">${esc(p.label)}<br><span class="small muted ltr">${p.objective_code} · /${+p.max_score}</span></th>`).join("")}<th class="c">المجموع /${+a.max_score}</th></tr>
      ${st.map((s) => `<tr data-e="${s.enrollment_id}"><td>${esc(s.full_name)}<br><span class="small muted num">${esc(s.username)}</span></td>${a.parts.map((p) => { const v = sc[s.enrollment_id + ":" + p.id]; return `<td class="c"><input class="mark num" type="number" min="0" max="${+p.max_score}" step="0.25" data-p="${p.id}" data-max="${+p.max_score}" value="${v == null ? "" : +v}" data-orig="${v == null ? "" : +v}"></td>`; }).join("")}<td class="c num" data-tot></td></tr>`).join("")}
      </table></div>`, foot: `<span class="muted small right" id="mChg"></span><button class="btn pri" id="mS">حفظ العلامات</button>` });
    const recalc = () => { let ch = 0; $$("tr[data-e]", m).forEach((tr) => { let t = 0; $$("input", tr).forEach((i) => { const v = i.value === "" ? null : +i.value; i.classList.toggle("bad", v != null && (v < 0 || v > +i.dataset.max)); t += v || 0; if (i.value !== i.dataset.orig) ch++; }); $("[data-tot]", tr).textContent = t; }); $("#mChg", m).textContent = ch ? `${ch} تعديلًا غير محفوظ` : ""; };
    $$("input.mark", m).forEach((i, k, all) => { i.oninput = recalc; i.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); const n = all[k + a.parts.length] || all[k + 1]; if (n) n.focus(); } }; });
    recalc();
    $("#mS", m).onclick = (e) => busy(e.target, async () => {
      if ($$("input.mark.bad", m).length) return toast("في علامات خارج المدى المسموح", "err");
      const rows = []; $$("tr[data-e]", m).forEach((tr) => $$("input", tr).forEach((i) => { if (i.value !== i.dataset.orig) rows.push({ enrollment_id: tr.dataset.e, part_id: i.dataset.p, score: i.value === "" ? null : +i.value }); }));
      if (!rows.length) return m.close();
      await rpc("t_save_scores", { p_rows: rows }); m.close(); toast(`حُفظت ${rows.length} علامة`, "ok"); refresh();
    });
  }

  // ── سجل العلامات ──
  function book() {
    const B = S.book, comps = B.components, st = B.students;
    const byC = comps.map((k) => ({ k, A: B.assessments.filter((a) => a.component_id === k.id) }));
    main.innerHTML = `<div class="card"><div class="row"><h2 class="grow">سجل العلامات — ${esc(S.sec.name)}</h2><button class="btn" id="bCsv">تصدير Excel (CSV)</button><button class="btn" onclick="window.print()">طباعة</button></div>
      <p class="muted small">النسبة لكل تقويم من 100%. نسبة المكوّن = متوسط تقويماته، والمجموع = مجموع (نسبة المكوّن × وزنه). العمود الأخير يبيّن الأوزان التي دخلت الحساب حتى الآن. تظهر هنا التقويمات المخفية عن الطلبة أيضًا.</p>
      ${st.length ? `<div class="tw"><table class="t sticky1"><tr><th rowspan="2">الطالب</th>${byC.map((x) => `<th class="c" colspan="${x.A.length + 1}">${esc(x.k.title)} (${x.k.weight}%)</th>`).join("")}<th class="c" rowspan="2">المجموع</th><th class="c" rowspan="2">من</th></tr>
      <tr>${byC.map((x) => x.A.map((a) => `<th class="c small" title="${esc(a.title)}">${esc(a.title.slice(0, 16))}${a.published ? "" : " *"}</th>`).join("") + `<th class="c small">النسبة</th>`).join("")}</tr>
      ${st.map((s) => `<tr${s.status !== "active" ? ' style="opacity:.5"' : ""}><td>${esc(s.full_name)}<br><span class="small muted num">${esc(s.username)}</span></td>
        ${byC.map((x) => x.A.map((a) => `<td class="c small num">${s.items[a.id] == null ? "—" : s.items[a.id]}</td>`).join("") + `<td class="c"><b class="num">${s.comps[x.k.id] == null ? "—" : s.comps[x.k.id]}</b></td>`).join("")}
        <td class="c"><b class="num">${s.total == null ? "—" : s.total}</b></td><td class="c num small">${s.wsofar || 0}</td></tr>`).join("")}
      </table></div><p class="muted small">* تقويم مخفي عن الطلبة.</p>` : `<div class="empty">لا طلبة بعد.</div>`}</div>`;
    $("#bCsv").onclick = () => {
      const head = ["الرقم الجامعي", "الاسم", ...byC.flatMap((x) => [...x.A.map((a) => a.title + " %"), x.k.title + " (" + x.k.weight + "%)"]), "المجموع", "الأوزان المحتسبة"];
      const rows = st.map((s) => [s.username, s.full_name, ...byC.flatMap((x) => [...x.A.map((a) => s.items[a.id] ?? ""), s.comps[x.k.id] ?? ""]), s.total ?? "", s.wsofar ?? 0]);
      const csv = "﻿" + [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = `علامات ${S.sec.name}.csv`; a.click();
    };
  }

  // ── إتقان الأهداف ──
  function objs() {
    const c = course(), st = active();
    const agg = {}; st.forEach((s) => Object.entries(s.objs || {}).forEach(([k, v]) => { agg[k] = agg[k] || [0, 0, 0]; agg[k][0] += +v[0]; agg[k][1] += +v[1]; agg[k][2]++; }));
    const oc = outcomeMastery(c, Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, [v[0], v[1]]])));
    main.innerHTML = `<div class="grid2">
      <div class="card"><h2>نتاجات المقرر (الخطة الدراسية)</h2><p class="muted small">تُجمَّع من أهداف الفصول التابعة لكل نتاج.</p>
        ${oc.map((o) => `<div class="obj"><span class="code">${o.seq}</span><span class="small">${esc(o.text)}</span>${bar(o.pct)}<span class="num small">${pct(o.pct, 0)}</span></div>`).join("")}</div>
      <div class="card"><h2>ملف طالب</h2><select id="oStu"><option value="">اختر طالبًا…</option>${st.map((s) => `<option value="${s.enrollment_id}">${esc(s.full_name)}</option>`).join("")}</select><div id="oOne" style="margin-top:10px"></div></div>
    </div>
    <div class="card"><h2>أهداف الفصول — متوسط الشعبة</h2><p class="muted small">النسبة = مجموع ما حصّله الطلبة في الأجزاء والأسئلة المربوطة بالهدف ÷ مجموع العلامات القصوى لها.</p>
      ${chapters().map((ch) => `<details class="ch" ${ch.ch === 1 ? "open" : ""}><summary>الفصل ${ch.ch}: ${esc(ch.title)}</summary><div>
        ${ch.objs.map((o) => { const v = agg[o.code]; const p = v && v[1] ? v[0] / v[1] * 100 : null; return `<div class="obj"><span class="code">${o.code}</span><span class="small">${esc(o.text)}${v ? ` <span class="muted">(${v[2]} طالبًا)</span>` : ""}</span>${bar(p)}<span class="num small">${pct(p, 0)}</span></div>`; }).join("")}</div></details>`).join("")}
    </div>`;
    $("#oStu").onchange = (e) => {
      const s = st.find((x) => x.enrollment_id === e.target.value); if (!s) return $("#oOne").innerHTML = "";
      const rows = c.objectives.filter((o) => s.objs[o.code]).map((o) => { const v = s.objs[o.code]; return [o, v[0] / v[1] * 100]; }).sort((x, y) => x[1] - y[1]);
      $("#oOne").innerHTML = `<p><b>المجموع:</b> <span class="num">${s.total ?? "—"}</span> من <span class="num">${s.wsofar || 0}</span></p>` + (rows.length ? rows.map(([o, p]) => `<div class="obj"><span class="code">${o.code}</span><span class="small">${esc(o.text)}</span>${bar(p)}<span class="num small">${pct(p, 0)}</span></div>`).join("") : `<p class="muted">لا بيانات بعد.</p>`);
    };
  }

  // ── بنك الأسئلة ──
  async function bank() {
    const c = course();
    if (!S.qs) { main.innerHTML = `<div class="empty">جارٍ تحميل البنك…</div>`; S.qs = await rpc("t_questions", { p_course: c.id }); }
    const Q = S.qs, cnt = {}; Q.forEach((q) => { if (q.active) cnt[q.objective_code] = (cnt[q.objective_code] || 0) + 1; });
    main.innerHTML = `<div class="card"><div class="row"><h2 class="grow">بنك الأسئلة — ${esc(c.title)}</h2><button class="btn pri" id="bQ">سؤال جديد</button><button class="btn" id="bImp">استيراد</button></div>
      <p class="muted small">${Q.filter((q) => q.active).length} سؤالًا فعّالًا، و${Q.filter((q) => !q.active).length} مؤرشفًا. كل سؤال مربوط بهدف من أهداف الفصول، ومنه تُسحب الاختبارات الإلكترونية.</p>
      <div class="row"><select id="fCh" style="width:auto"><option value="">كل الفصول</option>${chapters().map((ch) => `<option value="${ch.ch}">الفصل ${ch.ch} (${ch.objs.reduce((s, o) => s + (cnt[o.code] || 0), 0)})</option>`).join("")}</select>
        <select id="fOb" style="width:auto"><option value="">كل الأهداف</option>${c.objectives.map((o) => `<option value="${o.code}">${o.code} (${cnt[o.code] || 0})</option>`).join("")}</select>
        <label class="row small"><input type="checkbox" id="fAr" style="width:auto"> إظهار المؤرشف</label></div></div>
      <div id="qList"></div>`;
    const draw = () => {
      const ch = $("#fCh").value, ob = $("#fOb").value, ar = $("#fAr").checked;
      const L = Q.filter((q) => (ar || q.active) && (!ob || q.objective_code === ob) && (!ch || q.objective_code.split("-")[0] === ch));
      $("#qList").innerHTML = L.length ? L.slice(0, 300).map((q) => `<div class="qcard" style="${q.active ? "" : "opacity:.55"}"><div class="row"><span class="pill">${q.objective_code}</span>${q.difficulty ? `<span class="pill gold">${esc(q.difficulty)}</span>` : ""}${q.bloom ? `<span class="pill">${esc(q.bloom)}</span>` : ""}
        <span class="right row" style="gap:.3em"><button class="btn sm" data-qe="${q.id}">تعديل</button><button class="btn sm" data-qa="${q.id}">${q.active ? "أرشفة" : "استرجاع"}</button></span></div>
        <div style="margin-top:6px">${esc(q.stem)}</div><div class="opts">${q.options.map((o, i) => `<div class="opt ${i === q.correct ? "right" : ""}"><span class="l">${"abcdef"[i]})</span><span>${esc(o)}</span></div>`).join("")}</div>
        ${q.explanation ? `<p class="small muted" style="margin:.5em 0 0">التفسير: ${esc(q.explanation)}</p>` : ""}</div>`).join("") + (L.length > 300 ? `<p class="muted">يُعرض أول 300 سؤال؛ استعمل التصفية.</p>` : "")
        : `<div class="card empty">لا أسئلة بهذه التصفية. ${Q.length ? "" : "يُضاف بنك أسئلة الكتاب كاملًا عبر «استيراد»."}</div>`;
      $$("[data-qe]").forEach((b) => b.onclick = () => editQ(Q.find((q) => q.id === b.dataset.qe)));
      $$("[data-qa]").forEach((b) => b.onclick = async () => { const q = Q.find((x) => x.id === b.dataset.qa); await busy(b, () => rpc("t_set_question_active", { p_id: q.id, p_active: !q.active })); q.active = !q.active; S.boot = await rpc("t_bootstrap"); bank(); });
    };
    ["#fCh", "#fOb", "#fAr"].forEach((s) => $(s).onchange = draw); draw();
    $("#bQ").onclick = () => editQ(null);
    $("#bImp").onclick = () => {
      const m = modal({ title: "استيراد أسئلة", wide: true, body: `<p class="muted small">الصق ملف الأسئلة (JSON) كما يُسلَّم مع بنك الكتاب: مصفوفة عناصر بالشكل
        <span class="ltr small">{"objective_code":"6-2","stem":"…","options":["…","…","…","…"],"correct":0,"difficulty":"متوسط","bloom":"تطبيق","explanation":"…"}</span></p>
        <input type="file" id="iF" accept=".json,application/json" style="margin-bottom:8px"><textarea id="iT" dir="ltr" style="min-height:200px"></textarea><p id="iP" class="small"></p>`, foot: `<button class="btn pri" id="iS">استيراد</button>` });
      $("#iF", m).onchange = async (e) => { const f = e.target.files[0]; if (f) { $("#iT", m).value = await f.text(); $("#iT", m).oninput(); } };
      $("#iT", m).oninput = () => { try { const j = JSON.parse($("#iT", m).value); const arr = Array.isArray(j) ? j : j.questions; $("#iP", m).textContent = `${arr.length} سؤالًا جاهزًا للاستيراد.`; } catch (e) { $("#iP", m).textContent = "النص ليس JSON صالحًا بعد."; } };
      $("#iS", m).onclick = (e) => busy(e.target, async () => {
        let arr; try { const j = JSON.parse($("#iT", m).value); arr = Array.isArray(j) ? j : j.questions; } catch (x) { return toast("الملف غير صالح", "err"); }
        let n = 0; for (let i = 0; i < arr.length; i += 200) { const r = await rpc("t_import_questions", { p_course: c.id, p_rows: arr.slice(i, i + 200) }); n += r.n; }
        m.close(); toast(`استُورد ${n} سؤالًا`, "ok"); S.qs = null; S.boot = await rpc("t_bootstrap"); bank();
      });
    };
  }
  function editQ(q) {
    const c = course();
    const m = modal({ title: q ? "تعديل سؤال" : "سؤال جديد", wide: true, body: `
      <label class="f"><span>الهدف</span><select id="qO">${chapters().map((ch) => `<optgroup label="الفصل ${ch.ch}: ${esc(ch.title)}">${ch.objs.map((o) => `<option value="${o.code}" ${q && q.objective_code === o.code ? "selected" : ""}>${o.code} — ${esc(o.text.slice(0, 80))}</option>`).join("")}</optgroup>`).join("")}</select></label>
      <label class="f"><span>نص السؤال</span><textarea id="qS" style="min-height:80px">${esc(q ? q.stem : "")}</textarea></label>
      <div id="qOpts"></div><button class="btn sm" id="qAdd">+ بديل</button>
      <div class="grid2" style="margin-top:10px">
        <label class="f"><span>الصعوبة</span><select id="qD">${["", "سهل", "متوسط", "صعب"].map((d) => `<option ${q && q.difficulty === d ? "selected" : ""}>${d}</option>`).join("")}</select></label>
        <label class="f"><span>مستوى بلوم</span><select id="qB">${["", "تذكّر", "فهم", "تطبيق", "تحليل", "تقويم", "إبداع"].map((d) => `<option ${q && q.bloom === d ? "selected" : ""}>${d}</option>`).join("")}</select></label>
      </div>
      <label class="f"><span>التفسير (يظهر للطالب بعد إغلاق الاختبار)</span><textarea id="qE" style="min-height:60px">${esc(q ? q.explanation || "" : "")}</textarea></label>`, foot: `<button class="btn pri" id="qSv">حفظ</button>` });
    const box = $("#qOpts", m);
    const add = (t, on) => { const d = document.createElement("label"); d.className = "row"; d.style.marginBottom = "6px";
      d.innerHTML = `<input type="radio" name="qc" style="width:auto" ${on ? "checked" : ""} title="الإجابة الصحيحة"><input type="text" data-o value="${esc(t || "")}" class="grow" placeholder="بديل"><button type="button" class="btn sm danger">×</button>`;
      box.appendChild(d); $("button", d).onclick = () => d.remove(); };
    (q ? q.options : ["", "", "", ""]).forEach((o, i) => add(o, q ? i === q.correct : i === 0));
    $("#qAdd", m).onclick = () => add("", false);
    $("#qSv", m).onclick = (e) => busy(e.target, async () => {
      const rows = $$("label.row", box); const opts = rows.map((r) => $("[data-o]", r).value.trim());
      const correct = rows.findIndex((r) => $("input[type=radio]", r).checked);
      if (opts.some((o) => !o)) return toast("لا تترك بديلًا فارغًا", "err"); if (correct < 0) return toast("حدّد الإجابة الصحيحة", "err");
      await rpc("t_save_question", { p_course: c.id, q: { id: q ? q.id : null, objective_code: $("#qO", m).value, stem: $("#qS", m).value, options: opts, correct, difficulty: $("#qD", m).value || null, bloom: $("#qB", m).value || null, explanation: $("#qE", m).value || null } });
      m.close(); toast("حُفظ السؤال", "ok"); S.qs = null; S.boot = await rpc("t_bootstrap"); bank();
    });
  }

  // ── الإعدادات ──
  function settings() {
    const B = S.boot, c = course();
    main.innerHTML = `<div class="grid2">
      <div class="card"><h2>الفصول الدراسية</h2>
        <div class="tw"><table class="t"><tr><th>الفصل</th><th>الحالي</th><th></th></tr>${B.terms.map((t) => `<tr><td>${esc(t.name)}</td><td>${t.is_current ? `<span class="pill ok">الحالي</span>` : ""}</td><td><button class="btn sm" data-term="${t.id}">تعديل</button></td></tr>`).join("")}</table></div>
        <button class="btn" style="margin-top:10px" id="bTerm">فصل دراسي جديد</button></div>
      <div class="card"><h2>الشُّعب</h2>
        <div class="tw"><table class="t"><tr><th>الشعبة</th><th>الفصل</th><th class="c">الطلبة</th><th></th></tr>${B.sections.map((s) => `<tr${s.archived ? ' style="opacity:.55"' : ""}><td>${esc(s.name)}${s.archived ? ` <span class="pill">مؤرشفة</span>` : ""}<br><span class="small muted">${esc(s.schedule || "")}</span></td><td>${esc(term(s.term_id).name || "")}</td><td class="c num">${s.n}</td>
          <td class="row" style="gap:.3em"><button class="btn sm" data-sec="${s.id}">تعديل</button>${s.archived ? `<button class="btn sm" data-unarch="${s.id}">استرجاع</button>` : `<button class="btn sm danger" data-delsec="${s.id}">حذف</button>`}</td></tr>`).join("")}</table></div>
        <button class="btn" style="margin-top:10px" id="bSec">شعبة جديدة</button>
        <p class="muted small">الشعبة التي فيها طلبة أو تقويمات لا تُحذف، بل تُؤرشف فتختفي من القائمة مع بقاء سجلاتها.</p></div>
      <div class="card"><h2>توزيع العلامات</h2><p class="muted small">من الخطة الدراسية للمقرر.</p>
        <div class="tw"><table class="t">${c.components.map((k) => `<tr><td>${esc(k.title)}</td><td class="c num">${k.weight}%</td></tr>`).join("")}<tr><th>المجموع</th><th class="c num">${c.components.reduce((s, k) => s + +k.weight, 0)}%</th></tr></table></div></div>
      <div class="card"><h2>حسابي</h2>
        <label class="f"><span>الاسم</span><input type="text" id="pN" value="${esc(B.me.full_name)}"></label>
        <label class="f"><span>البريد الإلكتروني</span><input type="email" id="pE" dir="ltr" value="${esc(B.me.email || "")}"></label>
        <p class="small muted">اسم الدخول: <b class="ltr">${esc(B.me.username)}</b></p>
        <div class="row"><button class="btn pri" id="bProf">حفظ</button><button class="btn" id="bPw">تغيير كلمة المرور</button></div></div>
    </div>`;
    const termForm = (t) => { const m = modal({ title: t ? "تعديل فصل دراسي" : "فصل دراسي جديد", body: `<label class="f"><span>الاسم</span><input type="text" id="tN" value="${esc(t ? t.name : "")}" placeholder="مثال: ربيع 2027"></label>
      <div class="grid2"><label class="f"><span>يبدأ</span><input type="date" id="tS" value="${t && t.starts || ""}"></label><label class="f"><span>ينتهي</span><input type="date" id="tE" value="${t && t.ends || ""}"></label></div>
      <label class="row"><input type="checkbox" id="tC" style="width:auto" ${t && t.is_current ? "checked" : ""}> الفصل الحالي</label>`, foot: `<button class="btn pri" id="tSv">حفظ</button>` });
      $("#tSv", m).onclick = (e) => busy(e.target, async () => { await rpc("t_save_term", { p: { id: t ? t.id : null, name: $("#tN", m).value, starts: $("#tS", m).value || null, ends: $("#tE", m).value || null, is_current: $("#tC", m).checked } }); m.close(); await boot(S.sec && S.sec.id); }); };
    const secForm = (s) => { const m = modal({ title: s ? "تعديل شعبة" : "شعبة جديدة", body: `<label class="f"><span>اسم الشعبة</span><input type="text" id="sN" value="${esc(s ? s.name : "")}" placeholder="مثال: الشعبة 2"></label>
      <label class="f"><span>الموعد (اختياري)</span><input type="text" id="sD" value="${esc(s ? s.schedule || "" : "")}" placeholder="مثال: الأحد 6–8 مساءً"></label>
      ${s ? "" : `<label class="f"><span>الفصل الدراسي</span><select id="sT">${B.terms.map((t) => `<option value="${t.id}" ${t.is_current ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select></label>`}`, foot: `<button class="btn pri" id="sSv">حفظ</button>` });
      $("#sSv", m).onclick = (e) => busy(e.target, async () => { const r = await rpc("t_save_section", { p: { id: s ? s.id : null, course_id: c.id, term_id: s ? s.term_id : $("#sT", m).value, name: $("#sN", m).value, schedule: $("#sD", m).value } }); m.close(); await boot(s ? S.sec && S.sec.id : r.id); }); };
    $("#bTerm").onclick = () => termForm(null); $$("[data-term]").forEach((b) => b.onclick = () => termForm(B.terms.find((t) => t.id === b.dataset.term)));
    $("#bSec").onclick = () => secForm(null); $$("[data-sec]").forEach((b) => b.onclick = () => secForm(B.sections.find((s) => s.id === b.dataset.sec)));
    $$("[data-unarch]").forEach((b) => b.onclick = async () => { const s = B.sections.find((x) => x.id === b.dataset.unarch); await busy(b, () => rpc("t_save_section", { p: { id: s.id, name: s.name, schedule: s.schedule, archived: false } })); await boot(s.id); });
    $$("[data-delsec]").forEach((b) => b.onclick = async () => { const s = B.sections.find((x) => x.id === b.dataset.delsec); if (!(await confirmBox(`حذف «${s.name}»؟ (إن كان فيها طلبة أو تقويمات ستُؤرشف بدل الحذف)`, "متابعة"))) return;
      const r = await busy(b, () => rpc("t_delete_section", { p_section: s.id })); if (r) toast(r.archived ? "أُرشفت الشعبة" : "حُذفت الشعبة", "ok"); await boot(); });
    $("#bProf").onclick = (e) => busy(e.target, async () => { await rpc("t_save_profile", { p: { full_name: $("#pN").value, email: $("#pE").value } }); toast("حُفظ", "ok"); S.boot = await rpc("t_bootstrap"); });
    $("#bPw").onclick = () => { const m = modal({ title: "تغيير كلمة المرور", body: `<label class="f"><span>الحالية</span><input type="password" id="w0" dir="ltr"></label><label class="f"><span>الجديدة (8 أحرف على الأقل، حروف وأرقام)</span><input type="password" id="w1" dir="ltr"></label><label class="f"><span>تأكيد الجديدة</span><input type="password" id="w2" dir="ltr"></label>`, foot: `<button class="btn pri" id="wS">حفظ</button>` });
      $("#wS", m).onclick = (e) => { if ($("#w1", m).value !== $("#w2", m).value) return toast("غير متطابقتين", "err"); busy(e.target, async () => { await rpc("fgu_change_password", { p_old: $("#w0", m).value, p_new: $("#w1", m).value }); m.close(); toast("تغيّرت كلمة المرور", "ok"); }); }; };
  }

  boot().catch((e) => { main.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; });
})();

// لغة صفحة الطالب: العربية (الأصل) أو الإنجليزية. النصوص الثابتة تُترجم من القاموس، والنصوص المتغيرة بالدالة T(عربي، إنجليزي)
(function () {
  const KEY = "fgu_lang";
  let lang = "ar";
  try { lang = localStorage.getItem(KEY) === "en" ? "en" : "ar"; } catch (e) { }

  // النصوص الثابتة في index.html (النص العربي كما هو بعد حذف الفراغات الطرفية → الإنجليزية)
  const D = {
    "جامعة فلوريدا العالمية": "Florida Global University",
    "الإدارة المالية · ريادة الأعمال": "Financial Management · Entrepreneurship",
    "كيف تعمل": "How it works", "المزايا": "Features", "المقرر": "Course", "للمحاضر": "Lecturer", "تواصل": "Contact",
    "دخول المحاضر": "Lecturer login",
    "كتاب المقرر: الإدارة المالية – تطبيقات في ريادة الأعمال": "Course book: Financial Management – Applications in Entrepreneurship",
    "عشرة فصول · 51 هدفًا من أهداف التعلّم · من الدولار الأول إلى الخطة المالية لمشروعك": "Ten chapters · 51 learning objectives · from your first dollar to your venture's financial plan",
    "تعرّف إلى المقرر": "Explore the course",
    "التعليم المهني والمستمر · برنامج ريادة الأعمال": "Professional & Continuing Education · Entrepreneurship Program",
    "منصة مقرر": "Course platform:", "الإدارة المالية": "Financial Management", "تطبيقات في ريادة الأعمال": "Applications in Entrepreneurship",
    "علاماتك في كل مكوّن من مكوّنات المقرر لحظة رصدها، واختبارات قصيرة إلكترونية تُعاد وتُحتسب أفضل محاولة فيها، وخريطة دقيقة لإتقانك لكل هدف من أهداف الفصول.":
      "Your marks in every course component as soon as they are entered, online quizzes you can retake with your best attempt counted, and a precise map of your mastery of every chapter objective.",
    "قياس على مستوى الهدف": "Objective-level measurement", "إعادة الاختبار القصير": "Quiz retakes", "حساب محمي بكلمة مرور": "Password-protected account",
    "طالب": "Student", "محاضر": "Lecturer",
    "دخول الطالب": "Student login", "بالرقم الجامعي وكلمة المرور": "With your university ID and password",
    "الرقم الجامعي": "University ID", "كلمة المرور": "Password", "تذكّرني على هذا الجهاز": "Remember me on this device",
    "دخول إلى صفحتي": "Go to my page", "نسيت كلمة المرور؟": "Forgot your password?",
    "اختر كلمة مرورك": "Choose your password", "أول دخول، أو أُعيدت كلمة مرورك إلى رقمك الجامعي": "First login, or your password was reset to your university ID",
    "8 أحرف على الأقل، فيها حروف إنجليزية وأرقام، وليست رقمك الجامعي.": "At least 8 characters, with English letters and digits, and not your university ID.",
    "كلمة المرور الحالية (رقمك الجامعي)": "Current password (your university ID)",
    "كلمة المرور الجديدة": "New password", "أعد كتابتها": "Type it again", "حفظ ومتابعة": "Save and continue",
    "أهلًا": "Welcome", "نجهّز صفحتك الآن…": "Preparing your page…",
    "ثلاث خطوات": "Three steps", "من الدخول إلى معرفة مستواك": "From login to knowing your level",
    "تدخل أول مرة برقمك الجامعي اسمًا وكلمةَ مرور، ثم تختار كلمتك الخاصة.": "For your first login, use your university ID as both username and password, then choose your own password.",
    "ادخل برقمك الجامعي": "Log in with your university ID",
    "وكلمة المرور التي اخترتها. نسيتها؟ يعيدها المحاضر إلى رقمك الجامعي.": "and the password you chose. Forgot it? Your lecturer resets it to your university ID.",
    "حلّ اختباراتك القصيرة": "Take your quizzes",
    "أسئلة مختلفة في كل محاولة، وتُحفظ إجاباتك تلقائيًّا، وتُحتسب أفضل محاولة لك.": "Different questions in every attempt, your answers are saved automatically, and your best attempt counts.",
    "اعرف مستواك": "Know your level",
    "علامتك في كل مكوّن، ومجموعك حتى الآن، ومستواك في كل هدف من أهداف الفصول.": "Your mark in every component, your total so far, and your level in every chapter objective.",
    "ما الذي يميّز المنصة": "What makes the platform different", "كل علامة مبنية على أهداف التعلّم": "Every mark is built on learning objectives",
    "كل سؤال مرتبط بهدف": "Every question is linked to an objective",
    "النتيجة لا تقف عند رقم؛ بل تُفصَّل على أهداف فصول الكتاب واحدًا واحدًا.": "Your result is not just a number; it is broken down by each chapter objective of the book.",
    "أسئلة مختلفة في كل محاولة": "Different questions every attempt",
    "سحب عشوائي من بنك الأسئلة وخلط للخيارات، فلا تتشابه محاولتان.": "Random draws from the question bank with shuffled options, so no two attempts are alike.",
    "توزيع العلامات المعتمد": "The official grade distribution",
    "النهائي 30٪، ومنتصف الفصل 25٪، والمشروع الختامي 20٪، والاختبارات القصيرة 15٪، والمشاركة 10٪.": "Final 30%, midterm 25%, final project 20%, quizzes 15%, participation 10%.",
    "ابدأ بالأضعف": "Start with your weakest",
    "خريطة أهدافك تُظهر أين أتقنت وأين تحتاج أن تراجع قبل الاختبار القادم.": "Your objectives map shows what you have mastered and what to review before the next test.",
    "مواعيد واضحة": "Clear deadlines",
    "كل اختبار قصير له موعد فتح وإغلاق ومدة، وتظهر الإجابات الصحيحة بعد إغلاقه.": "Every quiz has an opening time, a closing time and a duration; correct answers appear after it closes.",
    "مظهر يناسبك": "A look that suits you", "سمات هادئة مريحة للعين، منها الليلي للمذاكرة المسائية.": "Calm themes that are easy on the eyes, including a night theme for evening study.",
    "الإدارة المالية – تطبيقات في ريادة الأعمال": "Financial Management – Applications in Entrepreneurship",
    "يبدأ كل موضوع بالمبادئ التي تستعملها كل منشأة، ثم يطبّقها على المشاريع الناشئة، وتنهي المقرر بخطة مالية لفكرتك الريادية.":
      "Each topic starts with the principles every business uses, then applies them to startups; you finish the course with a financial plan for your own venture idea.",
    "لوحة تحكّم كاملة للمقرر": "A complete course dashboard",
    "الشُّعب والفصول الدراسية، والطلبة بالرقم الجامعي، ورصد العلامات مقسّمة على الأهداف، والاختبارات القصيرة، وسجل علامات موزون جاهز للتصدير.":
      "Sections and terms, students by university ID, marks entered by objective, quizzes, and a weighted gradebook ready to export.",
    "إضافة الطلبة لصقًا من Excel": "Add students by pasting from Excel", "إعادة كلمة المرور لمن نسي": "Password reset for students who forget",
    "إتقان كل هدف ونتاج": "Mastery of every objective and outcome", "طلبة الفصول السابقة بحساباتهم": "Returning students keep their accounts",
    "التعليم المهني والمستمر": "Professional & Continuing Education",
    "منصة مقرر الإدارة المالية – تطبيقات في ريادة الأعمال، برنامج ريادة الأعمال. المحاضر: سهم هلالات العجارمة.":
      "Course platform for Financial Management – Applications in Entrepreneurship, Entrepreneurship Program. Lecturer: Sahm Hlalat Al-Ajarmeh.",
    "قناة الواتساب": "WhatsApp channel", "الدخول": "Login", "الطالب": "Student", "المحاضر": "Lecturer",
    "جامعة فلوريدا العالمية — منصة مقرر الإدارة المالية · الإصدار 1.4": "Florida Global University — Financial Management course platform · Version 1.4",
    "صفحة الطالب": "Student page",
    "السابق": "Previous", "علّم للمراجعة": "Flag for review", "التالي": "Next", "خريطة الأسئلة": "Question map",
    "مُجاب ·": "answered ·", "معلَّم": "flagged", "تسليم الإجابات": "Submit answers", "النتيجة": "Result", "العودة إلى صفحتي": "Back to my page",
    // سمات وعناوين
    "أقسام الموقع": "Site sections", "المظهر": "Theme", "تغيير المظهر": "Change theme", "مثال: 2620011016": "e.g. 2620011016",
    "إظهار كلمة المرور": "Show password", "تحديث": "Refresh", "خروج": "Log out", "تسجيل الخروج": "Log out",
    "منصة مقرر الإدارة المالية — جامعة فلوريدا العالمية": "Financial Management Course Platform — Florida Global University",
  };
  const ATTRS = ["placeholder", "title", "aria-label"];
  const orig = new WeakMap();   // العقدة/العنصر → النص العربي الأصلي
  function walk(root, fn) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) fn(n);
  }
  function applyStatic(root) {
    root = root || document.body;
    walk(root, (n) => {
      if (n.parentElement && n.parentElement.closest("#dash,#xCard,#xNav,#rBody,#sheet,script,style")) return;
      if (!orig.has(n)) { const t = n.nodeValue.trim(); if (!t || !D[t]) return; orig.set(n, n.nodeValue); }
      const a = orig.get(n), t = a.trim();
      n.nodeValue = lang === "en" ? a.replace(t, D[t]) : a;
    });
    root.querySelectorAll("[placeholder],[title],[aria-label]").forEach((el) => {
      let o = orig.get(el); if (!o) { o = {}; ATTRS.forEach((k) => { if (el.hasAttribute(k)) o[k] = el.getAttribute(k); }); orig.set(el, o); }
      ATTRS.forEach((k) => { if (o[k] != null) el.setAttribute(k, lang === "en" && D[o[k].trim()] ? D[o[k].trim()] : o[k]); });
    });
    if (!orig.has(document)) orig.set(document, document.title);
    const dt = orig.get(document); document.title = lang === "en" && D[dt] ? D[dt] : dt;
  }
  function setDir() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
    document.querySelectorAll("[data-lang-toggle]").forEach((b) => { b.textContent = lang === "en" ? "ع" : "EN"; b.title = lang === "en" ? "العربية" : "English"; b.setAttribute("aria-label", b.title); });
  }
  // رسائل الخادم → الإنجليزية
  const ERR = {
    "اختر كلمة مرور مختلفة عن الحالية": "Choose a password different from your current one",
    "استنفدت عدد المحاولات المسموح": "You have used all allowed attempts",
    "اسم المستخدم أو كلمة المرور غير صحيحة": "Incorrect username or password",
    "الاختبار غير متاح": "This quiz is not available",
    "الحساب موقوف. راجع المحاضر": "This account is suspended. Please contact your lecturer",
    "المحاولة غير متاحة": "This attempt is not available", "المحاولة غير موجودة": "Attempt not found",
    "انتهت الجلسة، سجّل الدخول من جديد": "Your session has expired. Please log in again",
    "انتهى موعد الاختبار": "This quiz has closed", "سُلِّمت هذه المحاولة من قبل": "This attempt was already submitted",
    "غير مسموح": "Not allowed", "كلمة المرور الحالية غير صحيحة": "Your current password is incorrect",
    "كلمة المرور يجب أن تكون 8 أحرف على الأقل، وتحوي حروفًا إنجليزية وأرقامًا": "Your password must be at least 8 characters and contain English letters and digits",
    "لا تجعل كلمة المرور رقمك الجامعي؛ اختر كلمة خاصة بك": "Don't use your university ID as your password; choose your own",
    "لست مسجلًا في هذه الشعبة": "You are not enrolled in this section", "لم يبدأ موعد الاختبار بعد": "This quiz has not opened yet",
    "محاولات كثيرة خاطئة. انتظر 15 دقيقة ثم حاول مجددًا": "Too many failed attempts. Wait 15 minutes and try again",
    "يجب تغيير كلمة المرور أولًا": "You must change your password first",
    "تعذّر الاتصال بالإنترنت. تحقّق من الشبكة وحاول مجددًا.": "Could not connect to the internet. Check your connection and try again.",
    "حدث خطأ غير متوقع": "An unexpected error occurred",
    "هذا الواجب غير متاح لك": "This assignment is not available to you",
    "حجم الملف يجب ألا يتجاوز 4 ميغابايت": "The file must not exceed 4 MB", "اسم الملف فارغ": "The file name is empty",
    "هذا الواجب لا يقبل الملفات": "This assignment does not accept files", "نوع الملف غير مسموح في هذا الواجب": "This file type is not allowed in this assignment",
    "لا يمكن تعديل التسليم الآن": "Your submission cannot be changed now", "وصلت إلى الحد الأقصى لعدد الملفات": "You have reached the maximum number of files",
    "الملف غير متاح للرفع": "The file is not available for upload", "الملف غير متاح": "The file is not available", "الملف فارغ": "The file is empty",
    "الملف غير موجود": "File not found", "أُرشف هذا الملف وحُذف من المنصة": "This file was archived and removed from the platform",
    "النص طويل جدًا": "The text is too long", "لا يمكن التسليم الآن": "Submission is not possible now",
    "يجب الإقرار بأن العمل من إنجازك قبل التسليم": "You must confirm the work is your own before submitting",
    "لا يوجد ما يُسلَّم: اكتب إجابتك أو أرفق ملفًا": "Nothing to submit: write your answer or attach a file",
    "الواجب غير موجود": "Assignment not found", "تعذّر تحميل مكتبة الضغط؛ تحقق من الاتصال": "Could not load the compression library; check your connection",
  };
  const T = (ar, en) => (lang === "en" ? en : ar);
  // البيانات القادمة من قاعدة البيانات: الحقل الإنجليزي إن وُجد
  const pick = (o, k) => (lang === "en" && o && o[k + "_en"]) ? o[k + "_en"] : (o ? o[k] : "");
  // مكوّنات توزيع العلامات (بمفاتيحها الثابتة في قاعدة البيانات)
  const COMP = { final: "Final exam", midterm: "Midterm exam", project_plan: "Final project: written plan", project_talk: "Final project: presentation", quizzes: "Online quizzes", tasks: "Participation & weekly tasks" };
  const comp = (k) => (lang === "en" && COMP[k.key] ? COMP[k.key] : k.title);
  // أسماء الشعب والفصول الدراسية الشائعة
  const name = (s) => lang !== "en" || !s ? s : String(s).replace(/^الشعبة\s*/, "Section ").replace(/^خريف/, "Fall").replace(/^ربيع/, "Spring").replace(/^صيف/, "Summer");
  function setLang(l) {
    lang = l === "en" ? "en" : "ar"; try { localStorage.setItem(KEY, lang); } catch (e) { }
    setDir(); applyStatic(); document.dispatchEvent(new CustomEvent("langchange"));
  }
  window.I18N = { get lang() { return lang; }, T, pick, comp, name, err: (m) => (lang === "en" && ERR[m] ? ERR[m] : m), setLang, applyStatic, toggle: () => setLang(lang === "en" ? "ar" : "en") };
  setDir(); applyStatic();
  document.addEventListener("click", (e) => { if (e.target.closest("[data-lang-toggle]")) { e.preventDefault(); window.I18N.toggle(); } });
})();

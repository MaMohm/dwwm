# Plateforme Quiz DWWM — Soutenance Interactive

منصة تدريبية تفاعلية لتحضير امتحان DWWM (Diplôme de Compétence en Travail sur Ordinateur) — وثيقة معمارية باللغتين الفرنسية والعربية.

## 📋 الميزات

- **330 سؤال** موزعة على 11 فئة DWWM
- **نظام تتبع الإتقان** — 3 مستويات (متقن / بحاجة لمراجعة / صعب)
- **وضع الدراسة** — مرن مع مرشحات وترجمة عربية
- **وضع الامتحان** — محاكاة الشروط الحقيقية مع الأسئلة المختلطة
- **وضع المحاكاة** — اختبر نفسك مع تقرير شامل وتصدير PDF
- **الترجمة الفورية** — اضغط على أيقونة Globe لترجمة الأسئلة والإجابات للعربية
- **RTL Support** — واجهة كاملة تدعم الكتابة من اليمين لليسار
- **حفظ التقدم** — localStorage لحفظ جميع البيانات محليًا

## 🚀 البدء السريع

### المتطلبات
- Node.js 18+ و pnpm

### التثبيت

```bash
# استنساخ المستودع
git clone <repo-url>
cd ai-super-platform

# تثبيت الحزم
pnpm install

# تشغيل التطبيق في بيئة التطوير
pnpm --filter @workspace/quiz-dwwm run dev
```

الموقع سيكون متاحًا على: `http://localhost:3000/quiz/`

### البناء للإنتاج

```bash
pnpm --filter @workspace/quiz-dwwm run build
```

## 📁 هيكل المشروع

```
artifacts/quiz-dwwm/
├── src/
│   ├── App.tsx              # التطبيق الرئيسي (كل المنطق)
│   ├── data/
│   │   └── questions.ts     # 330 سؤال بجميع الفئات
│   ├── components/          # مكونات UI من shadcn/ui
│   └── styles/              # Tailwind CSS
├── public/                  # الملفات الثابتة
├── dist/public/            # مجلد البناء (بعد pnpm run build)
├── package.json            # الحزم المطلوبة
├── vite.config.ts          # إعدادات Vite
└── tsconfig.json           # إعدادات TypeScript
```

## 🎯 أوضاع التشغيل

### وضع الدراسة (Study Mode)
- اختر فئة أو جميع الفئات
- قم بالدراسة بحرية دون ضغط زمني
- ضع علامات على الأسئلة (متقن / بحاجة لمراجعة / صعب)
- لوحة تقدم توضح النسبة المئوية لإتقان كل فئة

### وضع الامتحان (Exam Mode)
- 10 أسئلة عشوائية من جميع الفئات
- لا يمكن الرجوع للأسئلة السابقة
- عرض الإجابة الصحيحة فقط بعد الإجابة

### وضع المحاكاة (Simulation Mode)
- اختر عدد الأسئلة (3 أو 4 أو 5 لكل فئة)
- اختر المدة الزمنية (15 أو 20 أو 30 دقيقة)
- Timer عام مع تنبيهات ألوان (أخضر → أصفر → أحمر)
- تقرير شامل بالنتائج
- **تصدير PDF** للتقرير

## 🌍 الترجمة للعربية

أيقونة **Globe** في الأسئلة والإجابات تترجم النص فورًا:
- المصدر: الفرنسية
- الهدف: العربية
- API: MyMemory (مجاني، بدون مفتاح)
- النص يعرض RTL (من اليمين لليسار)

## 💾 حفظ البيانات

جميع البيانات تُحفظ تلقائيًا في `localStorage`:
- حالة الإتقان (mastered/review/difficile)
- آخر فئة تم اختيارها
- نتائج المحاكاات السابقة

**ملاحظة:** البيانات محلية فقط. لا تُمسح إلا بحذف بيانات المتصفح.

## 📊 الأسئلة والفئات

**11 فئة رئيسية:**
1. Composants Matériels
2. Systèmes d'Exploitation
3. Logiciels et Licences
4. Organisation des Données
5. Sécurité Informatique
6. Réseaux et Télécommunications
7. Communication Électronique
8. Documents Bureautiques
9. Éléments Graphiques
10. Environnement de Travail
11. Interactivité

كل فئة تحتوي على 30 سؤال متنوع (سهل / وسط / صعب).

## 🔧 المتغيرات البيئية

لا توجد متغيرات بيئة مطلوبة للتطوير المحلي.

للنشر على Replit Deploy:
```
PORT=25902
BASE_PATH=/quiz/
```

## 📦 الحزم الرئيسية

- **React 18** — واجهة المستخدم
- **Vite** — بناء سريع
- **TypeScript** — أمان النوع
- **Tailwind CSS** — التصميم
- **shadcn/ui** — مكونات معاد استخدامها
- **Framer Motion** — الحركات السلسة
- **google-translate-api-x** — ترجمة فورية
- **Recharts** — الرسوم البيانية
- **jsPDF + html2pdf** — تصدير PDF

## 🚀 النشر

### على Replit Deploy
```bash
# سيتم البناء والنشر تلقائيًا
# الرابط: https://[project-name].replit.app/quiz/
```

### على Vercel أو Netlify
1. ادفع الكود إلى GitHub
2. اربط المستودع مع Vercel/Netlify
3. اختر التطبيق كـ "build command": `pnpm --filter @workspace/quiz-dwwm run build`
4. اختر "output dir": `artifacts/quiz-dwwm/dist/public`

## 📝 الترخيص

مشروع تعليمي مفتوح المصدر.

## 👨‍💻 التطوير

### إضافة أسئلة جديدة
عدّل `src/data/questions.ts` وأضف إلى array `allQuestions`:

```typescript
{
  id: "new-001",
  category: "Composants Matériels",
  difficulty: "moyen",
  question: "السؤال هنا؟",
  correct: "الإجابة الصحيحة",
  options: [
    "الخيار الثاني",
    "الخيار الثالث",
    "الخيار الرابع"
  ]
}
```

### تحسين الأداء
- الملف الرئيسي `App.tsx` يحتوي على كل المنطق (~1700 سطر)
- يمكن تقسيم المكونات المستقلة إلى ملفات منفصلة

## 🐛 استكشاف الأخطاء

### المتصفح لا يعرض التطبيق
- تأكد من أن الخادم يعمل: `pnpm --filter @workspace/quiz-dwwm run dev`
- امسح ذاكرة التخزين المؤقتة: `Ctrl+Shift+Delete`

### الترجمة لا تعمل
- تحقق من اتصالك بالإنترنت
- MyMemory API قد تكون بطيئة في بعض الأحيان

### البيانات لا تُحفظ
- تأكد من عدم تفعيل "Private Browsing"
- تحقق من سعة localStorage في إعدادات المتصفح

## 📞 الدعم

لأي أسئلة أو مشاكل، تحقق من:
- الكود في `App.tsx` — معلقات واضحة
- `src/data/questions.ts` — هيكل البيانات
- ملف `SETUP.md` — التثبيت التفصيلي

# 🛠️ دليل الإعداد والنشر

## الخطوة 1: استنساخ المستودع من GitHub

### من نافذة Terminal (الكمبيوتر):

```bash
# انتقل إلى المجلد الذي تريد حفظ المشروع فيه
cd Desktop  # أو أي مجلد آخر

# انسخ المستودع
git clone https://github.com/[your-username]/ai-super-platform.git

# ادخل المجلد
cd ai-super-platform
```

## الخطوة 2: تثبيت الحزم

```bash
# تثبيت pnpm (إذا لم تكن مثبتة)
npm install -g pnpm

# تثبيت جميع الحزم
pnpm install
```

⏳ هذا قد يستغرق 5-10 دقائق.

## الخطوة 3: تشغيل التطبيق محليًا

```bash
# شغّل التطبيق في بيئة التطوير
pnpm --filter @workspace/quiz-dwwm run dev
```

ستظهر رسالة مثل:
```
  ➜  Local:   http://localhost:25902/quiz/
```

**افتح المتصفح** على: `http://localhost:25902/quiz/`

## الخطوة 4: البناء للإنتاج

عندما تكون جاهزًا للنشر:

```bash
# بناء التطبيق (سينشئ مجلد dist/public/)
pnpm --filter @workspace/quiz-dwwm run build
```

✅ سيظهر:
```
dist/public/index.html                   0.78 kB
dist/public/assets/index-xxxxx.css     110.71 kB
dist/public/assets/index-xxxxx.js      597.56 kB
```

## الخطوة 5: النشر على GitHub

### أولًا: أنشئ مستودعًا على GitHub

1. اذهب إلى [github.com](https://github.com)
2. اضغط **"New"** لإنشاء مستودع جديد
3. سمّه: `quiz-dwwm` أو `ai-super-platform`
4. اختر **"Public"** (اختياري)
5. اضغط **"Create repository"**

### ثانيًا: ادفع الكود

من Terminal (في المجلد):

```bash
# أضف المستودع البعيد
git remote add origin https://github.com/[your-username]/[repo-name].git

# اختبر الاتصال
git remote -v

# أضف جميع الملفات
git add .

# أنشئ commit
git commit -m "Initial commit: Quiz DWWM with translation feature"

# ادفع إلى GitHub
git push -u origin main
```

✅ الكود الآن على GitHub!

## الخطوة 6: النشر على Vercel (مجاني)

### الطريقة الأسهل:

1. اذهب إلى [vercel.com](https://vercel.com)
2. اضغط **"Sign Up"** واختر GitHub
3. اضغط **"Import Project"**
4. اختر المستودع `quiz-dwwm`
5. في **Framework**: اختر **"Vite"**
6. في **Build Command**: أدخل:
   ```
   pnpm --filter @workspace/quiz-dwwm run build
   ```
7. في **Output Directory**: أدخل:
   ```
   artifacts/quiz-dwwm/dist/public
   ```
8. أضف متغيرات البيئة:
   ```
   PORT = 3000
   BASE_PATH = /
   ```
9. اضغط **"Deploy"**

⏳ انتظر 1-2 دقيقة...

✅ **الرابط النهائي:**
```
https://quiz-dwwm.vercel.app/
```

## الخطوة 7: النشر على Netlify (بديل مجاني)

### الطريقة الأسهل:

1. اذهب إلى [netlify.com](https://netlify.com)
2. اضغط **"Add new site"** → **"Import an existing project"**
3. اختر GitHub وسجّل دخول
4. اختر المستودع
5. في **Build command**:
   ```
   pnpm --filter @workspace/quiz-dwwm run build
   ```
6. في **Publish directory**:
   ```
   artifacts/quiz-dwwm/dist/public
   ```
7. اضغط **"Deploy"**

✅ **الرابط النهائي:**
```
https://[your-site-name].netlify.app/
```

## ملف .env (إذا احتجت)

يمكن إنشاء ملف `.env` لكن ليس مطلوبًا للتطبيق الحالي:

```bash
# artifacts/quiz-dwwm/.env (اختياري)
VITE_API_URL=https://api.example.com
```

## ✅ قائمة التحقق

- [ ] git مثبت على الكمبيوتر (`git --version`)
- [ ] Node.js 18+ مثبت (`node --version`)
- [ ] pnpm مثبت (`pnpm --version`)
- [ ] استنسخت المستودع بنجاح
- [ ] `pnpm install` انتهت بنجاح
- [ ] `pnpm --filter @workspace/quiz-dwwm run dev` يعمل محليًا
- [ ] `pnpm --filter @workspace/quiz-dwwm run build` ينجح
- [ ] دفعت إلى GitHub
- [ ] نشرت على Vercel أو Netlify

## 🚨 استكشاف الأخطاء الشائعة

### خطأ: `git command not found`
**الحل:** ثبّت Git من [git-scm.com](https://git-scm.com)

### خطأ: `pnpm: command not found`
**الحل:** 
```bash
npm install -g pnpm
```

### خطأ: `EACCES: permission denied`
**الحل:** استخدم sudo (حذر):
```bash
sudo pnpm install
```

### خطأ في البناء: `PORT environment variable`
**الحل:** تأكد من إضافة:
```
PORT = 3000
BASE_PATH = /quiz/
```
في متغيرات البيئة Vercel/Netlify

### Vercel يظهر "404 Not Found"
**الحل:** تحقق من:
- Build command صحيح
- Output directory صحيح: `artifacts/quiz-dwwm/dist/public`

## 📞 نصائح

- **حفظ التقدم محليًا:** البيانات تُحفظ في localStorage المتصفح (محلي فقط)
- **النسخ الاحتياطية:** دائمًا اعمل commit قبل تغييرات كبيرة
- **التحديثات:** بعد كل تغيير:
  ```bash
  git add .
  git commit -m "وصف التغيير"
  git push
  ```

## 🎉 تم!

التطبيق الآن:
- ✅ مثبت محليًا على جهازك
- ✅ على GitHub للحفاظ على النسخ الاحتياطية
- ✅ منشور على الويب (Vercel/Netlify)

استمتع بالتطبيق! 🚀

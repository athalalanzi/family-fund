# صندوق العائلة — دليل التشغيل

## خطوات الإعداد

### 1. إنشاء قاعدة البيانات في Supabase
1. سجّل دخولك على [supabase.com](https://supabase.com)
2. اذهب إلى مشروعك ← **SQL Editor**
3. انسخ محتوى ملف `supabase-schema.sql` والصقه وشغّله

### 2. إعداد متغيرات البيئة
1. انسخ ملف `.env.local.example` وسمّيه `.env.local`
2. من Supabase: **Settings** ← **API**
3. انسخ **Project URL** في `NEXT_PUBLIC_SUPABASE_URL`
4. انسخ **anon public key** في `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. إنشاء حساب المستخدم
1. في Supabase: **Authentication** ← **Users** ← **Add user**
2. أدخل إيميل وكلمة مرور للمستخدم

### 4. تشغيل المشروع
```bash
npm install
npm run dev
```

### 5. البناء للنشر
```bash
npm run build
```

---

## ملاحظة للنشر على cPanel
بعد `npm run build`، ارفع محتويات مجلد `.next` مع ملف `.env.local` على الاستضافة.
تأكد أن cPanel عندك يدعم **Node.js**.

-- ======================================
-- صندوق العائلة — Supabase Schema
-- شغّل هذا الملف في Supabase SQL Editor
-- ======================================

-- جدول رؤساء الأسر
CREATE TABLE IF NOT EXISTS family_heads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الأعضاء
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'اشتراك شهري',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  required NUMERIC NOT NULL DEFAULT 0,
  paid NUMERIC NOT NULL DEFAULT 0,
  remaining NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid','partial','unpaid')),
  head_id UUID REFERENCES family_heads(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الدفعات (إيرادات ومصروفات)
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_name TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول القروض
CREATE TABLE IF NOT EXISTS loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  "remainingAmount" NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  "dueDate" DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paid','overdue')),
  installments INTEGER NOT NULL DEFAULT 1,
  "paidInstallments" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول المصروفات
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================
-- Row Level Security (RLS)
-- ======================================

ALTER TABLE family_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- سماح للمستخدمين المسجلين فقط بالوصول
CREATE POLICY "authenticated users only" ON family_heads FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated users only" ON members FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated users only" ON payments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated users only" ON loans FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated users only" ON expenses FOR ALL USING (auth.role() = 'authenticated');

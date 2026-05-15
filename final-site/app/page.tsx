"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Dashboard } from "@/components/dashboard";
import { LoansPage } from "@/components/loans-page";
import { PaymentsPage } from "@/components/payments-page";
import { FamilyPage } from "@/components/family-page";
import { ExpensesPage } from "@/components/expenses-page";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const pageConfig: Record<string, { title: string; subtitle: string }> = {
  "الرئيسية": { title: "لوحة التحكم", subtitle: "مرحباً بك في نظام صندوق العائلة" },
  "القروض": { title: "إدارة القروض", subtitle: "متابعة وإدارة قروض أعضاء العائلة" },
  "الدفعات": { title: "سجل الدفعات", subtitle: "جميع الإيرادات والمصروفات" },
  "بيان العائلة": { title: "بيان العائلة", subtitle: "إدارة أعضاء العائلة" },
  "المصروفات": { title: "المصروفات", subtitle: "تتبع وتصنيف المصروفات" },
};

export default function Home() {
  const [activePage, setActivePage] = useState("الرئيسية");
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) router.push("/login");
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) router.push("/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;
  if (!session) return null;

  const renderPage = () => {
    switch (activePage) {
      case "القروض":
        return <LoansPage />;
      case "الدفعات":
        return <PaymentsPage />;
      case "بيان العائلة":
        return <FamilyPage />;
      case "المصروفات":
        return <ExpensesPage />;
      default:
        return <Dashboard />;
    }
  };

  const currentConfig = pageConfig[activePage] || pageConfig["الرئيسية"];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeItem={activePage} onNavigate={setActivePage} />

      <main className="md:mr-64 min-h-screen p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground text-right">{currentConfig.title}</h1>
          <p className="text-muted-foreground mt-1 text-right">{currentConfig.subtitle}</p>
        </div>
        
        {renderPage()}
      </main>
    </div>
  );
}

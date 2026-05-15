"use client";

import { useState, useEffect } from "react";
import {
  Home,
  CreditCard,
  FileText,
  Users,
  Clock,
  Menu,
  X,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const menuItems = [
  { icon: Home, label: "الرئيسية" },
  { icon: CreditCard, label: "القروض" },
  { icon: FileText, label: "الدفعات" },
  { icon: Users, label: "بيان العائلة" },
  { icon: Clock, label: "المصروفات" },
];

interface SidebarProps {
  activeItem: string;
  onNavigate: (item: string) => void;
}

export function Sidebar({ activeItem, onNavigate }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchOverdue = async () => {
      const { count } = await supabase
        .from("loans")
        .select("*", { count: 'exact', head: true })
        .eq("status", "overdue");
      setOverdueCount(count || 0);
    };

    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    fetchOverdue();
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 right-4 z-50 p-2 bg-sidebar text-sidebar-foreground rounded-lg md:hidden"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 h-full w-64 bg-sidebar text-sidebar-foreground z-50 transition-transform duration-300 flex flex-col",
          "md:translate-x-0",
          mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 left-4 p-1 md:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="p-6 flex flex-col items-center gap-3">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-white p-1">
            <img
              src="/logo.png"
              alt="صندوق عائلة مرفوع جهيم العنزي"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-center">
            <h1 className="font-bold text-lg">صندوق عائلة</h1>
            <p className="text-sm text-sidebar-foreground/80">مرفوع جهيم العنزي</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-4 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.label;
            const isLoans = item.label === "القروض";

            return (
              <button
                key={item.label}
                onClick={() => {
                  onNavigate(item.label);
                  setMobileOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors justify-end relative",
                  isActive
                    ? "bg-white text-primary"
                    : "hover:bg-sidebar-accent"
                )}
              >
                {isLoans && overdueCount > 0 && (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {overdueCount}
                  </span>
                )}
                <span className="font-medium">{item.label}</span>
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-sidebar-accent">
          <div className="flex items-center gap-3 justify-end mb-4">
            <div className="text-right">
              <p className="text-sm font-bold truncate max-w-[120px]">
                {user?.email?.split('@')[0] || "مستخدم"}
              </p>
              <p className="text-[10px] opacity-70 truncate max-w-[120px]">{user?.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
              <UserIcon className="w-6 h-6" />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors justify-end"
          >
            <span className="font-medium">تسجيل الخروج</span>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
}

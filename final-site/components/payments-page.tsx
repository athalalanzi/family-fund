"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Search,
  Calendar,
  User,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Payment {
  id: string;
  member_name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  notes: string;
}

const categories = {
  income: ["اشتراك شهري", "سداد قرض", "تبرع", "أخرى"],
  expense: ["مساعدة", "قرض", "مصاريف إدارية", "أخرى"],
};

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [newPayment, setNewPayment] = useState({
    member_name: "",
    amount: "",
    type: "income" as "income" | "expense",
    category: "",
    notes: "",
  });

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error("Error fetching payments:", error.message);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = 
      (payment.member_name?.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === "all" || payment.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleExport = () => {
    if (filteredPayments.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const exportData = filteredPayments.map(p => ({
      "الاسم": p.member_name,
      "المبلغ": p.amount,
      "النوع": p.type === "income" ? "إيراد" : "مصروف",
      "التصنيف": p.category,
      "التاريخ": p.date,
      "ملاحظات": p.notes
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payments");
    XLSX.writeFile(wb, `payments_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("تم تصدير البيانات بنجاح");
  };

  const handleAddPayment = async () => {
    if (!newPayment.member_name || !newPayment.amount || !newPayment.category) {
      toast.error("يرجى إكمال جميع الحقول");
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("payments")
        .insert([{
          member_name: newPayment.member_name,
          amount: parseFloat(newPayment.amount),
          type: newPayment.type,
          category: newPayment.category,
          date: new Date().toISOString().split("T")[0],
          notes: newPayment.notes,
        }])
        .select();

      if (error) throw error;
      
      setPayments([data[0], ...payments]);
      setShowAddModal(false);
      setNewPayment({ member_name: "", amount: "", type: "income", category: "", notes: "" });
      toast.success("تم إضافة الدفعة بنجاح");
    } catch (error: any) {
      toast.error("خطأ في إضافة الدفعة: " + error.message);
    }
  };

  const totalIncome = payments.filter(p => p.type === "income").reduce((sum, p) => sum + p.amount, 0);
  const totalExpense = payments.filter(p => p.type === "expense").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-3 rounded-lg">
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
              <p className="text-xl font-bold text-emerald-600">{totalIncome.toLocaleString()} ريال</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 p-3 rounded-lg">
              <ArrowDownRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
              <p className="text-xl font-bold text-red-600">{totalExpense.toLocaleString()} ريال</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="بحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pr-10 pl-4 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">الكل</option>
              <option value="income">إيرادات</option>
              <option value="expense">مصروفات</option>
            </select>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={handleExport}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 border border-border px-4 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>تصدير</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة دفعة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold">سجل الدفعات</h2>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="text-center py-10">جاري التحميل...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد دفعات</p>
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <div key={payment.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      payment.type === "income" ? "bg-emerald-100" : "bg-red-100"
                    )}>
                      {payment.type === "income" ? (
                        <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className={cn(
                        "font-bold text-lg",
                        payment.type === "income" ? "text-emerald-600" : "text-red-600"
                      )}>
                        {payment.type === "income" ? "+" : "-"}{payment.amount.toLocaleString()} ريال
                      </p>
                      <p className="text-sm text-muted-foreground">{payment.category}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="font-medium">{payment.member_name}</span>
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2 justify-end text-sm text-muted-foreground mt-1">
                      <span>{payment.date}</span>
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                </div>
                {payment.notes && (
                  <p className="text-sm text-muted-foreground mt-2 mr-14">{payment.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold">إضافة دفعة جديدة</h2>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setNewPayment({ ...newPayment, type: "income", category: "" })}
                  className={cn(
                    "flex-1 py-2 rounded-lg font-medium transition-colors",
                    newPayment.type === "income"
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  إيراد
                </button>
                <button
                  onClick={() => setNewPayment({ ...newPayment, type: "expense", category: "" })}
                  className={cn(
                    "flex-1 py-2 rounded-lg font-medium transition-colors",
                    newPayment.type === "expense"
                      ? "bg-red-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  مصروف
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-right">اسم العضو</label>
                <input
                  type="text"
                  value={newPayment.member_name}
                  onChange={(e) => setNewPayment({ ...newPayment, member_name: e.target.value })}
                  className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="أدخل اسم العضو"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-right">المبلغ</label>
                <input
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-right">التصنيف</label>
                <select
                  value={newPayment.category}
                  onChange={(e) => setNewPayment({ ...newPayment, category: e.target.value })}
                  className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                >
                  <option value="">اختر التصنيف</option>
                  {categories[newPayment.type].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-right">ملاحظات</label>
                <textarea
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right resize-none"
                  rows={3}
                  placeholder="ملاحظات إضافية (اختياري)"
                />
              </div>
              <button
                onClick={handleAddPayment}
                className={cn(
                  "w-full py-3 rounded-lg font-medium transition-colors mt-4 text-white",
                  newPayment.type === "income" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
                )}
              >
                إضافة الدفعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

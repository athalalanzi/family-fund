"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Plus,
  Search,
  Calendar,
  X,
  Receipt,
  TrendingDown,
  BarChart3,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description: string;
}

const categories = [
  { id: "aid", name: "مساعدات", color: "bg-emerald-500" },
  { id: "admin", name: "مصاريف إدارية", color: "bg-blue-500" },
  { id: "events", name: "مناسبات", color: "bg-purple-500" },
  { id: "other", name: "أخرى", color: "bg-gray-500" },
];

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [newExpense, setNewExpense] = useState({
    title: "",
    amount: "",
    category: "",
    description: "",
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      console.error("Error fetching expenses:", error.message);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          expense.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterCategory === "all" || expense.category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  const handleExport = () => {
    if (filteredExpenses.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const exportData = filteredExpenses.map(e => ({
      "العنوان": e.title,
      "المبلغ": e.amount,
      "التصنيف": e.category,
      "التاريخ": e.date,
      "الوصف": e.description
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, `expenses_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("تم تصدير البيانات بنجاح");
  };

  const handleAddExpense = async () => {
    if (!newExpense.title || !newExpense.amount || !newExpense.category) {
      toast.error("يرجى إكمال جميع الحقول");
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("expenses")
        .insert([{
          title: newExpense.title,
          amount: parseFloat(newExpense.amount),
          category: newExpense.category,
          date: new Date().toISOString().split("T")[0],
          description: newExpense.description,
        }])
        .select();

      if (error) throw error;
      
      // Also record in payments table as an expense type
      await supabase.from("payments").insert([{
        member_name: "صندوق العائلة",
        amount: parseFloat(newExpense.amount),
        type: "expense",
        category: newExpense.category,
        date: new Date().toISOString().split("T")[0],
        notes: newExpense.title
      }]);

      setExpenses([data[0], ...expenses]);
      setShowAddModal(false);
      setNewExpense({ title: "", amount: "", category: "", description: "" });
      toast.success("تم إضافة المصروف بنجاح");
    } catch (error: any) {
      toast.error("خطأ في إضافة المصروف: " + error.message);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const expensesByCategory = categories.map((cat) => ({
    ...cat,
    total: expenses.filter((e) => e.category === cat.name).reduce((sum, e) => sum + e.amount, 0),
  }));

  const getCategoryColor = (categoryName: string) => {
    return categories.find((c) => c.name === categoryName)?.color || "bg-gray-500";
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-3 rounded-lg">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
              <p className="text-xl font-bold">{totalExpenses.toLocaleString()} ريال</p>
            </div>
          </div>
        </div>
        {expensesByCategory.slice(0, 3).map((cat) => (
          <div key={cat.id} className="bg-card rounded-xl p-5 shadow-sm border border-border">
            <div className="flex items-center gap-3">
              <div className={cn("p-3 rounded-lg", cat.color)}>
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{cat.name}</p>
                <p className="text-xl font-bold">{cat.total.toLocaleString()} ريال</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
        <h3 className="font-semibold mb-4 flex items-center gap-2 justify-end">
          توزيع المصروفات حسب التصنيف
          <BarChart3 className="w-5 h-5" />
        </h3>
        <div className="space-y-3">
          {expensesByCategory.map((cat) => {
            const percentage = totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0;
            return (
              <div key={cat.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{cat.total.toLocaleString()} ريال ({percentage.toFixed(0)}%)</span>
                  <span className="font-medium">{cat.name}</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", cat.color)}
                    style={{ width: `${percentage}%`, marginRight: "auto", marginLeft: 0 }}
                  />
                </div>
              </div>
            );
          })}
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
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">جميع التصنيفات</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
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
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مصروف</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold">سجل المصروفات</h2>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="text-center py-10">جاري التحميل...</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد مصروفات</p>
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <div key={expense.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", getCategoryColor(expense.category))}>
                      <Receipt className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-red-600">
                        -{expense.amount.toLocaleString()} ريال
                      </p>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full text-white",
                        getCategoryColor(expense.category)
                      )}>
                        {expense.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium">{expense.title}</h3>
                    <div className="flex items-center gap-2 justify-end text-sm text-muted-foreground mt-1">
                      <span>{expense.date}</span>
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                </div>
                {expense.description && (
                  <p className="text-sm text-muted-foreground mt-2 mr-14">{expense.description}</p>
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
              <h2 className="text-xl font-bold">إضافة مصروف جديد</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-right">عنوان المصروف</label>
                <input
                  type="text"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="مثال: مساعدة زواج"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-right">المبلغ</label>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-right">التصنيف</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                >
                  <option value="">اختر التصنيف</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-right">الوصف (اختياري)</label>
                <textarea
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right resize-none"
                  rows={3}
                  placeholder="تفاصيل إضافية عن المصروف"
                />
              </div>
              <button
                onClick={handleAddExpense}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors mt-4"
              >
                إضافة المصروف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

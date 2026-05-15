"use client";

import { useState, useEffect } from "react";
import {
  CreditCard, Plus, Search, Calendar, User, MoreVertical,
  X, Check, AlertCircle, Trash2, Edit2, DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Loan {
  id: string;
  borrower: string;
  amount: number;
  remainingAmount: number;
  date: string;
  dueDate: string;
  status: "active"|"paid"|"overdue";
  installments: number;
  paidInstallments: number;
}

export function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan|null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [newLoan, setNewLoan] = useState({ borrower:"", amount:"", dueDate:"", installments:"1" });
  const [editLoan, setEditLoan] = useState({ borrower:"", amount:"", dueDate:"", installments:"1", status:"active" });

  const fetchLoans = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("loans").select("*").order("created_at",{ascending:false});
    if (!error) setLoans(data||[]);
    setLoading(false);
  };

  useEffect(()=>{ fetchLoans(); },[]);

  const filteredLoans = loans.filter(l=>{
    const ms = l.borrower.toLowerCase().includes(searchTerm.toLowerCase());
    const mf = filterStatus==="all"||l.status===filterStatus;
    return ms&&mf;
  });

  const overdueCount = loans.filter(l=>l.status==="overdue").length;
  const totalLoans = loans.reduce((s,l)=>s+l.amount,0);
  const totalRemaining = loans.reduce((s,l)=>s+l.remainingAmount,0);
  const activeLoans = loans.filter(l=>l.status==="active").length;

  const getStatusBadge = (status:Loan["status"]) => {
    const styles = { active:"bg-blue-100 text-blue-700", paid:"bg-emerald-100 text-emerald-700", overdue:"bg-red-100 text-red-700" };
    const labels = { active:"نشط", paid:"مسدد", overdue:"متأخر" };
    return <span className={cn("px-3 py-1 rounded-full text-sm font-medium",styles[status])}>{labels[status]}</span>;
  };

  const handleAddLoan = async () => {
    if(!newLoan.borrower||!newLoan.amount||!newLoan.dueDate){ toast.error("يرجى إكمال جميع الحقول"); return; }
    const { data, error } = await supabase.from("loans").insert([{
      borrower:newLoan.borrower, amount:parseFloat(newLoan.amount),
      remainingAmount:parseFloat(newLoan.amount), date:new Date().toISOString().split("T")[0],
      dueDate:newLoan.dueDate, status:"active",
      installments:parseInt(newLoan.installments), paidInstallments:0,
    }]).select();
    if(error){ toast.error("خطأ: "+error.message); return; }
    setLoans([data[0],...loans]);
    setShowAddModal(false);
    setNewLoan({borrower:"",amount:"",dueDate:"",installments:"1"});
    toast.success("تم إضافة القرض بنجاح");
  };

  const handleDeleteLoan = async (id:string) => {
    if(!confirm("هل أنت متأكد من حذف هذا القرض؟")) return;
    const { error } = await supabase.from("loans").delete().eq("id",id);
    if(error){ toast.error("خطأ في الحذف"); return; }
    setLoans(loans.filter(l=>l.id!==id));
    toast.success("تم حذف القرض");
  };

  const openPaymentModal = (loan:Loan) => {
    setSelectedLoan(loan);
    setPaymentAmount("");
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if(!selectedLoan||!paymentAmount||isNaN(parseFloat(paymentAmount))){ toast.error("أدخل مبلغاً صحيحاً"); return; }
    const amount = parseFloat(paymentAmount);
    if(amount>selectedLoan.remainingAmount){ toast.error("المبلغ أكبر من المتبقي"); return; }
    const newRemaining = selectedLoan.remainingAmount - amount;
    const newStatus = newRemaining===0?"paid":selectedLoan.status;
    const newPaid = Math.min(selectedLoan.paidInstallments+1, selectedLoan.installments);
    const { error } = await supabase.from("loans").update({
      remainingAmount:newRemaining, status:newStatus, paidInstallments:newPaid
    }).eq("id",selectedLoan.id);
    if(error){ toast.error("خطأ في تسجيل الدفعة"); return; }
    await supabase.from("payments").insert([{
      member_name:selectedLoan.borrower, amount, type:"income",
      category:"سداد قرض", date:new Date().toISOString().split("T")[0]
    }]);
    setShowPaymentModal(false);
    fetchLoans();
    toast.success("تم تسجيل الدفعة بنجاح");
  };

  const openEditModal = (loan:Loan) => {
    setSelectedLoan(loan);
    setEditLoan({ borrower:loan.borrower, amount:loan.amount.toString(), dueDate:loan.dueDate, installments:loan.installments.toString(), status:loan.status });
    setShowEditModal(true);
  };

  const handleEditLoan = async () => {
    if(!selectedLoan) return;
    const { error } = await supabase.from("loans").update({
      borrower:editLoan.borrower, amount:parseFloat(editLoan.amount),
      dueDate:editLoan.dueDate, installments:parseInt(editLoan.installments), status:editLoan.status,
    }).eq("id",selectedLoan.id);
    if(error){ toast.error("خطأ في التعديل"); return; }
    setShowEditModal(false);
    fetchLoans();
    toast.success("تم تعديل القرض");
  };

  return (
    <div className="space-y-6">
      {overdueCount>0 && (
        <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500"/>
          <div>
            <p className="text-red-800 font-bold">تنبيه: يوجد {overdueCount} قروض متأخرة</p>
            <p className="text-red-600 text-sm">يرجى متابعة المقترضين لتسديد المبالغ المستحقة.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {label:"إجمالي القروض",value:totalLoans,color:"bg-blue-500",icon:CreditCard},
          {label:"المتبقي للتحصيل",value:totalRemaining,color:"bg-orange-500",icon:AlertCircle},
          {label:"القروض النشطة",value:activeLoans,color:"bg-emerald-500",icon:Check,unit:"قرض"},
        ].map((s,i)=>(
          <div key={i} className="bg-card rounded-xl p-5 shadow-sm border border-border">
            <div className="flex items-center gap-3">
              <div className={`${s.color} p-3 rounded-lg`}><s.icon className="w-5 h-5 text-white"/></div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{typeof s.value==="number"&&!s.unit?s.value.toLocaleString()+" ريال":s.value+" "+(s.unit||"ريال")}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
              <input type="text" placeholder="بحث عن مقترض..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pr-10 pl-4 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
            </div>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="px-4 py-2 bg-muted rounded-lg text-sm">
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="paid">مسدد</option>
              <option value="overdue">متأخر</option>
            </select>
          </div>
          <button onClick={()=>setShowAddModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4"/><span>إضافة قرض</span>
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-muted">
              <tr>
                {["المقترض","المبلغ","المتبقي","الأقساط","تاريخ الاستحقاق","الحالة",""].map((h,i)=>(
                  <th key={i} className="px-6 py-4 text-sm font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10">جاري التحميل...</td></tr>
              ) : filteredLoans.length===0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50"/><p>لا توجد قروض</p>
                </td></tr>
              ) : filteredLoans.map(loan=>(
                <tr key={loan.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary"/>
                      </div>
                      <span className="font-medium">{loan.borrower}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{loan.amount.toLocaleString()} ريال</td>
                  <td className="px-6 py-4 text-muted-foreground">{loan.remainingAmount.toLocaleString()} ريال</td>
                  <td className="px-6 py-4">
                    <span className="text-sm">{loan.paidInstallments}/{loan.installments}</span>
                    <div className="w-20 h-2 bg-muted rounded-full mt-1">
                      <div className="h-full bg-primary rounded-full" style={{width:`${(loan.paidInstallments/loan.installments)*100}%`}}/>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4"/>{loan.dueDate}</div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(loan.status)}</td>
                  <td className="px-6 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-muted rounded-lg"><MoreVertical className="w-4 h-4 text-muted-foreground"/></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={()=>openPaymentModal(loan)} className="flex items-center gap-2 cursor-pointer">
                          <DollarSign className="w-4 h-4"/><span>تسجيل دفعة</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={()=>openEditModal(loan)} className="flex items-center gap-2 cursor-pointer">
                          <Edit2 className="w-4 h-4"/><span>تعديل القرض</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={()=>handleDeleteLoan(loan.id)} className="flex items-center gap-2 text-red-600 cursor-pointer">
                          <Trash2 className="w-4 h-4"/><span>حذف القرض</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <button onClick={()=>setShowAddModal(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5"/></button>
              <h2 className="text-xl font-bold">إضافة قرض جديد</h2>
            </div>
            <div className="space-y-4">
              {[
                {label:"اسم المقترض",key:"borrower",type:"text",placeholder:"أدخل اسم المقترض"},
                {label:"مبلغ القرض",key:"amount",type:"number",placeholder:"0"},
                {label:"عدد الأقساط",key:"installments",type:"number",placeholder:"1"},
              ].map(f=>(
                <div key={f.key}>
                  <label className="block text-sm font-medium mb-2 text-right">{f.label}</label>
                  <input type={f.type} value={(newLoan as any)[f.key]} onChange={e=>setNewLoan({...newLoan,[f.key]:e.target.value})}
                    className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right" placeholder={f.placeholder}/>
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-2 text-right">تاريخ الاستحقاق</label>
                <input type="date" value={newLoan.dueDate} onChange={e=>setNewLoan({...newLoan,dueDate:e.target.value})}
                  className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"/>
              </div>
              <button onClick={handleAddLoan} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">إضافة القرض</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <button onClick={()=>setShowPaymentModal(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5"/></button>
              <h2 className="text-xl font-bold">تسجيل دفعة</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg text-right space-y-1">
                <p className="font-medium">{selectedLoan.borrower}</p>
                <p className="text-sm text-muted-foreground">المتبقي: <span className="font-bold text-foreground">{selectedLoan.remainingAmount.toLocaleString()} ريال</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-right">مبلغ الدفعة</label>
                <input type="number" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right" placeholder="0"/>
              </div>
              <button onClick={handlePayment} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors">تأكيد الدفعة</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <button onClick={()=>setShowEditModal(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5"/></button>
              <h2 className="text-xl font-bold">تعديل القرض</h2>
            </div>
            <div className="space-y-4">
              {[
                {label:"اسم المقترض",key:"borrower",type:"text"},
                {label:"المبلغ الأصلي",key:"amount",type:"number"},
                {label:"عدد الأقساط",key:"installments",type:"number"},
              ].map(f=>(
                <div key={f.key}>
                  <label className="block text-sm font-medium mb-2 text-right">{f.label}</label>
                  <input type={f.type} value={(editLoan as any)[f.key]} onChange={e=>setEditLoan({...editLoan,[f.key]:e.target.value})}
                    className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"/>
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-2 text-right">تاريخ الاستحقاق</label>
                <input type="date" value={editLoan.dueDate} onChange={e=>setEditLoan({...editLoan,dueDate:e.target.value})}
                  className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-right">الحالة</label>
                <select value={editLoan.status} onChange={e=>setEditLoan({...editLoan,status:e.target.value})}
                  className="w-full px-4 py-3 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right">
                  <option value="active">نشط</option>
                  <option value="paid">مسدد</option>
                  <option value="overdue">متأخر</option>
                </select>
              </div>
              <button onClick={handleEditLoan} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">حفظ التعديلات</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

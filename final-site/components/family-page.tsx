"use client";

import { useState, useRef, useEffect } from "react";
import { Users, Printer, Plus, X, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface FamilyHead { id: string; name: string; }
interface FamilyMember {
  id: string; name: string; type: string; date: string;
  required: number; paid: number; remaining: number;
  status: "paid"|"partial"|"unpaid"; head_id: string;
}

export function FamilyPage() {
  const [familyHeads, setFamilyHeads] = useState<FamilyHead[]>([]);
  const [selectedHead, setSelectedHead] = useState("");
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddHeadModal, setShowAddHeadModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showPayMemberModal, setShowPayMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember|null>(null);
  const [memberPayAmount, setMemberPayAmount] = useState("");
  const [newHeadName, setNewHeadName] = useState("");
  const [newMember, setNewMember] = useState({ name:"", type:"اشتراك شهري", required:"500" });
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ fetchHeads(); },[]);
  useEffect(()=>{ if(selectedHead) fetchMembers(selectedHead); else setMembers([]); },[selectedHead]);

  const fetchHeads = async () => {
    const { data } = await supabase.from("family_heads").select("*").order("name");
    setFamilyHeads(data||[]);
  };

  const fetchMembers = async (headId:string) => {
    setLoading(true);
    const { data } = await supabase.from("members").select("*").eq("head_id",headId).order("date",{ascending:false});
    setMembers(data||[]);
    setLoading(false);
  };

  const handleAddHead = async () => {
    if(!newHeadName) return;
    const { data, error } = await supabase.from("family_heads").insert([{name:newHeadName}]).select();
    if(error){ toast.error("خطأ في الإضافة"); return; }
    setFamilyHeads([...familyHeads,data[0]]);
    setShowAddHeadModal(false); setNewHeadName("");
    toast.success("تم إضافة الأب بنجاح");
  };

  const handleAddMember = async () => {
    if(!newMember.name||!selectedHead) return;
    const req = parseFloat(newMember.required);
    const { data, error } = await supabase.from("members").insert([{
      name:newMember.name, type:newMember.type, required:req,
      paid:0, remaining:req, status:"unpaid", head_id:selectedHead,
      date:new Date().toISOString().split("T")[0]
    }]).select();
    if(error){ toast.error("خطأ في الإضافة"); return; }
    setMembers([data[0],...members]);
    setShowAddMemberModal(false);
    setNewMember({name:"",type:"اشتراك شهري",required:"500"});
    toast.success("تم إضافة العضو بنجاح");
  };

  const openPayMember = (member:FamilyMember) => {
    setSelectedMember(member); setMemberPayAmount(""); setShowPayMemberModal(true);
  };

  const handlePayMember = async () => {
    if(!selectedMember||!memberPayAmount) return;
    const amount = parseFloat(memberPayAmount);
    if(isNaN(amount)||amount<=0){ toast.error("أدخل مبلغاً صحيحاً"); return; }
    if(amount>selectedMember.remaining){ toast.error("المبلغ أكبر من المتبقي"); return; }
    const newPaid = selectedMember.paid + amount;
    const newRemaining = selectedMember.remaining - amount;
    const newStatus = newRemaining===0?"paid": newPaid>0?"partial":"unpaid";
    const { error } = await supabase.from("members").update({
      paid:newPaid, remaining:newRemaining, status:newStatus
    }).eq("id",selectedMember.id);
    if(error){ toast.error("خطأ في التحديث"); return; }
    // سجّل في جدول الدفعات
    await supabase.from("payments").insert([{
      member_name:selectedMember.name, amount, type:"income",
      category:"اشتراك شهري", date:new Date().toISOString().split("T")[0]
    }]);
    setShowPayMemberModal(false);
    fetchMembers(selectedHead);
    toast.success("تم تسجيل الدفعة بنجاح");
  };

  const filteredMembers = members.filter(m=>{
    if(!fromDate&&!toDate) return true;
    const md=new Date(m.date);
    if(fromDate&&md<new Date(fromDate)) return false;
    if(toDate&&md>new Date(toDate)) return false;
    return true;
  });

  const totalRequired = filteredMembers.reduce((s,m)=>s+m.required,0);
  const totalPaid = filteredMembers.reduce((s,m)=>s+m.paid,0);
  const totalRemaining = filteredMembers.reduce((s,m)=>s+m.remaining,0);

  const handlePrint = () => {
    if(!printRef.current) return;
    const w=window.open("","_blank"); if(!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>كشف حساب</title>
      <style>body{font-family:sans-serif;padding:20px;direction:rtl}table{width:100%;border-collapse:collapse;margin-top:20px}
      th,td{padding:10px;border:1px solid #ddd;text-align:center}th{background:#f4f4f4}.header{text-align:center;margin-bottom:20px}</style></head>
      <body><div class="header"><h1>صندوق عائلة مرفوع جهيم العنزي</h1><p>كشف حساب تفصيلي</p></div>${printRef.current.innerHTML}</body></html>`);
    w.document.close(); w.print();
  };

  const statusBadge = (s:string) => {
    const map:Record<string,string> = { paid:"bg-emerald-100 text-emerald-700", partial:"bg-yellow-100 text-yellow-700", unpaid:"bg-red-100 text-red-700" };
    const labels:Record<string,string> = { paid:"مسدد", partial:"جزئي", unpaid:"غير مسدد" };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[s]||""}`}>{labels[s]||s}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-2xl font-bold">بيان العائلة</h1>
          <p className="text-muted-foreground">إدارة الأسر وأعضائها ومتابعة التزاماتهم</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowAddHeadModal(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
            <Plus className="w-4 h-4"/><span>إضافة أب</span>
          </button>
          <button onClick={handlePrint} disabled={!selectedHead} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50">
            <Printer className="w-4 h-4"/><span>طباعة</span>
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-right">رب الأسرة</label>
            <select value={selectedHead} onChange={e=>setSelectedHead(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-right">
              <option value="">اختر الأب...</option>
              {familyHeads.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-right">من تاريخ</label>
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-lg"/>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-right">إلى تاريخ</label>
            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-lg"/>
          </div>
        </div>
      </div>

      {selectedHead && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 p-4 rounded-lg text-center border border-emerald-100">
              <p className="text-sm text-emerald-600">إجمالي المطلوب</p>
              <p className="text-xl font-bold text-emerald-700">{totalRequired.toLocaleString()} ريال</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
              <p className="text-sm text-blue-600">إجمالي المدفوع</p>
              <p className="text-xl font-bold text-blue-700">{totalPaid.toLocaleString()} ريال</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center border border-red-100">
              <p className="text-sm text-red-600">إجمالي المتبقي</p>
              <p className="text-xl font-bold text-red-700">{totalRemaining.toLocaleString()} ريال</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden" ref={printRef}>
            <table className="w-full text-right">
              <thead className="bg-muted">
                <tr>
                  {["الاسم","النوع","التاريخ","المطلوب","المدفوع","المتبقي","الحالة",""].map((h,i)=>(
                    <th key={i} className="px-6 py-4 text-sm font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">جاري التحميل...</td></tr>
                ) : filteredMembers.length===0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40"/><p>لا يوجد أعضاء</p>
                  </td></tr>
                ) : filteredMembers.map(m=>(
                  <tr key={m.id} className="border-t border-border hover:bg-muted/50">
                    <td className="px-6 py-4 font-medium">{m.name}</td>
                    <td className="px-6 py-4">{m.type}</td>
                    <td className="px-6 py-4">{m.date}</td>
                    <td className="px-6 py-4">{m.required.toLocaleString()}</td>
                    <td className="px-6 py-4 text-emerald-600">{m.paid.toLocaleString()}</td>
                    <td className="px-6 py-4 text-red-600 font-bold">{m.remaining.toLocaleString()}</td>
                    <td className="px-6 py-4">{statusBadge(m.status)}</td>
                    <td className="px-6 py-4">
                      {m.remaining>0 && (
                        <button onClick={()=>openPayMember(m)} className="flex items-center gap-1 text-sm text-emerald-600 hover:underline">
                          <DollarSign className="w-4 h-4"/>دفع
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={()=>setShowAddMemberModal(true)}
            className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5"/><span>إضافة عضو جديد لهذه الأسرة</span>
          </button>
        </div>
      )}

      {/* Add Head Modal */}
      {showAddHeadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between mb-4">
              <button onClick={()=>setShowAddHeadModal(false)}><X/></button>
              <h2 className="text-xl font-bold">إضافة أب جديد</h2>
            </div>
            <input type="text" value={newHeadName} onChange={e=>setNewHeadName(e.target.value)}
              className="w-full px-4 py-2 bg-muted rounded-lg mb-4 text-right" placeholder="اسم الأب بالكامل"/>
            <button onClick={handleAddHead} className="w-full bg-primary text-white py-2 rounded-lg">حفظ</button>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between mb-4">
              <button onClick={()=>setShowAddMemberModal(false)}><X/></button>
              <h2 className="text-xl font-bold">إضافة عضو للأسرة</h2>
            </div>
            <div className="space-y-4">
              <input type="text" value={newMember.name} onChange={e=>setNewMember({...newMember,name:e.target.value})}
                className="w-full px-4 py-2 bg-muted rounded-lg text-right" placeholder="اسم العضو"/>
              <select value={newMember.type} onChange={e=>setNewMember({...newMember,type:e.target.value})}
                className="w-full px-4 py-2 bg-muted rounded-lg text-right">
                <option value="اشتراك شهري">اشتراك شهري</option>
                <option value="تبرع">تبرع</option>
                <option value="أخرى">أخرى</option>
              </select>
              <input type="number" value={newMember.required} onChange={e=>setNewMember({...newMember,required:e.target.value})}
                className="w-full px-4 py-2 bg-muted rounded-lg text-right" placeholder="المبلغ المطلوب"/>
              <button onClick={handleAddMember} className="w-full bg-primary text-white py-2 rounded-lg">حفظ العضو</button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Member Modal */}
      {showPayMemberModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between mb-4">
              <button onClick={()=>setShowPayMemberModal(false)}><X/></button>
              <h2 className="text-xl font-bold">تسجيل دفعة للعضو</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg text-right space-y-1">
                <p className="font-medium">{selectedMember.name}</p>
                <p className="text-sm text-muted-foreground">المتبقي: <span className="font-bold text-foreground">{selectedMember.remaining.toLocaleString()} ريال</span></p>
              </div>
              <input type="number" value={memberPayAmount} onChange={e=>setMemberPayAmount(e.target.value)}
                className="w-full px-4 py-3 bg-muted rounded-lg text-right" placeholder="مبلغ الدفعة"/>
              <button onClick={handlePayMember} className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700">تأكيد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

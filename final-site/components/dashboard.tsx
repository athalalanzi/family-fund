"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
const MONTH_NAMES: Record<number, string> = {
  1:"يناير",2:"فبراير",3:"مارس",4:"أبريل",5:"مايو",6:"يونيو",
  7:"يوليو",8:"أغسطس",9:"سبتمبر",10:"أكتوبر",11:"نوفمبر",12:"ديسمبر",
};

export function Dashboard() {
  const [stats, setStats] = useState([
    { title:"رصيد الصندوق", value:"0", unit:"ريال", icon:Wallet, color:"bg-emerald-500" },
    { title:"إجمالي الإيرادات", value:"0", unit:"ريال", icon:TrendingUp, color:"bg-blue-500" },
    { title:"إجمالي المصروفات", value:"0", unit:"ريال", icon:TrendingDown, color:"bg-orange-500" },
    { title:"عدد الأعضاء", value:"0", unit:"عضو", icon:Users, color:"bg-purple-500" },
  ]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: payments } = await supabase.from("payments").select("*");
        const { data: members } = await supabase.from("members").select("*");

        const totalIncome = payments?.filter(p=>p.type==="income").reduce((s,p)=>s+p.amount,0)||0;
        const totalExpense = payments?.filter(p=>p.type==="expense").reduce((s,p)=>s+p.amount,0)||0;
        const balance = totalIncome - totalExpense;

        setStats([
          { title:"رصيد الصندوق", value:balance.toLocaleString(), unit:"ريال", icon:Wallet, color:"bg-emerald-500" },
          { title:"إجمالي الإيرادات", value:totalIncome.toLocaleString(), unit:"ريال", icon:TrendingUp, color:"bg-blue-500" },
          { title:"إجمالي المصروفات", value:totalExpense.toLocaleString(), unit:"ريال", icon:TrendingDown, color:"bg-orange-500" },
          { title:"عدد الأعضاء", value:(members?.length||0).toString(), unit:"عضو", icon:Users, color:"bg-purple-500" },
        ]);

        // آخر 5 معاملات
        const sorted = (payments||[])
          .sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime())
          .slice(0,5);
        setRecentTransactions(sorted);

        // رسم بياني — آخر 6 أشهر حقيقية من Supabase
        const now = new Date();
        const last6: {month:number;year:number;name:string}[] = [];
        for(let i=5;i>=0;i--){
          const d=new Date(now.getFullYear(),now.getMonth()-i,1);
          last6.push({month:d.getMonth()+1,year:d.getFullYear(),name:MONTH_NAMES[d.getMonth()+1]});
        }
        const realChart = last6.map(({month,year,name})=>{
          const mp=(payments||[]).filter(p=>{
            const d=new Date(p.date);
            return d.getMonth()+1===month && d.getFullYear()===year;
          });
          return {
            name,
            income: mp.filter(p=>p.type==="income").reduce((s,p)=>s+p.amount,0),
            expense: mp.filter(p=>p.type==="expense").reduce((s,p)=>s+p.amount,0),
          };
        });
        setChartData(realChart);

        // دائرة المصروفات
        const cats:Record<string,number>={};
        (payments||[]).filter(p=>p.type==="expense").forEach(p=>{
          if(p.category) cats[p.category]=(cats[p.category]||0)+p.amount;
        });
        const pie=Object.entries(cats).map(([name,value])=>({name,value}));
        setPieData(pie.length>0?pie:[{name:"لا توجد مصروفات",value:1}]);
      } catch(e){ console.error(e); }
      finally { setLoading(false); }
    }
    fetchData();
  },[]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat,i)=>(
          <div key={i} className="bg-card rounded-xl p-5 shadow-sm border border-border">
            <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center mb-4`}>
              <stat.icon className="w-5 h-5 text-white"/>
            </div>
            <p className="text-muted-foreground text-sm">{stat.title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {stat.value} <span className="text-base font-normal text-muted-foreground">{stat.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <h2 className="text-lg font-semibold mb-6 text-right">حركة الصندوق (6 أشهر)</h2>
          <div className="h-80 w-full">
            {loading ? <div className="flex items-center justify-center h-full text-muted-foreground">جاري التحميل...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="name"/><YAxis/>
                  <Tooltip/><Legend/>
                  <Line type="monotone" dataKey="income" name="الإيرادات" stroke="#10b981" strokeWidth={2} dot={{r:4}}/>
                  <Line type="monotone" dataKey="expense" name="المصروفات" stroke="#ef4444" strokeWidth={2} dot={{r:4}}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <h2 className="text-lg font-semibold mb-6 text-right">توزيع المصروفات</h2>
          <div className="h-80 w-full">
            {loading ? <div className="flex items-center justify-center h-full text-muted-foreground">جاري التحميل...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip/><Legend/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-right">آخر المعاملات</h2>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">جاري التحميل...</div>
          ) : recentTransactions.length===0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50"/>
              <p>لا توجد معاملات حتى الآن</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map(tx=>(
                <div key={tx.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full",tx.type==="income"?"bg-emerald-100 text-emerald-600":"bg-red-100 text-red-600")}>
                      {tx.type==="income"?<ArrowUpRight className="w-4 h-4"/>:<ArrowDownRight className="w-4 h-4"/>}
                    </div>
                    <div>
                      <p className="font-medium">{tx.member_name}</p>
                      <p className="text-xs text-muted-foreground">{tx.category}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={cn("font-bold",tx.type==="income"?"text-emerald-600":"text-red-600")}>
                      {tx.type==="income"?"+":"-"}{tx.amount?.toLocaleString()} ريال
                    </p>
                    <p className="text-xs text-muted-foreground">{tx.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

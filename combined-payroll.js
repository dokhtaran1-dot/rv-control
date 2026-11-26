(function(){
"use strict";
// Private owner-only, read-only RV (monthly base) and RM (selected period) payroll comparison.
const E=id=>document.getElementById(id);
const S=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const T=n=>Number(n??0).toLocaleString("fa-IR");
const api=()=>window.RVCTRL;
let granted=false, payload=null;
function iranMonth(){
 const p=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tehran",year:"numeric",month:"2-digit"}).formatToParts(new Date());
 const x=Object.fromEntries(p.map(z=>[z.type,z.value]));
 return x.year+"-"+x.month;
}
function setup(){
 E("combined-month").value=iranMonth()==="2026-11"?"2026-10":iranMonth();
 E("combined-refresh").addEventListener("click",load);
 E("combined-month").addEventListener("change",()=>{if(granted)load();});
}
async function authorize(){
 granted=false;payload=null;
 E("nav-combined-payroll").classList.add("hide");
 if(api()?.role?.()!=="owner")return;
 try{
  const role=await api().rpc("rvmall_payroll_role");
  granted=role==="mall_owner";
 }catch(_){granted=false;}
 E("nav-combined-payroll").classList.toggle("hide",!granted);
}
function reset(){
 granted=false;payload=null;
 E("nav-combined-payroll").classList.add("hide");
 E("combined-rv-list").textContent="";
 E("combined-rm-list").textContent="";
}
function list(rows,kind){
 if(!Array.isArray(rows)||!rows.length)return '<p class="muted">پرونده‌ای برای این بخش موجود نیست.</p>';
 return rows.map(x=>{
  const name=S(x.full_name);
  const unit=S(kind==="rv"?x.department:x.unit_name);
  const amount=kind==="rv"?x.monthly_toman:x.base_toman;
  const value=amount===null||amount===undefined?"تعیین‌نشده":T(amount)+" تومان";
  const note=kind==="rm"?'<div class="mini muted">'+S(x.period_label||"دوره مشخص نشده")+" · "+S(({draft:"پیش‌نویس",approved:"تأییدشده",paid:"پرداخت‌شده (ثبت سیستمی)",not_entered:"ثبت‌نشده"})[x.status]||"—")+"</div>":"";
  return '<div class="row" style="align-items:start"><div><b>'+name+'</b><div class="mini muted">'+unit+'</div>'+note+'</div><b style="font-size:13px;color:var(--gold);text-align:left">'+S(value)+"</b></div>";
 }).join("");
}
function render(){
 const d=payload,rv=d.rv||{},rm=d.rm||{};
 E("combined-rv-count").textContent=T(rv.known_count||0)+" از "+T(rv.staff_count||0)+" نفر";
 E("combined-rv-sum").textContent=T(rv.registered_monthly_base_toman||0)+" تومان";
 E("combined-rm-count").textContent=T(rm.known_count||0)+" از "+T(rm.people_count||0)+" نفر";
 E("combined-rm-sum").textContent=rm.records_count?T(rm.registered_base_toman||0)+" تومان":"گزارش ثبت نشده";
 E("combined-sum").textContent=d.registered_arithmetic_total_toman===null?"قابل محاسبه نیست":T(d.registered_arithmetic_total_toman)+" تومان";
 const periods=(rm.period_labels||[]).join("، ");
 E("combined-period-note").textContent=rm.records_count?
   "دوره ثبت‌شده RM: "+(periods||"نامشخص")+". RV حقوق پایهٔ ماهانه است؛ این دو مبلغ هم‌دوره نیستند و جمع آنها حقوق ماهانه قابل پرداخت محسوب نمی‌شود.":
   "برای ماه انتخاب‌شده، پرونده‌ای از RM ثبت نشده است. جمع دو بخش قابل محاسبه نیست.";
 E("combined-rv-list").innerHTML=list(rv.records,"rv");
 E("combined-rm-list").innerHTML=list(rm.records,"rm");
 E("combined-message").textContent="گزارش فقط خواندنی و ویژه مالک است. مبالغ نامشخص از جمع حذف شده‌اند؛ پاداش‌ها، کسورات و مزایای قطعی‌نشده در جمع پایه نیستند.";
}
async function load(){
 if(!granted){E("combined-message").textContent="این گزارش محرمانه فقط برای مالک مجاز است.";return;}
 const m=E("combined-month").value;
 if(!/^\d{4}-\d{2}$/.test(m)){E("combined-message").textContent="ماه پرونده را انتخاب کنید.";return;}
 E("combined-message").textContent="در حال بارگذاری گزارش محرمانه...";
 try{
  payload=await api().rpc("rvctl_combined_payroll_board",{p_mall_month:m+"-01"});
  render();
 }catch(e){
  payload=null;E("combined-message").textContent="دریافت گزارش انجام نشد: "+String(e?.message||"خطای ارتباط");
  E("combined-rv-list").textContent="";E("combined-rm-list").textContent="";
 }
}
window.CombinedPayroll={setup,authorize,reset,load,enabled:()=>granted};
})();
(function(){
"use strict";
const E=id=>document.getElementById(id),S=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),T=n=>Number(n??0).toLocaleString("fa-IR");
const api=()=>window.RVCTRL;
let allowed=false,rewardsAllowed=false,records=[],owner=false,month="",myRewards=null;
function currentMonth(){const d=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tehran",year:"numeric",month:"2-digit"}).formatToParts(new Date());const p=Object.fromEntries(d.map(x=>[x.type,x.value]));return p.year+"-"+p.month;}
function info(s,bad=false){E("rvp-info").textContent=s;E("rvp-info").classList.toggle("err",bad);}
function setup(){
 E("rvp-month").value=currentMonth();
 E("rvp-month").addEventListener("change",()=>{if(allowed)load();});
 E("rvp-refresh").addEventListener("click",load);
 E("rvp-people").addEventListener("click",e=>{const b=e.target.closest("button[data-rvp-action]");if(b)action(b);});
 E("my-rewards-refresh").addEventListener("click",loadRewards);
}
async function authorize(){
 allowed=false;rewardsAllowed=false;records=[];myRewards=null;
 E("nav-rv-performance").classList.add("hide");
 E("nav-my-rewards").classList.add("hide");
 try{
  const s=await api()?.rpc("rvctl_rv_performance_board",{p_month:E("rvp-month").value+"-01"});
  allowed=!!s&&Array.isArray(s.records);owner=!!s?.owner;
 }catch(_){allowed=false;}
 E("nav-rv-performance").classList.toggle("hide",!allowed);
 try{
  const d=await api()?.rpc("rvctl_my_pay_rewards");
  if(d&&(d.rv_staff_id||d.rm_staff_id)){rewardsAllowed=true;myRewards=d;}
 }catch(_){rewardsAllowed=false;}
 E("nav-my-rewards").classList.toggle("hide",!rewardsAllowed);
}
function reset(){allowed=false;rewardsAllowed=false;records=[];myRewards=null;
 E("nav-rv-performance").classList.add("hide");E("nav-my-rewards").classList.add("hide");
 E("rvp-people").textContent="";E("my-rewards-list").textContent="";}
async function load(){
 if(!allowed){info("این صفحه به حساب مجاز نیاز دارد.",true);return;}
 const m=E("rvp-month").value;if(!/^\d{4}-\d{2}$/.test(m)){info("ماه معتبر انتخاب کنید.",true);return;}
 month=m+"-01";info("در حال دریافت امتیازها...");
 try{
  const d=await api().rpc("rvctl_rv_performance_board",{p_month:month});
  records=Array.isArray(d.records)?d.records:[];owner=!!d.owner;
  render();info("ارزیابی از ۱۰۰ امتیاز است: وظایف ۴۰، وقت‌شناسی ۲۰، مشتری ۲۰ و همکاری ۲۰. فقط مالک تأیید نهایی می‌کند؛ هیچ اثر خودکار مالی ندارد.");
 }catch(e){info("امتیازها دریافت نشدند: "+String(e?.message||"خطای ارتباط"),true);}
}
function render(){
 E("rvp-summary").textContent="کارکنان قابل مشاهده: "+T(records.length)+" · ارزیابی‌های تأییدشده: "+T(records.filter(r=>r.status==="approved").length);
 E("rvp-people").innerHTML=records.map(p=>{
  const fields=[["responsibility","وظایف و دستورات کاری",40],["attendance","وقت‌شناسی",20],["customer","رضایت مشتری",20],["teamwork","رفتار و همکاری",20]];
  const controls=p.can_score?'<div style="border-top:1px solid var(--line);margin-top:12px;padding-top:12px"><div class="grid">'+
   fields.map(([k,label,max])=>'<div class="field"><label>'+label+' (از '+max+')</label><input type="number" data-rvp-field="'+k+'" min="0" max="'+max+'" step="1" value="'+S(p[k]??"")+'"></div>').join("")+'</div>'+
   '<div class="field"><label>دلایل و شواهد ارزیابی</label><textarea data-rvp-field="evidence" maxlength="1000" rows="2">'+S(p.evidence||"")+'</textarea></div>'+
   (p.status!=="approved"?'<button class="action" data-rvp-action="save" data-rvp-id="'+S(p.id)+'">ثبت پیش‌نویس امتیاز</button>':'<p class="mini muted">امتیاز تأیید شده و قفل است؛ مالک می‌تواند باز کند.</p>')+
   (owner&&p.status==="draft"?'<button class="outline action" data-rvp-action="approve" data-rvp-id="'+S(p.id)+'">تأیید نهایی مالک</button>':"")+
   (owner&&p.status==="approved"?'<button class="outline action" data-rvp-action="reopen" data-rvp-id="'+S(p.id)+'">بازکردن امتیاز برای اصلاح</button>':"")+'</div>':"";
  const status={draft:"پیش‌نویس",approved:"تأیید مالک",pending:"منتظر انتشار امتیاز",unscored:"هنوز امتیازی ثبت نشده"}[p.status]||"ثبت نشده";
  const score=p.total_score==null?"—":T(p.total_score)+" / ۱۰۰";
  return '<div class="card" data-rvp-person="'+S(p.id)+'"><div class="row"><div><b>'+S(p.full_name)+'</b><div class="mini muted">'+S(p.position)+' · '+S(p.department)+' · مدیر مستقیم: '+S(p.supervisor||"در انتظار تأیید")+'</div></div><span class="tag">'+S(status)+'</span></div>'+
   '<div style="color:var(--gold);font-weight:bold">'+S(score)+'</div>'+
   (p.status==="approved"&&p.evidence?'<p class="mini muted">توضیح ارزیابی: '+S(p.evidence)+'</p>':"")+controls+'</div>';
 }).join("")||'<div class="card"><p class="muted">کارمند قابل ارزیابی در این حساب نیست.</p></div>';
}
async function action(b){
 const p=records.find(x=>x.id===b.dataset.rvpId);if(!p)return;
 const type=b.dataset.rvpAction,card=b.closest("[data-rvp-person]");
 let fn,args;
 if(type==="save"){
  if(!p.can_score)return;
  const value=k=>card.querySelector('[data-rvp-field="'+k+'"]')?.value.trim()??"";
  const keys=["responsibility","attendance","customer","teamwork"];
  if(keys.some(k=>value(k)==="")){info("هر چهار امتیاز را پر کن.",true);return;}
  const vals=keys.map(k=>Number(value(k)));
  if(vals.some((n,i)=>!Number.isInteger(n)||n<0||n>[40,20,20,20][i])){info("امتیازها باید عدد صحیح در محدوده باشند.",true);return;}
  const evidence=value("evidence");
  if(evidence.length<8){info("دلیل امتیاز حداقل هشت نویسه لازم دارد.",true);return;}
  if(!confirm("امتیاز "+T(vals.reduce((a,b)=>a+b,0))+" از ۱۰۰ برای «"+p.full_name+"» به‌صورت پیش‌نویس ثبت شود؟"))return;
  fn="rvctl_rv_performance_save";
  args={p_person_id:p.id,p_month:month,p_responsibility:vals[0],p_attendance:vals[1],
   p_customer:vals[2],p_teamwork:vals[3],p_evidence:evidence};
 }else if((type==="approve"||type==="reopen")&&owner){
  if(!confirm((type==="approve"?"تأیید نهایی":"بازکردن")+" امتیاز «"+p.full_name+"»؟"))return;
  fn="rvctl_rv_performance_review";args={p_person_id:p.id,p_month:month,p_action:type};
 }else return;
 b.disabled=true;
 try{await api().rpc(fn,args);await load();info("امتیاز ثبت شد. هیچ مبلغ حقوق یا پاداشی تغییر نکرد.");}
 catch(e){info("عملیات انجام نشد: "+String(e?.message||"خطا"),true);}
 finally{b.disabled=false;}
}
async function loadRewards(){
 if(!rewardsAllowed){E("my-rewards-info").textContent="فیش شخصی برای این حساب فعال نیست.";return;}
 E("my-rewards-info").textContent="در حال دریافت اطلاعات شخصی...";
 try{
  const d=await api().rpc("rvctl_my_pay_rewards");myRewards=d;
  const base=d.rv_monthly_base_toman;
  E("my-rewards-info").textContent=d.rv_staff_id?
    "حقوق پایه ماهانه RV: "+(base==null?"هنوز مشخص نشده":T(base)+" تومان")+
    " · این صفحه سند انتقال وجه بانکی یا ثبت پرداخت نیست.":
    "پاداش‌های تأییدشده شخصی در این صفحه نمایش داده می‌شوند؛ فیش حقوقی RM در بخش «فیش حقوقی من» جداست.";
  const kind={owner:"پاداش مالک",management:"پاداش مدیریت",customer_vote:"پاداش رأی مشتریان"};
  E("my-rewards-list").innerHTML=(d.approved_bonuses||[]).map(b=>'<div class="card"><div class="row"><div><b>'+S(kind[b.kind]||b.kind)+'</b><div class="mini muted">'+S(b.unit)+' · '+S(b.month)+'</div></div><b>'+T(b.amount_toman)+' تومان</b></div><p class="mini muted">'+S(b.reason)+'</p></div>').join("")||
   '<div class="card"><p class="muted">هنوز پاداش تأییدشده‌ای برای شما وجود ندارد.</p></div>';
 }catch(e){E("my-rewards-info").textContent="نمایش فیش شخصی ممکن نیست: "+String(e?.message||"خطا");}
}
window.RVPerformance={setup,authorize,reset,load,loadRewards,enabled:()=>allowed,rewardsEnabled:()=>rewardsAllowed};
})();
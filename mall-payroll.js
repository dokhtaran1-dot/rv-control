(function(){
"use strict";
// Strictly separate Royal Mall payroll area inside the RV CONTROL shell.
// It never reads RV staff, RV payroll, or Royal One data.
const E=id=>document.getElementById(id);
const S=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const T=x=>Number(x||0).toLocaleString("fa-IR");
const api=()=>window.RVCTRL;
let role=null,records=[],month="",employeeLinks=[];
function setInfo(message,error=false){const x=E("mall-payroll-info");x.textContent=message;x.classList.toggle("err",error);}
function errorText(e){return String(e?.message||"ارتباط با سامانه برقرار نشد.");}
function notify(txt,bad=false){api()?.msg(txt,bad);}
function iranToday(){
 const parts=new Intl.DateTimeFormat("en-US",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Tehran"}).formatToParts(new Date());
 const d=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 return d.year+"-"+d.month+"-01";
}
function enabled(){return role==="mall_owner"||role==="mall_finance";}
function isOwner(){return role==="mall_owner";}
async function authorize(){
 role=null;records=[];E("nav-mall-payroll").classList.add("hide");
 if(!api()||!api().db())return;
 try{
   const r=await api().db().rpc("rvmall_payroll_role");
   if(r.error)throw r.error;
   role=["mall_owner","mall_finance"].includes(r.data)?r.data:null;
 }catch(e){role=null;}
 E("nav-mall-payroll").classList.toggle("hide",!enabled());
 E("mall-add-person-card").classList.toggle("hide",!isOwner());
 E("mall-employee-links-card").classList.toggle("hide",!isOwner());
 E("mall-user-role").textContent=enabled()?(isOwner()?"مجوز ویژه مالک رویال مال":"مجوز اختصاصی امور مالی رویال مال"):"دسترسی اختصاصی فعال نیست";
}
function reset(){role=null;records=[];employeeLinks=[];E("nav-mall-payroll").classList.add("hide");E("mall-employee-links-card").classList.add("hide");E("mall-links-list").textContent="";}
async function load(){
 if(!enabled()){setInfo("اجازه مشاهده حقوق رویال مال برای این حساب صادر نشده است.",true);return;}
 if(!E("mall-month").value)E("mall-month").value=iranToday().slice(0,7);
 month=E("mall-month").value+"-01";
 setInfo("دریافت پرونده حقوق کارکنان پاساژ...");
 try{
   const d=await api().rpc("rvmall_payroll_list",{p_month:month});
   records=Array.isArray(d.records)?d.records:[];
   render();
   if(isOwner())await loadEmployeeLinks();
   const corrected=records.filter(x=>x.period_label).map(x=>x.period_label);
   const uniquePeriods=[...new Set(corrected)];
   const periodInfo=uniquePeriods.length===1?"بازه ثبت‌شده: "+uniquePeriods[0]+" (نه حقوق کل ماه). ":"";
   setInfo(periodInfo+"اطلاعات پاساژ از رستوران جداست. مقادیر خالی، صفر نیستند.");
 }catch(e){setInfo("خطای دریافت حقوق پاساژ: "+errorText(e),true);}
}
function render(){
 const filter=E("mall-search").value.trim();
 const visible=records.filter(x=>(x.full_name+" "+x.position_title+" "+x.unit_name).includes(filter));
 const entered=records.filter(x=>x.base_toman!==null&&x.base_toman!==undefined);
 const active=records.filter(x=>x.active);
 const base=entered.reduce((a,x)=>a+Number(x.base_toman||0),0);
 const allAdjustmentsKnown=entered.length>0&&entered.every(x=>x.bonus_toman!==null&&x.bonus_toman!==undefined&&x.deduction_toman!==null&&x.deduction_toman!==undefined);
 const bonus=allAdjustmentsKnown?entered.reduce((a,x)=>a+Number(x.bonus_toman),0):null;
 const deduct=allAdjustmentsKnown?entered.reduce((a,x)=>a+Number(x.deduction_toman),0):null;
 E("mall-count").textContent=T(active.length);
 E("mall-unentered").textContent=T(active.filter(x=>x.base_toman===null||x.base_toman===undefined).length);
 E("mall-base").textContent=T(base)+" تومان";
 E("mall-net").textContent=allAdjustmentsKnown?T(base+bonus-deduct)+" تومان":"نامشخص";
 const state={draft:"پیش‌نویس",approved:"تأیید مالک",paid:"پرداخت‌شده (ثبت سیستمی)",not_entered:"ثبت‌نشده"};
 const select=E("mall-link-person"),prev=select.value;
 select.innerHTML='<option value="">انتخاب کارمند</option>'+records.filter(x=>x.active).map(x=>'<option value="'+S(x.id)+'">'+S(x.full_name)+'</option>').join("");
 if(records.some(x=>x.id===prev&&x.active))select.value=prev;
 E("mall-roster").innerHTML=visible.map(x=>{
   const hasPay=x.base_toman!==null&&x.base_toman!==undefined;
   const allKnown=hasPay&&x.bonus_toman!==null&&x.bonus_toman!==undefined&&x.deduction_toman!==null&&x.deduction_toman!==undefined;
   const net=allKnown?Number(x.base_toman)+Number(x.bonus_toman)-Number(x.deduction_toman):null;
   const locked=x.status==="paid";
   const period=x.period_label?'<div class="mini"><b>دوره: '+S(x.period_label)+'</b> · نه کل ماه</div>':"";
   const status=state[x.status]||"ثبت‌نشده";
   return '<div class="card" style="margin-bottom:12px">'+
    '<div class="row"><div><b>'+S(x.full_name)+'</b><div class="mini muted">'+S(x.position_title)+' · '+S(x.unit_name)+' · '+(x.active?"فعال":"غیرفعال")+'</div>'+period+'</div><span class="tag">'+S(status)+'</span></div>'+
    '<div class="grid" style="margin-top:10px"><div><span class="mini muted">پایه</span><div>'+ (hasPay?T(x.base_toman)+" تومان":"تعیین نشده")+'</div></div>'+
    '<div><span class="mini muted">پاداش</span><div>'+(x.bonus_toman===null||x.bonus_toman===undefined?'نامشخص':T(x.bonus_toman)+' تومان')+'</div></div>'+
    '<div><span class="mini muted">کسورات</span><div>'+(x.deduction_toman===null||x.deduction_toman===undefined?'نامشخص':T(x.deduction_toman)+' تومان')+'</div></div>'+
    '<div><span class="mini muted">خالص محاسباتی</span><div>'+(net===null?"نامشخص":T(net)+" تومان")+'</div></div></div>'+
    (x.note?'<p class="mini muted">'+S(x.note)+'</p>':"")+
    '<div class="row" style="margin-top:10px;justify-content:flex-start;flex-wrap:wrap">'+
    (x.active&&!locked?'<button class="outline action" data-mall-edit="'+S(x.id)+'">ثبت/اصلاح حقوق</button>':"")+
    (isOwner()&&x.active&&x.status==="draft"&&allKnown?'<button class="action" data-mall-approve="'+S(x.id)+'">تأیید</button>':"")+
    (isOwner()&&x.active&&x.status==="approved"?'<button class="action" data-mall-paid="'+S(x.id)+'">ثبت پرداخت</button>':"")+
    (isOwner()?'<button class="outline action" data-mall-person="'+S(x.id)+'">اصلاح مشخصات</button>':"")+
    '</div></div>';
 }).join("")||'<p class="muted">کارمندی برای این جست‌وجو ثبت نشده است. فهرست حقوق پاساژ را جداگانه وارد کنید.</p>';
 document.querySelectorAll("[data-mall-edit]").forEach(b=>b.addEventListener("click",()=>editSalary(b.dataset.mallEdit)));
 document.querySelectorAll("[data-mall-approve]").forEach(b=>b.addEventListener("click",()=>decide(b.dataset.mallApprove,"approve")));
 document.querySelectorAll("[data-mall-paid]").forEach(b=>b.addEventListener("click",()=>decide(b.dataset.mallPaid,"mark_paid")));
 document.querySelectorAll("[data-mall-person]").forEach(b=>b.addEventListener("click",()=>editPerson(b.dataset.mallPerson)));
}
function promptNumber(label,old,canBeZero=true){
 const raw=prompt(label,old===null||old===undefined?"":String(old));
 if(raw===null)return null;
 const normalized=raw.replace(/[۰-۹]/g,ch=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(ch))).replace(/[٠-٩]/g,ch=>String("٠١٢٣٤٥٦٧٨٩".indexOf(ch))).replace(/,/g,"").trim();
 const n=Number(normalized);
 if(!normalized||!Number.isSafeInteger(n)||n<0||(!canBeZero&&n===0))throw Error("مبلغ باید عدد صحیح تومان باشد.");
 return n;
}
async function editSalary(id){
 const item=records.find(x=>x.id===id);if(!item||item.status==="paid")return;
 try{
  const base=promptNumber("حقوق پایه «"+item.full_name+"» به تومان:",item.base_toman);if(base===null)return;
  const bonus=promptNumber("پاداش به تومان (اگر پاداشی ندارد، صفر را آگاهانه وارد کن):",item.bonus_toman);if(bonus===null)return;
  const deduction=promptNumber("کسورات به تومان (اگر کسوراتی ندارد، صفر را آگاهانه وارد کن):",item.deduction_toman);if(deduction===null)return;
  if(deduction>base+bonus)throw Error("کسورات نمی‌تواند بیشتر از حقوق به‌علاوه پاداش باشد.");
  const note=prompt("توضیحات / مزایا (اختیاری):",item.note||"");if(note===null)return;
  if(note.length>1000)throw Error("توضیح بیش از حد طولانی است.");
  if(!confirm("حقوق این کارمند به‌عنوان پیش‌نویس ثبت شود؟"))return;
  await api().rpc("rvmall_payroll_record",{p_person_id:id,p_month:month,p_base:base,p_bonus:bonus,p_deduction:deduction,p_note:note});
  notify("حقوق رویال مال به صورت پیش‌نویس با سابقه تغییر ثبت شد.");await load();
 }catch(e){notify(errorText(e),true);}
}
async function decide(id,action){
 const item=records.find(x=>x.id===id);
 if(!isOwner()||!item)return;
 const question=action==="mark_paid"?
  "آیا مبلغ حقوق «"+item.full_name+"» واقعاً پرداخت شده و می‌خواهید فقط وضعیت آن را در سامانه «پرداخت‌شده» ثبت کنید؟ این عمل پول منتقل نمی‌کند.":
  "حقوق «"+item.full_name+"» را تأیید می‌کنید؟";
 if(!confirm(question))return;
 try{await api().rpc("rvmall_payroll_decide",{p_person_id:id,p_month:month,p_action:action});notify(action==="mark_paid"?"وضعیت پرداخت با سابقه حسابرسی ثبت شد.":"حقوق تأیید شد.");await load();}
 catch(e){notify(errorText(e),true);}
}
function editPerson(id){
 if(!isOwner())return;
 const item=records.find(x=>x.id===id);if(!item)return;
 E("mall-person-id").value=item.id;E("mall-name").value=item.full_name;E("mall-position").value=item.position_title;E("mall-unit").value=item.unit_name;
 E("mall-active").checked=!!item.active;
 E("mall-add-person-card").scrollIntoView({behavior:"smooth",block:"start"});
}
async function savePerson(){
 if(!isOwner()){notify("فقط مالک مجاز است.",true);return;}
 const b=E("mall-save-person");b.disabled=true;
 try{
  const name=E("mall-name").value.trim(),pos=E("mall-position").value.trim(),unit=E("mall-unit").value.trim();
  if(name.length<3||pos.length<2||unit.length<2)throw Error("نام، سمت و واحد کارکنان را تکمیل کنید.");
  await api().rpc("rvmall_payroll_person_save",{p_id:E("mall-person-id").value||null,p_name:name,p_position:pos,p_unit:unit,p_active:E("mall-active").checked});
  E("mall-person-id").value="";E("mall-name").value="";E("mall-position").value="";E("mall-unit").value="";E("mall-active").checked=true;
  notify("پرونده کارمند رویال مال ثبت شد.");await load();
 }catch(e){notify(errorText(e),true);}
 finally{b.disabled=false;}
}
async function loadEmployeeLinks(){
 if(!isOwner())return;
 const info=E("mall-link-info");
 info.textContent="در حال دریافت حساب‌های متصل...";
 try{
  const data=await api().rpc("rvmall_payroll_employee_links_list");
  employeeLinks=Array.isArray(data)?data:[];
  renderEmployeeLinks();
  info.textContent="حساب کارمند فقط پس از ثبت‌نام و تأیید ایمیل واقعی فعال می‌شود.";
 }catch(e){info.textContent="دریافت حساب‌های متصل ناموفق بود: "+errorText(e);}
}
function renderEmployeeLinks(){
 const names=new Map(records.map(x=>[x.id,x.full_name]));
 E("mall-links-list").innerHTML=employeeLinks.map(x=>
  '<div class="row" style="margin:8px 0;gap:10px"><div><b>'+S(names.get(x.person_id)||"کارمند")+'</b><div class="mini muted" dir="ltr">'+S(x.email||"")+'</div><div class="mini muted">'+(x.enabled?"فعال":"غیرفعال")+'</div></div>'+
  (x.enabled?'<button class="outline action" data-mall-unlink="'+S(x.person_id)+'">قطع دسترسی</button>':"")+'</div>'
 ).join("")||'<p class="muted mini">هنوز حساب کارمندی متصل نشده است.</p>';
 E("mall-links-list").querySelectorAll("[data-mall-unlink]").forEach(b=>b.addEventListener("click",()=>unlinkEmployee(b.dataset.mallUnlink)));
}
async function linkEmployee(){
 if(!isOwner())return;
 const personId=E("mall-link-person").value;
 const email=E("mall-link-email").value.trim().toLowerCase();
 const person=records.find(x=>x.id===personId&&x.active);
 const info=E("mall-link-info"),button=E("mall-link-save");
 if(!person){info.textContent="پرونده کارمند را انتخاب کنید.";return;}
 if(email.length<6||!email.includes("@")||!email.split("@")[1]?.includes(".")||email.endsWith("@example.com")){
  info.textContent="ایمیل واقعی و قابل دسترس کارمند را وارد کنید.";return;
 }
 if(!confirm("حساب تأییدشده «"+email+"» فقط به فیش حقوقی «"+person.full_name+"» متصل شود؟"))return;
 button.disabled=true;info.textContent="در حال فعال‌سازی فیش شخصی...";
 try{
  await api().rpc("rvmall_payroll_employee_link",{p_person_id:personId,p_email:email});
  E("mall-link-email").value="";
  await loadEmployeeLinks();
  info.textContent="حساب کارمند به پرونده حقوقی خودش متصل شد.";
 }catch(e){info.textContent="اتصال انجام نشد: "+errorText(e);}
 finally{button.disabled=false;}
}
async function unlinkEmployee(personId){
 if(!isOwner())return;
 const person=records.find(x=>x.id===personId);
 if(!confirm("دسترسی فیش شخصی «"+(person?.full_name||"این کارمند")+"» قطع شود؟ اطلاعات حقوق حذف نمی‌شود."))return;
 const info=E("mall-link-info");
 try{
  await api().rpc("rvmall_payroll_employee_unlink",{p_person_id:personId});
  await loadEmployeeLinks();
  info.textContent="دسترسی فیش این کارمند قطع شد؛ پرونده حقوق محفوظ است.";
 }catch(e){info.textContent="قطع دسترسی انجام نشد: "+errorText(e);}
}
function setup(){
 E("mall-month").value=(iranToday().slice(0,7)==="2026-11"?"2026-10":iranToday().slice(0,7));
 E("mall-month").addEventListener("change",()=>{if(enabled())load();});
 E("mall-search").addEventListener("input",render);
 E("mall-refresh").addEventListener("click",load);
 E("mall-link-save").addEventListener("click",linkEmployee);
 E("mall-link-refresh").addEventListener("click",loadEmployeeLinks);
 E("mall-save-person").addEventListener("click",savePerson);
 E("mall-reset-person").addEventListener("click",()=>{
 E("mall-person-id").value="";E("mall-name").value="";E("mall-position").value="";E("mall-unit").value="";E("mall-active").checked=true;
 });
}
window.MallPayroll={setup,authorize,reset,load,enabled};
})();
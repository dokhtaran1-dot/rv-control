(function(){
"use strict";
// Strictly separate Royal Mall payroll area inside the RV CONTROL shell.
// It never reads RV staff, RV payroll, or Royal One data.
const E=id=>document.getElementById(id);
const S=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const T=x=>Number(x||0).toLocaleString("fa-IR");
const api=()=>window.RVCTRL;
let role=null,records=[],month="";
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
 E("mall-user-role").textContent=enabled()?(isOwner()?"مجوز ویژه مالک رویال مال":"مجوز اختصاصی امور مالی رویال مال"):"دسترسی اختصاصی فعال نیست";
}
function reset(){role=null;records=[];E("nav-mall-payroll").classList.add("hide");}
async function load(){
 if(!enabled()){setInfo("اجازه مشاهده حقوق رویال مال برای این حساب صادر نشده است.",true);return;}
 if(!E("mall-month").value)E("mall-month").value=iranToday().slice(0,7);
 month=E("mall-month").value+"-01";
 setInfo("دریافت پرونده حقوق کارکنان پاساژ...");
 try{
   const d=await api().rpc("rvmall_payroll_list",{p_month:month});
   records=Array.isArray(d.records)?d.records:[];
   render();
   setInfo("اطلاعات حقوق پاساژ از پرونده مالی رستوران جداست. مقادیر خالی، حقوق صفر نیستند.");
 }catch(e){setInfo("خطای دریافت حقوق پاساژ: "+errorText(e),true);}
}
function render(){
 const filter=E("mall-search").value.trim();
 const visible=records.filter(x=>(x.full_name+" "+x.position_title+" "+x.unit_name).includes(filter));
 const entered=records.filter(x=>x.base_toman!==null&&x.base_toman!==undefined);
 const active=records.filter(x=>x.active);
 const base=entered.reduce((a,x)=>a+Number(x.base_toman||0),0);
 const bonus=entered.reduce((a,x)=>a+Number(x.bonus_toman||0),0);
 const deduct=entered.reduce((a,x)=>a+Number(x.deduction_toman||0),0);
 E("mall-count").textContent=T(active.length);
 E("mall-unentered").textContent=T(active.filter(x=>x.base_toman===null||x.base_toman===undefined).length);
 E("mall-base").textContent=T(base)+" تومان";
 E("mall-net").textContent=T(base+bonus-deduct)+" تومان";
 const state={draft:"پیش‌نویس",approved:"تأیید مالک",paid:"پرداخت‌شده (ثبت سیستمی)",not_entered:"ثبت‌نشده"};
 E("mall-roster").innerHTML=visible.map(x=>{
   const hasPay=x.base_toman!==null&&x.base_toman!==undefined;
   const net=hasPay?Number(x.base_toman)+Number(x.bonus_toman||0)-Number(x.deduction_toman||0):null;
   const locked=x.status==="paid";
   const status=state[x.status]||"ثبت‌نشده";
   return '<div class="card" style="margin-bottom:12px">'+
    '<div class="row"><div><b>'+S(x.full_name)+'</b><div class="mini muted">'+S(x.position_title)+' · '+S(x.unit_name)+' · '+(x.active?"فعال":"غیرفعال")+'</div></div><span class="tag">'+S(status)+'</span></div>'+
    '<div class="grid" style="margin-top:10px"><div><span class="mini muted">پایه</span><div>'+ (hasPay?T(x.base_toman)+" تومان":"تعیین نشده")+'</div></div>'+
    '<div><span class="mini muted">پاداش</span><div>'+T(x.bonus_toman)+' تومان</div></div>'+
    '<div><span class="mini muted">کسورات</span><div>'+T(x.deduction_toman)+' تومان</div></div>'+
    '<div><span class="mini muted">خالص محاسباتی</span><div>'+(net===null?"نامشخص":T(net)+" تومان")+'</div></div></div>'+
    (x.note?'<p class="mini muted">'+S(x.note)+'</p>':"")+
    '<div class="row" style="margin-top:10px;justify-content:flex-start;flex-wrap:wrap">'+
    (x.active&&!locked?'<button class="outline action" data-mall-edit="'+S(x.id)+'">ثبت/اصلاح حقوق</button>':"")+
    (isOwner()&&x.active&&x.status==="draft"&&hasPay?'<button class="action" data-mall-approve="'+S(x.id)+'">تأیید</button>':"")+
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
  const bonus=promptNumber("پاداش به تومان:",item.bonus_toman||0);if(bonus===null)return;
  const deduction=promptNumber("کسورات به تومان:",item.deduction_toman||0);if(deduction===null)return;
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
function setup(){
 E("mall-month").value=iranToday().slice(0,7);
 E("mall-month").addEventListener("change",()=>{if(enabled())load();});
 E("mall-search").addEventListener("input",render);
 E("mall-refresh").addEventListener("click",load);
 E("mall-save-person").addEventListener("click",savePerson);
 E("mall-reset-person").addEventListener("click",()=>{
 E("mall-person-id").value="";E("mall-name").value="";E("mall-position").value="";E("mall-unit").value="";E("mall-active").checked=true;
 });
}
window.MallPayroll={setup,authorize,reset,load,enabled};
})();
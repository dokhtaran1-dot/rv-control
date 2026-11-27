(function(){
"use strict";
const E=id=>document.getElementById(id);
const S=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const T=n=>Number(n??0).toLocaleString("fa-IR");
const api=()=>window.RVCTRL;
const labels={late:"تأخیر در حضور",unapproved_absence:"غیبت یا ترک محل بدون هماهنگی",refusal:"اجرا نکردن دستور کاری مجاز",conduct:"رفتار نامناسب",safety:"ایمنی و بهداشت",cash:"تخلف مالی یا صندوق",data:"اسناد و اطلاعات",other:"سایر"};
const states={reported:"ثبت اولیه",notified:"ابلاغ و رسیدگی",responded:"پاسخ کارمند ثبت شد",closed:"مختومه با بررسی مالک",dismissed:"رد گزارش توسط مالک"};
let allowed=false,board=null,filter="",unit="all",onlyPending=false;
const personKey=p=>p.unit+":"+p.id;
const isOwner=u=>u==="RV"?!!board?.owner_rv:!!board?.owner_rm;
function message(s,bad=false){const el=E("hr-info");el.textContent=s;el.classList.toggle("err",bad);}
function setup(){
 E("hr-search").addEventListener("input",v=>{filter=v.target.value.trim();render();});
 E("hr-unit").addEventListener("change",v=>{unit=v.target.value;render();});
 E("hr-refresh").addEventListener("click",load);
 E("hr-only-pending").addEventListener("change",v=>{onlyPending=v.target.checked;render();});
 E("hr-next-pending").addEventListener("click",()=>{
  if(!board)return;
  onlyPending=true;E("hr-only-pending").checked=true;render();
  const next=E("hr-people").querySelector('[data-hr-person]');
  if(next){next.scrollIntoView({behavior:"smooth",block:"start"});next.querySelector("details")?.setAttribute("open","");}
 });
 E("hr-people").addEventListener("click",e=>{
  const b=e.target.closest("button[data-hr-action]");if(b)run(b);
 });
 E("hr-incidents").addEventListener("click",e=>{
  const b=e.target.closest("button[data-hr-incident-action]");if(b)review(b);
 });
}
async function authorize(){
 allowed=false;board=null;E("nav-hr").classList.add("hide");
 try{
  const x=await api()?.rpc("rvctl_hr_board");
  if(x && Array.isArray(x.people) && x.people.length){board=x;allowed=true;}
 }catch(_){allowed=false;}
 E("nav-hr").classList.toggle("hide",!allowed);
}
function reset(){allowed=false;board=null;E("nav-hr").classList.add("hide");E("hr-people").textContent="";E("hr-incidents").textContent="";}
async function load(){
 if(!allowed){message("حساب شما هنوز به پرونده وظایف و سلسله‌مراتب متصل نیست.",true);return;}
 message("در حال دریافت فهرست وظایف و پرونده‌ها...");
 try{
   const d=await api().rpc("rvctl_hr_board");
   if(!d || !Array.isArray(d.people))throw Error("پاسخ سامانه نامعتبر است");
   board=d;render();
   message("برنامه داخلی ثبت وظایف و گزارش انضباطی است؛ امتیاز یا جریمه ثبت‌شده هیچ مبلغی را خودکار از حقوق کسر نمی‌کند.");
 }catch(e){message("خطا در بارگذاری: "+String(e?.message||"اتصال ناموفق"),true);}
}
function render(){
 if(!board)return;
 const staff=board.people||[];
 const shown=staff.filter(p=>(unit==="all"||p.unit===unit)&&(!onlyPending||!p.confirmed)&&[p.full_name,p.position,p.department,p.supervisor_name].join(" ").includes(filter));
 E("hr-count").textContent=T(staff.length)+" پرونده فعال · "+T(staff.filter(p=>p.confirmed).length)+" مورد تأیید مالک · "+T(staff.filter(p=>!p.confirmed).length)+" منتظر بررسی";
 E("hr-people").innerHTML=shown.map(p=>{
  const owner=isOwner(p.unit);
  const canReport=owner||p.is_subordinate;
  const peers=staff.filter(q=>q.unit===p.unit&&q.id!==p.id);
  const choose='<select data-hr-field="supervisor_id"><option value="">مدیر خارج از فهرست / نامشخص</option>'+
   peers.map(q=>'<option value="'+S(q.id)+'"'+(q.id===p.supervisor_id?" selected":"")+'>'+S(q.full_name)+'</option>').join("")+'</select>';
  const ownerPanel=owner?
   '<details><summary style="color:var(--gold);padding:12px">ویرایش وظایف و مرجع دستور و مرخصی</summary>'+
   '<div class="field"><label>مدیر مستقیم در همین بخش</label>'+choose+'</div>'+
   '<div class="field"><label>نام و عنوان مدیر مستقیم (قابل اصلاح توسط مالک)</label><input data-hr-field="supervisor_name" maxlength="200" value="'+S(p.supervisor_name||"")+'"></div>'+
   '<div class="field"><label>مسئول تأیید مرخصی</label><input data-hr-field="leave_approver" maxlength="200" value="'+S(p.leave_approver||"")+'"></div>'+
   '<div class="field"><label>مسیر گزارش‌دهی و حل تعارض</label><input data-hr-field="escalation" maxlength="300" value="'+S(p.escalation||"")+'"></div>'+
   '<div class="field"><label>شرح وظایف دقیق فرد</label><textarea data-hr-field="duties" maxlength="4000" rows="4">'+S(p.duties||"")+'</textarea></div>'+
   '<label><input data-hr-field="confirmed" type="checkbox"'+(p.confirmed?" checked":"")+' style="width:auto"> شرح وظایف و سلسله‌مراتب توسط مالک بررسی و تأیید شده‌اند</label>'+
   '<button class="block" data-hr-action="save" data-hr-key="'+S(personKey(p))+'">ذخیره وظایف این نفر</button></details>':"";
  const reportPanel=canReport?
   '<details><summary style="color:var(--gold);padding:12px">ثبت گزارش انضباطی و تأخیر</summary>'+
   '<p class="mini muted">گزارش فقط در پرونده این فرد ثبت می‌شود. هیچ کسر از حقوق یا صدور جریمه خودکار وجود ندارد.</p>'+
   '<div class="input-row"><div class="field"><label>نوع موضوع</label><select data-hr-field="type">'+Object.entries(labels).map(([a,b])=>'<option value="'+a+'">'+S(b)+'</option>').join("")+'</select></div>'+
   '<div class="field"><label>زمان رویداد</label><input type="datetime-local" data-hr-field="when"></div></div>'+
   '<div class="input-row"><div class="field"><label>دقیقه تأخیر، فقط برای تأخیر</label><input type="number" data-hr-field="minutes" min="1" max="1440" step="1" placeholder="مثلاً ۱۵"></div>'+
   '<div class="field"><label>مرحله تخلف از دستور کاری</label><select data-hr-field="tier"><option value="0">بدون مرحله</option><option value="1">اول · پیشنهاد ۲۰۰ هزار تومان</option><option value="2">دوم · پیشنهاد ۱ میلیون تومان</option><option value="3">سوم · پیشنهاد ۵ میلیون تومان</option></select></div></div>'+
   '<div class="field"><label>شرح دقیق واقعه (الزامی)</label><textarea data-hr-field="description" rows="2" maxlength="1500" placeholder="دستور، زمان، موضوع و توضیح واقعه"></textarea></div>'+
   '<div class="field"><label>شواهد و شماره گزارش (اختیاری)</label><textarea data-hr-field="evidence" rows="2" maxlength="1500" placeholder="شماره گزارش، شاهد، دوربین، نوبت کاری..."></textarea></div>'+
   '<button class="outline block" data-hr-action="report" data-hr-key="'+S(personKey(p))+'">ثبت گزارش برای بررسی مالک</button></details>':"";
  return '<div class="card" data-hr-person="'+S(personKey(p))+'">'+
   '<div class="row"><div><b>'+S(p.full_name)+'</b><div class="muted mini">'+S(p.unit)+' · '+S(p.position)+' · '+S(p.department)+'</div></div><span class="tag">'+(p.confirmed?"تأیید مالک":"نیازمند تأیید")+'</span></div>'+
   '<div class="mini" style="line-height:2.2">مدیر مستقیم: <b>'+S(p.supervisor_name||"تعیین نشده")+'</b> · مرخصی: <b>'+S(p.leave_approver||"تعیین نشده")+'</b></div>'+
   '<p class="mini muted">مسیر گزارش: '+S(p.escalation||"هنوز تعیین نشده")+'</p>'+
   '<p style="white-space:pre-wrap">'+S(p.duties||"شرح وظایف در انتظار ثبت")+'</p>'+
   (p.source_note?'<p class="mini muted">وضعیت منبع: '+S(p.source_note)+'</p>':"")+
   ownerPanel+reportPanel+'</div>';
 }).join("")||'<div class="card"><p class="muted">شخصی با این مشخصات در محدوده دسترسی شما یافت نشد.</p></div>';
 const incidents=(board.incidents||[]).filter(x=>unit==="all"||x.unit===unit);
 E("hr-incidents").innerHTML=incidents.map(i=>{
  const p=staff.find(x=>x.unit===i.unit&&x.id===i.person_id);
  const amount=i.reference_amount_toman===null?"":'<div class="mini">مبلغ مرجع پیشنهادی: '+T(i.reference_amount_toman)+' تومان؛ بدون کسر از حقوق</div>';
  const owner=isOwner(i.unit);
  const reply=!!p?.is_self&&["reported","notified","responded"].includes(i.status)?
   '<button class="outline action" data-hr-incident-action="reply" data-hr-id="'+S(i.id)+'">ثبت پاسخ من</button>':"";
  const reviewPanel=owner&&!["closed","dismissed"].includes(i.status)?
   '<button class="outline action" data-hr-incident-action="notified" data-hr-id="'+S(i.id)+'">ثبت ابلاغ / بررسی</button>'+
   '<button class="outline action" data-hr-incident-action="closed" data-hr-id="'+S(i.id)+'">بستن با تصمیم مالک</button>'+
   '<button class="outline action" data-hr-incident-action="dismissed" data-hr-id="'+S(i.id)+'">رد گزارش</button>':"";
  return '<div class="card"><div class="row"><div><b>'+S(p?.full_name||"کارمند")+'</b><div class="mini muted">'+S(i.unit)+' · '+S(labels[i.incident_type]||i.incident_type)+'</div></div><span class="tag">'+S(states[i.status]||i.status)+'</span></div>'+
   '<p>'+S(i.description)+'</p>'+amount+
   (i.minutes_late?'<div class="mini muted">میزان تأخیر: '+T(i.minutes_late)+' دقیقه</div>':"")+
   (i.evidence?'<div class="mini muted">مستندات: '+S(i.evidence)+'</div>':"")+
   (i.employee_reply?'<div class="mini">پاسخ کارمند: '+S(i.employee_reply)+'</div>':"")+
   (i.outcome_note?'<div class="mini muted">نتیجه بررسی: '+S(i.outcome_note)+'</div>':"")+
   '<div class="row" style="justify-content:flex-start;flex-wrap:wrap">'+reply+reviewPanel+'</div></div>';
 }).join("")||'<p class="muted">هنوز تخلف یا گزارش تأخیری ثبت نشده است.</p>';
 const catalog=(board.catalog||[]).filter(c=>unit==="all"||c.unit===unit);
 E("hr-catalog").innerHTML=catalog.map(c=>
  '<details style="border-bottom:1px solid var(--line);padding:10px"><summary><b>'+S(c.unit)+' · '+S(c.title)+'</b> <span class="mini muted">← '+S(c.reports_to)+'</span></summary><p class="muted">'+S(c.duties)+'</p></details>'
 ).join("");
}
async function run(b){
 const card=b.closest("[data-hr-person]");if(!card)return;
 const key=card.dataset.hrPerson,p=board.people.find(q=>personKey(q)===key);
 if(!p)return;
 const field=n=>card.querySelector('[data-hr-field="'+n+'"]')?.value??"";
 const action=b.dataset.hrAction;let fn,args;
 if(action==="save"){
  if(!isOwner(p.unit))return;
  fn="rvctl_hr_profile_save";
  args={p_unit:p.unit,p_person_id:p.id,p_supervisor_id:field("supervisor_id")||null,
   p_supervisor_name:field("supervisor_name").trim(),p_leave_approver:field("leave_approver").trim(),
   p_escalation:field("escalation").trim(),p_duties:field("duties").trim(),
   p_confirmed:!!card.querySelector('[data-hr-field="confirmed"]')?.checked};
  if(args.p_duties.length<10){message("شرح وظایف این نفر باید کامل نوشته شود.",true);return;}
  if(!confirm("شرح وظایف و مرجع مستقیم «"+p.full_name+"» ذخیره شود؟"))return;
 }else if(action==="report"){
  if(!isOwner(p.unit)&&!p.is_subordinate)return;
  fn="rvctl_hr_incident_report";
  const type=field("type"),tier=Number(field("tier")),minutes=field("minutes").trim();
  if((type==="refusal"&&!tier)||(type!=="refusal"&&tier!==0)){
   message("مراحل ۱ تا ۳ فقط مخصوص اجرا نکردن دستور کاری هستند؛ برای سایر موارد «بدون مرحله» انتخاب کنید.",true);return;}
  if(type==="late"&&(!minutes||Number(minutes)<1)){message("میزان دقیقه تأخیر را وارد کنید.",true);return;}
  const local=field("when");
  if(!local){message("تاریخ و ساعت رویداد را وارد کنید.",true);return;}
  const date=new Date(local);if(!Number.isFinite(date.getTime())){message("تاریخ نامعتبر است.",true);return;}
  args={p_unit:p.unit,p_person_id:p.id,p_type:type,p_when:date.toISOString(),
   p_minutes_late:type==="late"?Number(minutes):null,p_tier:type==="refusal"?tier:0,
   p_description:field("description").trim(),p_evidence:field("evidence").trim()};
  if(args.p_description.length<8){message("شرح دقیق رویداد حداقل ۸ نویسه لازم دارد.",true);return;}
  if(!confirm("فقط گزارش مستند برای «"+p.full_name+"» ثبت شود؟ هیچ مبلغی از حقوق کم نمی‌شود."))return;
 }else return;
 b.disabled=true;message("در حال ثبت...");
 try{await api().rpc(fn,args);await load();message("ثبت شد؛ هیچ تغییری در حقوق یا پرداخت انجام نشد.");}
 catch(e){message("ثبت ناموفق: "+String(e?.message||"ارتباط ناموفق"),true);}
 finally{b.disabled=false;}
}
async function review(b){
 if(!board)return;
 const x=(board.incidents||[]).find(i=>i.id===b.dataset.hrId);if(!x)return;
 const action=b.dataset.hrIncidentAction;let fn,args;
 if(action==="reply"){
  const text=prompt("پاسخ و توضیحات خودتان را درباره گزارش بنویسید:");
  if(text===null)return;
  if(text.trim().length<4){message("توضیح کوتاه است.",true);return;}
  fn="rvctl_hr_incident_reply";args={p_incident_id:x.id,p_reply:text.trim()};
 }else if(["notified","closed","dismissed"].includes(action)){
  if(!isOwner(x.unit))return;
  const note=prompt("دلیل تصمیم، تاریخ بررسی و نتیجه را مکتوب کنید:");
  if(note===null)return;
  if(note.trim().length<8){message("علت تصمیم حداقل ۸ نویسه لازم دارد.",true);return;}
  if(!confirm("وضعیت این گزارش به «"+(states[action]||action)+"» تغییر کند؟"))return;
  fn="rvctl_hr_incident_review";args={p_incident_id:x.id,p_status:action,p_outcome:note.trim()};
 }else return;
 b.disabled=true;
 try{await api().rpc(fn,args);await load();message("ثبت و در سابقه حفظ شد. حقوق و پرداخت‌ها بدون تغییرند.");}
 catch(e){message("عملیات انجام نشد: "+String(e?.message||"خطا"),true);}
 finally{b.disabled=false;}
}
window.HRControl={setup,authorize,reset,load,enabled:()=>allowed};
})();
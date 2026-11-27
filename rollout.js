(function(){
"use strict";
const E=id=>document.getElementById(id),api=()=>window.RVCTRL;
const S=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const T=n=>Number(n??0).toLocaleString("fa-IR");
let allowed=false,state=null,hr=null,bonuses=null,votesRV=null,votesRM=null;
const isOwner=unit=>unit==="RV"?!!state?.owner_rv:!!state?.owner_rm;
function msg(t,bad=false){const x=E("setup-message");x.textContent=t;x.classList.toggle("err",bad);}
function currentMonth(){
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tehran",year:"numeric",month:"2-digit"}).formatToParts(new Date());
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return p.year+"-"+p.month;
}
function setup(){
 E("setup-reload").addEventListener("click",load);
 E("setup-go-hr").addEventListener("click",()=>document.getElementById("nav-hr")?.click());
 E("setup-go-accounts").addEventListener("click",()=>document.getElementById("nav-accounts")?.click());
 E("setup-go-mall").addEventListener("click",()=>document.getElementById("nav-mall-payroll")?.click());
 E("setup-go-rm-score").addEventListener("click",()=>document.getElementById("nav-performance")?.click());
 E("setup-go-rv-score").addEventListener("click",()=>document.getElementById("nav-rv-performance")?.click());
 E("setup-bonus-unit").addEventListener("change",fillBonusPeople);
 E("setup-bonus-month").addEventListener("change",()=>loadBonusBoard());
 E("setup-bonus-save").addEventListener("click",saveBonus);
 E("setup-salary-save").addEventListener("click",saveSalary);
 E("setup-bonus-month").value=currentMonth();
 E("setup-rv-round").addEventListener("click",createRVRound);
 E("setup-lateness").addEventListener("click",loadLateness);
 E("setup-voting").addEventListener("click",e=>{
  const b=e.target.closest("button[data-vote-action]");
  if(b)voteAction(b);
 });
 E("setup-voting").addEventListener("change",e=>{
  const input=e.target.closest('input[data-vote-action="candidate"]');
  if(input)voteAction(input);
 });
 E("setup-bonus-list").addEventListener("click",e=>{
  const b=e.target.closest("button[data-bonus-decision]");
  if(b)decideBonus(b);
 });
 E("setup-rv-round-month").value=currentMonth();
}
async function authorize(){
 allowed=false;
 try{
  const s=await api()?.rpc("rvctl_setup_progress");
  if(s && (s.owner_rv||s.owner_rm)){state=s;allowed=true;}
 }catch(_){}
 E("nav-setup").classList.toggle("hide",!allowed);
}
function reset(){
 allowed=false;state=null;hr=null;bonuses=null;votesRV=null;votesRM=null;
 E("nav-setup").classList.add("hide");E("setup-voting").textContent="";
}
async function load(){
 if(!allowed){msg("این صفحه مخصوص مالک مجاز است.",true);return;}
 msg("در حال دریافت گزارش راه‌اندازی...");
 try{
  const queries=[api().rpc("rvctl_setup_progress"),api().rpc("rvctl_hr_board")];
  if(state?.owner_rv)queries.push(api().rpc("rvctl_rv_vote_admin"));
  else queries.push(Promise.resolve(null));
  if(state?.owner_rm)queries.push(api().rpc("rvmall_vote_admin"));
  else queries.push(Promise.resolve(null));
  const d=await Promise.all(queries);
  state=d[0];hr=d[1];votesRV=d[2];votesRM=d[3];
  await loadBonusBoard(false);
  render();
  msg("نسخه اجرایی آماده ورود داده و تأیید مالک است. هیچ امتیاز یا مبلغی به طور خودکار ثبت یا پرداخت نمی‌شود.");
 }catch(e){msg("بارگیری کامل نشد: "+String(e?.message||"خطای ارتباط"),true);}
}
function render(){
 if(!state||!hr)return;
 const ownerBoth=state.owner_rv&&state.owner_rm;
 const missing=Array.isArray(state.rv_missing_salary)?state.rv_missing_salary:[];
 const stepText=[
  ["چارت و شرح وظایف",T(state.hr_unconfirmed)+" پرونده منتظر تأیید شخصی مالک"],
  ["حساب‌های کارکنان","RV "+T(state.rv_linked_accounts||0)+" از "+T(state.rv_staff||0)+" · RM "+T(state.rm_linked_accounts||0)+" از "+T(state.rm_staff||0)],
  ["پاداش‌ها","پیشنویس: "+T(state.bonus_drafts)+" · تأییدشده: "+T(state.bonus_approved)],
  ["رأی‌گیری مشتریان","نامزد RV: "+T(state.rv_voting_candidates)+" · نامزد RM: "+T(state.rm_voting_candidates)],
  ["امتیازدهی ماهانه","RV "+T(state.rv_scores)+" ثبت · RM "+T(state.rm_scores)+" ثبت"],
  ["تأخیر و انضباط",T(state.incident_reports)+" گزارش مستند"],
  ["حقوق و فیش","RV "+T(missing.length)+" مبلغ نامشخص؛ دوره RM مستقل از حقوق ماهانه"]
 ];
 E("setup-steps").innerHTML=stepText.map((p,i)=>
  '<div class="row"><b>'+T(i+1)+'. '+S(p[0])+'</b><span class="muted mini">'+S(p[1])+'</span></div>'
 ).join("");
 E("setup-owner-note").textContent=(ownerBoth?"مالک RV و RM":"محدود به بخش دارای مجوز")+
  " · ثبت و تأیید نهایی هر مورد صرفاً با حساب مالک · هیچ برداشت یا انتقال وجهی انجام نمی‌شود.";
 E("setup-salary-section").classList.toggle("hide",!state.owner_rv);
 E("setup-salary-missing").textContent=missing.length?
   T(missing.length)+" حقوق ماهانه RV هنوز عدد تأییدشده ندارد. صفر محسوب نمی‌شوند.":
   "حقوق پایه تمام کارکنان فعال RV ثبت شده است.";
 const old=E("setup-salary-person").value;
 E("setup-salary-person").innerHTML='<option value="">انتخاب نفر برای تعیین حقوق</option>'+missing.map(p=>'<option value="'+S(p.id)+'">'+S(p.name)+'</option>').join("");
 if(missing.some(p=>p.id===old))E("setup-salary-person").value=old;
 E("setup-bonus-unit").querySelector('option[value="RV"]').disabled=!state.owner_rv;
 E("setup-bonus-unit").querySelector('option[value="RM"]').disabled=!state.owner_rm;
 if(!isOwner(E("setup-bonus-unit").value))E("setup-bonus-unit").value=state.owner_rv?"RV":"RM";
 fillBonusPeople();
 renderBonuses();
 renderVotes();
}
function fillBonusPeople(){
 const unit=E("setup-bonus-unit").value;
 const select=E("setup-bonus-person");
 const previous=select.value;
 const people=Array.isArray(hr?.people)?hr.people.filter(p=>p.unit===unit&&p.full_name):[];
 select.innerHTML='<option value="">کارمند را انتخاب کنید</option>'+people.map(p=>
 '<option value="'+S(p.id)+'">'+S(p.full_name)+' · '+S(p.position)+'</option>').join("");
 if(people.some(p=>p.id===previous))select.value=previous;
}
async function loadBonusBoard(show=true){
 if(!state)return;
 try{
  const v=await api().rpc("rvctl_bonus_board",{p_month:(E("setup-bonus-month").value||currentMonth())+"-01"});
  bonuses=v;
  if(show)renderBonuses();
 }catch(e){if(show)msg("گزارش پاداش: "+String(e?.message||"خطا"),true);}
}
function renderBonuses(){
 const arr=bonuses?.records||[];
 E("setup-bonus-list").innerHTML=arr.map(b=>{
  const st={draft:"پیشنویس",approved:"تصویب مالک",rejected:"ردشده"}[b.status]||b.status;
  const kind={owner:"پاداش مالک",management:"پاداش مدیریت",customer_vote:"پاداش برگزیده مشتریان"}[b.kind]||b.kind;
  return '<div class="card"><div class="row"><div><b>'+S(b.name||"کارمند")+' · '+S(b.unit)+'</b><div class="mini muted">'+S(kind)+' · '+S(b.reason)+'</div></div><span class="tag">'+S(st)+'</span></div>'+
  '<div style="color:var(--gold)">'+T(b.amount_toman)+' تومان</div>'+
  (b.status==="draft"?'<button class="action" data-bonus-decision="approved" data-bonus-id="'+S(b.id)+'">تأیید پاداش</button> <button class="outline action" data-bonus-decision="rejected" data-bonus-id="'+S(b.id)+'">رد پیشنهاد</button>':"")+
  (b.decision_note?'<p class="mini muted">نظر مالک: '+S(b.decision_note)+'</p>':"")+'</div>';
 }).join("")||'<p class="muted">برای این ماه، پاداشی ثبت نشده است. پاداش‌ها بدون ثبت مبلغ، خودکار محاسبه نمی‌شوند.</p>';
}
async function saveBonus(){
 const unit=E("setup-bonus-unit").value,person=E("setup-bonus-person").value;
 const kind=E("setup-bonus-kind").value, month=E("setup-bonus-month").value;
 const amount=Number(E("setup-bonus-amount").value),reason=E("setup-bonus-reason").value.trim();
 if(!isOwner(unit)||!person||!/^\d{4}-\d{2}$/.test(month)||!Number.isSafeInteger(amount)||amount<=0||reason.length<8){
  msg("بخش، کارمند، ماه، مبلغ مثبت به تومان و دلیل حداقل ۸ حرف را تکمیل کنید.",true);return;
 }
 const personName=(hr?.people||[]).find(x=>x.unit===unit&&x.id===person)?.full_name||"کارمند";
 if(!confirm("پاداش "+T(amount)+" تومان برای «"+personName+"» فقط به‌صورت پیشنویس ثبت شود؟"))return;
 const b=E("setup-bonus-save");b.disabled=true;
 try{
  await api().rpc("rvctl_bonus_save",{p_unit:unit,p_person_id:person,p_month:month+"-01",
     p_kind:kind,p_amount:amount,p_reason:reason});
  E("setup-bonus-amount").value="";E("setup-bonus-reason").value="";
  await load();msg("پیشنویس پاداش ثبت شد؛ برای تصویب نهایی دکمه جداگانه آن را بزنید. هیچ پولی منتقل نشده است.");
 }catch(e){msg("ثبت پاداش ناموفق: "+String(e?.message||"خطا"),true);}
 finally{b.disabled=false;}
}
async function decideBonus(button){
 const id=button.dataset.bonusId,action=button.dataset.bonusDecision;
 const rec=(bonuses?.records||[]).find(x=>x.id===id);if(!rec||rec.status!=="draft")return;
 const note=prompt("دلیل تصمیم نهایی خودت را درباره این پاداش بنویس:");
 if(note===null)return;
 if(note.trim().length<8){msg("دلیل تصمیم حداقل ۸ نویسه لازم دارد.",true);return;}
 if(!confirm((action==="approved"?"تأیید":"رد")+" پاداش "+T(rec.amount_toman)+" تومان برای «"+rec.name+"»؟ ثبت پاداش انتقال وجه بانکی نیست."))return;
 button.disabled=true;
 try{await api().rpc("rvctl_bonus_decide",{p_bonus_id:id,p_action:action,p_note:note.trim()});
 await load();msg("تصمیم مالک ثبت شد؛ فقط در سابقه پاداش‌ها و فیش شخصی نشان داده می‌شود. پرداخت بانکی انجام نشده است.");
 }catch(e){msg("تصمیم ثبت نشد: "+String(e?.message||"خطا"),true);}
 finally{button.disabled=false;}
}
async function saveSalary(){
 const id=E("setup-salary-person").value;
 const amount=Number(E("setup-salary-amount").value);
 const reason=E("setup-salary-reason").value.trim();
 const person=(state?.rv_missing_salary||[]).find(x=>x.id===id);
 if(!person||!Number.isSafeInteger(amount)||amount<=0||reason.length<8){
  msg("نفر، عدد حقوق واقعی به تومان و دلیل ثبت را تکمیل کن.",true);return;}
 if(!confirm("حقوق ماهانه «"+person.name+"» برابر "+T(amount)+" تومان ثبت شود؟ فقط ثبت در سامانه است، نه پرداخت."))return;
 const b=E("setup-salary-save");b.disabled=true;
 try{
  await api().rpc("rvctl_owner_salary_set",{p_staff_id:id,p_monthly_toman:amount,p_reason:reason});
  E("setup-salary-amount").value="";E("setup-salary-reason").value="";
  await load();msg("حقوق واقعی ثبت شد و سابقه تغییرات محفوظ ماند. انتقال وجه انجام نشد.");
 }catch(e){msg("حقوق ثبت نشد: "+String(e?.message||"خطا"),true);}
 finally{b.disabled=false;}
}
function renderVotePart(unit,d){
 const id=unit==="RV"?"rv":"rm",items=unit==="RV"?(d?.people||[]):(d?.employees||[]);
 const r=d?.round,issued=d?.codes?.issued||0,used=d?.codes?.used||0;
 const status=r?(r.finalized_at?"پایان‌یافته":"دوره: "+r.label):"هیچ دوره‌ای ساخته نشده";
 const heading='<div class="row"><b>رأی‌گیری '+unit+'</b><span class="tag">'+S(status)+'</span></div>';
 const people=items.map(x=>'<div class="row"><span>'+S(x.name)+'</span><label style="color:var(--gold)"><input type="checkbox" style="width:auto" data-vote-action="candidate" data-unit="'+id+'" data-person="'+S(x.id)+'" '+(x.enabled?"checked":"")+'> نامزد</label></div>').join("");
 const controls=r?'<p class="mini muted">برگه‌های رأی صادرشده: '+T(issued)+' · استفاده‌شده: '+T(used)+'</p>'+
 '<div class="input-row"><div class="field"><label>تعداد کد یک‌بارمصرف</label><input type="number" id="setup-'+id+'-code-count" value="5" min="1" max="30"></div>'+
 '<button data-vote-action="issue" data-unit="'+id+'" class="outline action">صدور کد رأی</button></div>'+
 '<button class="outline action" data-vote-action="finalize" data-unit="'+id+'">نهایی‌سازی پس از پایان رأی‌گیری</button>':"";
 return '<div class="card">'+heading+'<p class="muted mini">فقط پس از انتخاب نامزد و صدور کد، مشتری می‌تواند یک رأی معتبر ثبت کند.</p>'+people+controls+
 '<div id="setup-'+id+'-codes"></div></div>';
}
function renderVotes(){
 E("setup-voting").innerHTML=(state?.owner_rv?renderVotePart("RV",votesRV):"")+
 (state?.owner_rm?renderVotePart("RM",votesRM):"");
 E("setup-rv-round-card").classList.toggle("hide",!state?.owner_rv||!!votesRV?.round&&!votesRV.round.finalized_at);
}
async function voteAction(b){
 const u=b.dataset.unit,action=b.dataset.voteAction,rv=u==="rv";
 if(!["rv","rm"].includes(u)||!isOwner(rv?"RV":"RM"))return;
 let fn,args;
 if(action==="candidate"){
  const isChecked=b.checked;
  if(isChecked&&!confirm("نام این کارمند به‌صورت عمومی در فهرست نامزدهای رأی‌گیری "+(rv?"RV":"RM")+" نمایش داده شود؟")){b.checked=false;return;}
  fn=rv?"rvctl_rv_vote_candidate_set":"rvmall_vote_candidate_set";
  args=rv?{p_staff_id:b.dataset.person,p_enabled:isChecked}:{p_person_id:b.dataset.person,p_enabled:isChecked};
 }else if(action==="issue"){
  const n=Number(E("setup-"+u+"-code-count").value);
  if(!Number.isSafeInteger(n)||n<1||n>30){msg("تعداد کد بین ۱ تا ۳۰ باشد.",true);return;}
  if(!confirm("تعداد "+T(n)+" کد رأی یک‌بارمصرف برای مشتریان صادر شود؟"))return;
  fn=rv?"rvctl_rv_vote_issue":"rvmall_vote_issue";args={p_count:n};
 }else if(action==="finalize"){
  const round=rv?votesRV?.round:votesRM?.round;
  if(!round?.id)return;
  if(!confirm("آیا دوره تمام شده و می‌خواهی نتیجه رأی‌گیری "+(rv?"RV":"RM")+" قطعی شود؟ پاداش خودکار پرداخت نمی‌شود."))return;
  fn=rv?"rvctl_rv_vote_finalize":"rvmall_vote_finalize";args={p_round_id:round.id};
 }else return;
 b.disabled=true;
 try{
  const data=await api().rpc(fn,args);
  await load();
  if(action==="issue"){
   const codes=(data?.codes||[]).join("\n");
   E("setup-"+u+"-codes").innerHTML='<p class="mini muted">کدها را همین حالا نزد خودت نگه دار؛ بعداً دوباره نمایش داده نمی‌شوند.</p>'+
    '<textarea readonly dir="ltr" rows="6">'+S(codes)+'</textarea>'+
    '<p class="mini">لینک مشتری: https://dokhtaran1-dot.github.io/rv-control/vote.html</p>';
   msg("کدهای یک‌بارمصرف صادر شدند. فقط همین یک‌بار نشان داده شده‌اند.");
  }else if(action==="finalize"){
   msg("نتیجه نهایی شد. برای اعطای یک حقوق اضافه، پیشنهاد پاداش برنده را جداگانه در بخش پاداش ثبت و تأیید کن.");
  }else msg("وضعیت نامزد ذخیره شد. هیچ مبلغی تغییر نکرده است.");
 }catch(e){msg("عملیات رأی‌گیری انجام نشد: "+String(e?.message||"خطا"),true);}
 finally{b.disabled=false;}
}
async function createRVRound(){
 if(!state?.owner_rv)return;
 const label=E("setup-rv-round-label").value.trim(),start=E("setup-rv-round-start").value,end=E("setup-rv-round-end").value;
 const month=E("setup-rv-round-month").value;
 if(label.length<3||!start||!end||!/^\d{4}-\d{2}$/.test(month)){msg("نام دوره، آغاز، پایان و ماه پاداش را وارد کن.",true);return;}
 const startDate=new Date(start),endDate=new Date(end);
 if(!Number.isFinite(startDate.valueOf())||!Number.isFinite(endDate.valueOf())||endDate<=startDate){
 msg("بازه زمانی معتبر نیست.",true);return;}
 if(!confirm("دوره رأی‌گیری RV با این تاریخ‌ها ایجاد شود؟ تا وقتی نامزد و کد صادر نشده، رأیی ثبت نمی‌شود."))return;
 const b=E("setup-rv-round");b.disabled=true;
 try{
  await api().rpc("rvctl_rv_vote_round_create",{
   p_label:label,p_start:startDate.toISOString(),p_end:endDate.toISOString(),p_payroll_month:month+"-01"});
  await load();msg("دوره RV ایجاد شد. حالا نامزدها را انتخاب کن و کدهای مشتری صادر کن.");
 }catch(e){msg("دوره ساخته نشد: "+String(e?.message||"خطا"),true);}
 finally{b.disabled=false;}
}
async function loadLateness(){
 if(!state?.owner_rv){msg("بررسی QR فقط برای مالک RV فعال است.",true);return;}
 const b=E("setup-lateness");b.disabled=true;
 try{
  const d=await api().rpc("rvctl_rv_attendance_lateness_preview",{p_days:14});
  const rows=d.rows||[];
  E("setup-lateness-result").innerHTML=rows.length?rows.map(x=>{
   const when=new Date(x.scheduled_at).toLocaleString("fa-IR",{timeZone:"Asia/Tehran"});
   const status=x.needs_review?"اسکن QR پیدا نشد؛ غیبت قطعی نیست":x.minutes_late>0?
    "تأخیر "+T(x.minutes_late)+" دقیقه":"به‌موقع/زودتر";
   return '<div class="row"><div><b>'+S(x.name)+'</b><div class="mini muted">'+S(when)+'</div></div><span class="tag">'+S(status)+'</span></div>';
  }).join(""):'<p class="muted">در این بازه شیفت تکمیل‌شده‌ای برای محاسبه یافت نشد.</p>';
  msg("گزارش تطبیق QR و شیفت فقط برای بررسی است. هیچ تأخیر یا جریمه‌ای خودکار ثبت نشد.");
 }catch(e){msg("گزارش تأخیر دریافت نشد: "+String(e?.message||"خطا"),true);}
 finally{b.disabled=false;}
}
window.Rollout={setup,authorize,reset,load,enabled:()=>allowed};
})();
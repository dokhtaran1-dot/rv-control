(function(){
"use strict";
const E=id=>document.getElementById(id);
const S=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const api=()=>window.RVCTRL;
let role=null,rows=[],month="";
function info(message,bad=false){const e=E("p-message");e.textContent=message;e.classList.toggle("err",bad);}
function err(e){return String(e?.message||"خطا در ارتباط با سامانه");}
function periodDefault(){
 const p=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tehran",year:"numeric",month:"2-digit"}).formatToParts(new Date());
 const o=Object.fromEntries(p.map(x=>[x.type,x.value]));
 const year=Number(o.year),month=Number(o.month);
 // Start the first full trial month after the November setup.
 return year===2026&&month===11?"2026-12":year+"-"+String(month).padStart(2,"0");
}
function enabled(){return ["owner","manager","employee"].includes(role);}
async function authorize(){
 role=null;
 try{role=await api().rpc("rvmall_performance_role");}
 catch(_){role=null;}
 E("nav-performance").classList.toggle("hide",!enabled());
}
function reset(){role=null;rows=[];E("nav-performance").classList.add("hide");E("p-list").textContent="";}
async function load(){
 if(!enabled()){info("دسترسی ارزیابی فقط برای کارکنان و مدیران مجاز فعال است.",true);return;}
 const selected=E("p-month").value;
 if(!/^\d{4}-\d{2}$/.test(selected)){info("ماه معتبر انتخاب کنید.",true);return;}
 month=selected+"-01";
 info("در حال دریافت ارزیابی‌ها...");
 try{
  const d=await api().rpc("rvmall_performance_board",{p_month:month});
  rows=Array.isArray(d.records)?d.records:[];
  render();
  info("طرح آزمایشی: ثبت امتیاز، حقوق پایه، پاداش، رأی مشتریان یا وضعیت پرداخت را تغییر نمی‌دهد.");
 }catch(e){rows=[];E("p-list").textContent="";info("دریافت ارزیابی ممکن نشد: "+err(e),true);}
}
function makeSelect(key,id,value){
 const option=rows.filter(r=>r.person_id!==id)
  .map(r=>'<option value="'+S(r.person_id)+'"'+(r.person_id===value?" selected":"")+'>'+S(r.full_name)+'</option>').join("");
 return '<select data-p-field="'+key+'"><option value="">هنوز تعیین نشده</option>'+option+'</select>';
}
function scoreInput(name,label,max,existing){
 const value=existing===null||existing===undefined?"":String(existing);
 return '<div class="field"><label>'+label+' · از '+max+'</label>'+
 '<input type="number" data-p-field="'+name+'" min="0" max="'+max+'" step="1" inputmode="numeric" value="'+S(value)+'" placeholder="امتیاز"></div>';
}
function render(){
 const own=role==="owner",scored=rows.filter(r=>r.status==="draft"||r.status==="approved").length;
 E("p-summary").textContent=(own?"کارکنان فعال: "+rows.length+" · ":"")+
 "ارزیابی ثبت‌شده: "+scored+" · تأیید نهایی: "+rows.filter(r=>r.status==="approved").length+
 (role==="manager"?" · شما فقط نیروهای زیرمجموعه خود را ارزیابی می‌کنید.":"");
 E("p-list").innerHTML=rows.map(r=>{
  const manager=r.manager_name||"تعیین نشده",leave=r.leave_approver_name||"تعیین نشده";
  const status={draft:"پیش‌نویس · منتظر تأیید مالک",approved:"تأیید نهایی مالک",pending:"هنوز منتشر نشده",unscored:"هنوز امتیاز ثبت نشده"}[r.status]||"ثبت نشده";
  const canScore=!!r.can_score;
  const score=r.total_score===null||r.total_score===undefined?"—":Number(r.total_score).toLocaleString("fa-IR")+" از ۱۰۰";
  const assignment=own?
    '<div style="border-top:1px solid #ddd;padding-top:12px;margin-top:12px"><h3>وظایف و سلسله‌مراتب</h3>'+
    '<div class="input-row"><div class="field"><label>مدیر مستقیم</label>'+makeSelect("manager",r.person_id,r.manager_person_id)+'</div>'+
    '<div class="field"><label>مسئول تأیید مرخصی</label>'+makeSelect("leave",r.person_id,r.leave_approver_person_id)+'</div></div>'+
    '<div class="field"><label>شرح وظایف اختصاصی</label><textarea maxlength="2000" rows="3" data-p-field="duties">'+S(r.duties||"")+'</textarea></div>'+
    '<button class="outline action" data-p-action="assignment">ذخیره مسئولیت‌ها</button></div>':"";
  const scorePanel=canScore?
    '<div style="border-top:1px solid #ddd;padding-top:12px;margin-top:12px"><h3>ارزیابی ماهانه مدیر</h3>'+
    '<div class="grid">'+
      scoreInput("responsibility","انجام وظایف و دستورهای کاری مجاز",40,r.responsibility)+
      scoreInput("attendance","نظم و وقت‌شناسی",20,r.attendance)+
      scoreInput("customer","رضایت مشتری و بازخورد",20,r.customer)+
      scoreInput("teamwork","همکاری، رفتار و کیفیت کار",20,r.teamwork)+
    '</div>'+
    '<div class="field"><label>شرح مستند ارزیابی (الزامی)</label><textarea maxlength="1000" rows="2" data-p-field="evidence" placeholder="مشاهدات کاری و شواهد ارزیابی">'+S(r.evidence||"")+'</textarea></div>'+
    (r.status!=="approved"?'<button class="action" data-p-action="score">ذخیره امتیاز به‌عنوان پیش‌نویس</button>':'<p class="muted mini">امتیاز تأیید شده و برای ویرایش باید مالک آن را باز کند.</p>')+
    (own&&r.status==="draft"?'<button class="outline action" data-p-action="approve">تأیید نهایی امتیاز</button>':"")+
    (own&&r.status==="approved"?'<button class="outline action" data-p-action="reopen">بازکردن ارزیابی برای اصلاح</button>':"")+
    '</div>':"";
  return '<div class="card" data-p-person="'+S(r.person_id)+'" style="margin:12px 0">'+
    '<div class="row"><div><b>'+S(r.full_name)+'</b><div class="mini muted">'+S(r.position_title)+' · '+S(r.unit_name)+'</div></div><span class="tag">'+S(score)+'</span></div>'+
    '<div class="mini" style="line-height:2">مدیر مستقیم: <b>'+S(manager)+'</b> · مرخصی با تأیید: <b>'+S(leave)+'</b></div>'+
    '<p class="mini muted">وظایف: '+S(r.duties||"هنوز توسط مالک تعیین نشده")+'</p>'+
    '<p class="mini muted">وضعیت: '+S(status)+'</p>'+
    (r.status==="approved"||canScore?
       '<p class="mini muted">اجزای امتیاز: '+[r.responsibility,r.attendance,r.customer,r.teamwork].map(v=>v??"—").join(" / ")+' (از ۴۰ / ۲۰ / ۲۰ / ۲۰)</p>':"")+
    ((r.status==="approved"||canScore)&&r.evidence?'<p class="mini muted">توضیح: '+S(r.evidence)+'</p>':"")+
    assignment+scorePanel+'</div>';
 }).join("")||'<div class="card"><p class="muted">برای این حساب هنوز پرونده ارزیابی قابل نمایش نیست. مدیر مستقیم باید توسط مالک تعیین شود.</p></div>';
}
async function run(button){
 const action=button.dataset.pAction;
 const card=button.closest("[data-p-person]");
 if(!card)return;
 const personId=card.dataset.pPerson;
 const record=rows.find(r=>r.person_id===personId);
 if(!record)return;
 const field=name=>card.querySelector('[data-p-field="'+name+'"]')?.value??"";
 let rpcName="",args={};
 if(action==="assignment"){
  if(role!=="owner")return;
  rpcName="rvmall_performance_assign";
  args={p_person_id:personId,p_manager_id:field("manager")||null,
        p_leave_approver_id:field("leave")||null,p_duties:field("duties")};
 }else if(action==="score"){
  if(!record.can_score)return;
  const names=["responsibility","attendance","customer","teamwork"];
  if(names.some(n=>field(n).trim()==="")){info("برای هر چهار معیار، امتیاز وارد کنید.",true);return;}
  const points=names.map(n=>Number(field(n)));
  if(points.some((n,i)=>!Number.isInteger(n)||n<0||n>[40,20,20,20][i])){
    info("مقادیر باید عدد صحیح و در محدوده هر معیار باشند.",true);return;
  }
  const evidence=field("evidence").trim();
  if(evidence.length<8){info("دلیل و شواهد ارزیابی را با حداقل ۸ نویسه بنویسید.",true);return;}
  if(!confirm("امتیاز "+points.reduce((a,b)=>a+b,0)+" از ۱۰۰ برای «"+record.full_name+"» فقط به‌صورت پیش‌نویس ثبت شود؟"))return;
  rpcName="rvmall_performance_score_save";
  args={p_person_id:personId,p_month:month,p_responsibility:points[0],p_attendance:points[1],
    p_customer:points[2],p_teamwork:points[3],p_evidence:evidence};
 }else if(action==="approve"||action==="reopen"){
  if(role!=="owner")return;
  const question=action==="approve"?"امتیاز «"+record.full_name+"» نهایی و برای او قابل مشاهده شود؟":
                                      "ارزیابی «"+record.full_name+"» برای اصلاح باز شود؟";
  if(!confirm(question))return;
  rpcName="rvmall_performance_review";
  args={p_person_id:personId,p_month:month,p_action:action};
 }else return;
 button.disabled=true;info("در حال ذخیره تغییر...");
 try{
  await api().rpc(rpcName,args);
  await load();
  info("ثبت شد. حقوق پایه، پرداخت، کسورات و پاداش‌ها بدون تغییر باقی ماندند.");
 }catch(e){info("ذخیره انجام نشد: "+err(e),true);}
 finally{button.disabled=false;}
}
function setup(){
 E("p-month").value=periodDefault();
 E("p-month").addEventListener("change",()=>{if(enabled())load();});
 E("p-refresh").addEventListener("click",load);
 E("p-list").addEventListener("click",e=>{
  const button=e.target.closest("button[data-p-action]");
  if(button)run(button);
 });
}
window.MallPerformance={setup,authorize,reset,load,enabled};
})();
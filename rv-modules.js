(function(){
"use strict";
// RV CONTROL operational screens. Uses the existing authenticated RV-specific Supabase client.
// No payroll, attendance, or financial data is bundled in public source.
const E=id=>document.getElementById(id);
const A=()=>window.RVCTRL;
const escape=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const money=v=>Number(v||0).toLocaleString("fa-IR");
const manager=()=>["owner","executive","manager"].includes(A()?.role());
const owner=()=>A()?.role()==="owner";
const accountsAllowed=()=>owner();
const financeAllowed=()=>["owner","executive","manager","accountant","auditor"].includes(A()?.role());
const payrollAllowed=()=>["owner","accountant","auditor"].includes(A()?.role());
const stockAllowed=()=>["owner","stock"].includes(A()?.role());
const stockVisible=()=>["owner","executive","manager","stock","procurement","accountant","auditor","chef"].includes(A()?.role());
function iranDate(offset=0){
 const d=new Date(Date.now()+offset*86400000);
 const items=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Tehran",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d);
 const x=Object.fromEntries(items.map(z=>[z.type,z.value]));
 return x.year+"-"+x.month+"-"+x.day;
}
function status(id,value,bad=false){const e=E(id);if(e){e.textContent=value;e.classList.toggle("err",bad);}}
function banner(s,bad=false){A()?.msg(s,bad);}
function safeErr(e){return String(e?.message||"خطا در ارتباط با پایگاه داده");}
function handle(name,fn){const e=E(name);if(e)e.addEventListener("click",async()=>{e.disabled=true;try{await fn();}catch(error){banner(safeErr(error),true);}finally{e.disabled=false;}});}
async function personnel(activeOnly=true){
 const r=await A().db().from("rvctl_staff").select("id,full_name,department,job_title,active").order("full_name");
 if(r.error)throw r.error;
 return (r.data||[]).filter(x=>x.department!=="رویال مال"&&(!activeOnly||x.active));
}
function options(records){return records.map(s=>'<option value="'+escape(s.id)+'">'+escape(s.full_name)+' · '+escape(s.job_title)+'</option>').join("");}
async function fillSelect(id,includeInactive=false){
 const list=await personnel(!includeInactive);
 if(E(id)){const previous=E(id).value;E(id).innerHTML=options(list);if(list.some(x=>x.id===previous))E(id).value=previous;}
}
async function shifts(){
 status("shiftMsg","در حال خواندن شیفت‌ها...");
 try{
   const isMgr=["owner","executive","manager","auditor"].includes(A().role());
   if(manager())await fillSelect("shiftStaff");
   const data=isMgr?
      await A().rpc("rvctl_shift_list",{p_from:iranDate(),p_to:iranDate(13)}):
      await A().rpc("rvctl_my_shifts",{p_days:14});
   const rows=data.records||[];
   E("shiftList").innerHTML=rows.map(s=>{
     const cancellable=manager()&&s.status==="scheduled"&&s.id;
     return '<div class="row"><div><b>'+escape(s.full_name||"شیفت شما")+'</b><div class="muted mini">'+escape(s.department)+' · '+escape(s.job_title||"")+'</div><div class="muted mini">'+escape(s.shift_date)+' · '+escape(String(s.starts_at).slice(0,5))+' تا '+escape(String(s.ends_at).slice(0,5))+'</div>'+(s.shift_note?'<div class="mini muted">'+escape(s.shift_note)+'</div>':"")+'</div><div><span class="tag">'+(s.status==="scheduled"?"برنامه‌ریزی‌شده":s.status==="cancelled"?"لغوشده":escape(s.status))+'</span>'+(cancellable?'<button class="outline action" data-cancel-shift="'+escape(s.id)+'">لغو</button>':"")+'</div></div>';
   }).join("")||'<p class="muted">برای ۱۴ روز آینده شیفتی ثبت نشده است.</p>';
   document.querySelectorAll("[data-cancel-shift]").forEach(b=>b.onclick=async()=>{
     const reason=prompt("دلیل لغو شیفت (حداقل ۵ حرف):");
     if(reason===null)return;
     if(reason.trim().length<5){banner("دلیل لغو کامل نیست.",true);return;}
     b.disabled=true;
     try{await A().rpc("rvctl_shift_cancel",{p_shift_id:b.dataset.cancelShift,p_reason:reason.trim()});banner("لغو شیفت ثبت و در سوابق نگهداری شد.");await shifts();}
     catch(e){banner(safeErr(e),true);b.disabled=false;}
   });
   status("shiftMsg","برنامه ۱۴ روز آینده بر اساس تاریخ ایران نمایش داده می‌شود.");
 }catch(e){status("shiftMsg","خطای دریافت شیفت: "+safeErr(e),true);}
}
async function saveShift(){
 if(!manager())throw Error("فقط مدیر مجاز است.");
 const sid=E("shiftStaff").value,dt=E("shiftDate").value,from=E("shiftStart").value,to=E("shiftEnd").value;
 const dept=E("shiftDepartment").value.trim(),note=E("shiftNote").value.trim();
 if(!sid||!dt||!from||!to||!dept)throw Error("کارمند، تاریخ، ساعت و واحد را کامل کن.");
 await A().rpc("rvctl_shift_create",{p_staff_id:sid,p_shift_date:dt,p_starts_at:from,p_ends_at:to,p_department:dept,p_note:note});
 E("shiftNote").value="";
 banner("شیفت در سامانه مستقل RV ثبت شد.");await shifts();
}
async function reports(){
 status("financeMsg","در حال بارگیری گزارش‌های ثبت‌شده...");
 try{
   const d=await A().rpc("rvctl_report_summary",{p_days:14});
   const days=d.days||[], costs=d.costs||[];
   const tSales=days.reduce((v,x)=>v+Number(x.total_sales||0),0);
   const tCost=days.reduce((v,x)=>v+Number(x.costs||0),0);
   E("financeTotal").textContent=money(tSales)+" تومان";
   E("financeCosts").textContent=money(tCost)+" تومان";
   E("financeDifference").textContent=money(tSales-tCost)+" تومان";
   const entered=days.filter(x=>x.entered||Number(x.costs)>0);
   E("financeList").innerHTML=entered.map(x=>'<div class="row"><b>'+escape(x.business_day)+'</b><div class="mini">فروش: '+money(x.total_sales)+' | هزینه ثبت‌شده: '+money(x.costs)+' تومان'+(x.entered?"":" · فروش ثبت نشده")+'</div></div>').join("")||'<p class="muted">هنوز گزارش مالی واقعی ثبت نشده است.</p>';
   E("costList").innerHTML=costs.map(x=>'<div class="row"><div><b>'+escape(x.title)+'</b><div class="mini muted">'+escape(x.business_day)+' · '+escape(x.category)+'</div><div class="mini">'+money(x.amount)+' تومان '+(x.status==="void"?"(برگشت شده)":"")+'</div></div>'+(owner()&&x.status==="posted"?'<button class="outline action" data-void-cost="'+escape(x.id)+'">اصلاح/برگشت</button>':"")+'</div>').join("")||'<p class="muted">هنوز هزینه‌ای ثبت نشده است.</p>';
   document.querySelectorAll("[data-void-cost]").forEach(b=>b.onclick=async()=>{
     const reason=prompt("دلیل اصلاح هزینه را بنویس (حداقل ۸ حرف):");if(reason===null)return;
     if(reason.trim().length<8){banner("دلیل کافی نیست.",true);return;}
     b.disabled=true;try{await A().rpc("rvctl_report_void_cost",{p_id:b.dataset.voidCost,p_reason:reason});banner("هزینه با حفظ سابقه برگشت شد.");await reports();}
     catch(e){banner(safeErr(e),true);b.disabled=false;}
   });
   status("financeMsg","مبالغ بر حسب تومان‌اند. اختلاف نمایش‌داده‌شده سود خالص نیست؛ هزینه‌های ثبت‌نشده لحاظ نشده‌اند.");
 }catch(e){status("financeMsg","خطای گزارش: "+safeErr(e),true);}
}
async function saveSales(){
 if(!["owner","executive","manager","accountant"].includes(A().role()))throw Error("مجوز ثبت فروش ندارید.");
 const names=["salesCash","salesCard","salesOnline","salesOther"];
 const values=names.map(n=>Number(E(n).value||0));
 if(values.some(v=>!Number.isFinite(v)||v<0))throw Error("مبلغ‌ها باید معتبر و مثبت باشند.");
 await A().rpc("rvctl_report_save",{p_day:E("salesDay").value,p_cash:values[0],p_card:values[1],p_online:values[2],p_other:values[3],p_note:E("salesNote").value.trim()});
 banner("گزارش فروش با سابقه تغییرات ثبت شد.");await reports();
}
async function addCost(){
 if(!["owner","executive","manager","accountant"].includes(A().role()))throw Error("مجوز ثبت هزینه ندارید.");
 const title=E("costTitle").value.trim(),amount=Number(E("costAmount").value);
 if(title.length<2||!Number.isFinite(amount)||amount<=0)throw Error("عنوان و مبلغ هزینه نامعتبر است.");
 await A().rpc("rvctl_report_add_cost",{p_day:E("costDay").value,p_title:title,p_category:E("costCategory").value,p_amount:amount,p_note:E("costNote").value.trim()});
 E("costTitle").value="";E("costAmount").value="";E("costNote").value="";
 banner("هزینه ثبت شد؛ امکان برگشت با دلیل فقط برای مالک وجود دارد.");await reports();
}
async function inventory(){
 status("inventoryMsg","در حال دریافت گردش انبار...");
 try{
   const d=await A().rpc("rvctl_stock_overview");
   E("inventoryBalance").innerHTML=(d.balances||[]).map(x=>'<div class="row"><b>'+escape(x.item_name)+'</b><span class="tag">'+money(x.balance)+' '+escape(x.unit)+'</span></div>').join("")||'<p class="muted">موجودی اولیه هنوز ثبت نشده؛ صفر نمایش‌داده‌شده موجودی واقعی انبار نیست.</p>';
   E("inventoryMoves").innerHTML=(d.movements||[]).map(x=>'<div class="row"><div><b>'+escape(x.item_name)+'</b><div class="muted mini">'+escape(x.note||"")+' · '+escape(A().pretty(x.created_at))+'</div></div><span class="tag">'+(x.direction==="in"?"ورود ":"خروج ")+money(x.quantity)+' '+escape(x.unit)+'</span></div>').join("")||'<p class="muted">گردش ثبت‌شده‌ای وجود ندارد.</p>';
   status("inventoryMsg","موجودی صرفاً بر اساس گردش‌های ثبت‌شده محاسبه می‌شود.");
 }catch(e){status("inventoryMsg","خطای دریافت انبار: "+safeErr(e),true);}
}
async function addMovement(){
 if(!stockAllowed())throw Error("فقط مالک و انباردار حق ثبت گردش دارند.");
 const quantity=Number(E("moveQty").value);
 if(!Number.isFinite(quantity)||quantity<=0)throw Error("مقدار را وارد کن.");
 await A().rpc("rvctl_stock_move",{p_item:E("moveItem").value.trim(),p_unit:E("moveUnit").value,p_direction:E("moveType").value,p_quantity:quantity,p_note:E("moveNote").value.trim()});
 E("moveQty").value="";E("moveNote").value="";
 banner("گردش انبار ثبت شد.");await inventory();
}
async function adjustments(){
 if(!payrollAllowed())return;
 const month=E("adjustMonth").value;
 status("adjustMsg","در حال بارگیری موارد حقوق...");
 try{
   await fillSelect("adjustStaff");
   const d=await A().rpc("rvctl_finance_adjust_list",{p_month:month});
   const rows=d.records||[];
   const approved=rows.filter(x=>x.status==="approved");
   const changes=approved.reduce((z,x)=>z+(x.kind==="deduction"?-Number(x.amount):Number(x.amount)),0);
   E("adjustApproved").textContent=money(changes)+" تومان";
   const kindName={bonus:"پاداش",deduction:"کسورات",overtime:"اضافه‌کاری"};
   const stateName={pending:"در انتظار تأیید",approved:"تأییدشده",rejected:"ردشده"};
   E("adjustList").innerHTML=rows.map(x=>'<div class="row"><div><b>'+escape(x.name)+'</b><div class="mini muted">'+escape(kindName[x.kind])+' · '+escape(stateName[x.status])+' · '+escape(x.note)+'</div><div>'+money(x.amount)+' تومان</div></div>'+(owner()&&x.status==="pending"?'<div><button class="action" data-adjust="'+escape(x.id)+'" data-decision="approved">تأیید</button> <button class="outline action" data-adjust="'+escape(x.id)+'" data-decision="rejected">رد</button></div>':"")+'</div>').join("")||'<p class="muted">برای این ماه پاداش یا کسوراتی ثبت نشده است.</p>';
   document.querySelectorAll("[data-adjust]").forEach(b=>b.onclick=async()=>{
     const note=prompt("توضیح تصمیم (اختیاری):");if(note===null)return;
     b.disabled=true;try{await A().rpc("rvctl_finance_adjust_decide",{p_id:b.dataset.adjust,p_decision:b.dataset.decision,p_note:note});banner("تصمیم مالک ثبت شد.");await adjustments();}
     catch(e){banner(safeErr(e),true);b.disabled=false;}
   });
   status("adjustMsg","فقط موارد تأییدشده در جمع تعدیلات منظور می‌شوند. جمع حقوق پایه جدا نمایش داده می‌شود.");
 }catch(e){status("adjustMsg","خطای حقوق: "+safeErr(e),true);}
}
async function addAdjustment(){
 if(!["owner","accountant"].includes(A().role()))throw Error("این حساب امکان ثبت تعدیلات ندارد.");
 const amount=Number(E("adjustAmount").value);
 if(!Number.isSafeInteger(amount)||amount<=0)throw Error("مبلغ باید تعداد صحیح تومان باشد.");
 await A().rpc("rvctl_finance_adjust_create",{p_staff_id:E("adjustStaff").value,p_month:E("adjustMonth").value,p_kind:E("adjustType").value,p_amount:amount,p_note:E("adjustNote").value.trim()});
 E("adjustAmount").value="";E("adjustNote").value="";
 banner("تعدیل حقوق برای تأیید مالک ارسال شد.");await adjustments();
}
async function access(){
 if(!accountsAllowed())return;
 status("accountMsg","در حال بررسی حساب‌های RV CONTROL...");
 try{
  const d=await A().rpc("rvctl_access_board");
  const users=d.users||[];
  const staff=await personnel(true);
  const free=staff.filter(s=>!users.some(x=>x.staff_id===s.id));
  E("accountStaff").innerHTML=options(free);
  E("accountUser").innerHTML=users.filter(x=>!x.role&&x.confirmed).map(x=>'<option value="'+escape(x.user_id)+'">'+escape(x.login)+'</option>').join("");
  E("accountList").innerHTML=users.map(x=>'<div class="row"><div><b>'+escape(x.staff_name||"حساب بدون اتصال به پرسنل")+'</b><div class="muted mini">'+escape(x.login)+'</div><div class="mini">'+escape(x.role||"بدون نقش")+' · '+(x.confirmed?"حساب تأییدشده":"تأییدنشده")+'</div></div><span class="tag">'+(!x.role?"در انتظار":x.enabled?"مجاز":"غیرفعال")+'</span>'+(x.role&&x.user_id!==users.find(y=>y.role==="owner")?.user_id?'<button class="outline action" data-user="'+escape(x.user_id)+'" data-enabled="'+(x.enabled?"false":"true")+'">'+(x.enabled?"غیرفعال کردن":"فعال کردن")+'</button>':"")+'</div>').join("")||'<p class="muted">حسابی یافت نشد.</p>';
  document.querySelectorAll("[data-user]").forEach(b=>b.onclick=async()=>{
   if(!confirm("تغییر وضعیت دسترسی این حساب تأیید می‌شود؟"))return;
   b.disabled=true;try{await A().rpc("rvctl_set_user_enabled",{p_user_id:b.dataset.user,p_enabled:b.dataset.enabled==="true"});banner("مجوز کاربر به‌روزرسانی شد.");await access();}
   catch(e){banner(safeErr(e),true);b.disabled=false;}
  });
  status("accountMsg","حساب جدید فقط پس از ساخت امن در Supabase و تأیید مالک اینجا مجاز می‌شود.");
 }catch(e){status("accountMsg","خطای مجوز حساب‌ها: "+safeErr(e),true);}
}
async function approveAccount(){
 if(!owner())throw Error("فقط مالک نقش تعیین می‌کند.");
 if(!E("accountUser").value||!E("accountStaff").value)throw Error("حساب تأییدشده بدون نقش و پرسنل فعال انتخاب کن.");
 if(!confirm("دسترسی این شخص با نقش انتخابی فعال شود؟"))return;
 await A().rpc("rvctl_assign_existing_user",{p_user_id:E("accountUser").value,p_staff_id:E("accountStaff").value,p_role:E("accountRole").value});
 banner("حساب کارکنان با سطح دسترسی اختصاصی فعال شد.");await access();
}
function attach(){
 E("shiftDate").value=iranDate();
 E("salesDay").value=iranDate(); E("costDay").value=iranDate();
 E("adjustMonth").value=iranDate().slice(0,8)+"01";
 handle("saveShift",saveShift);handle("refreshShifts",shifts);
 handle("saveSales",saveSales);handle("saveCost",addCost);handle("refreshFinance",reports);
 handle("saveMove",addMovement);handle("refreshInventory",inventory);
 handle("saveAdjust",addAdjustment);handle("refreshAdjust",adjustments);
 handle("approveAccount",approveAccount);handle("refreshAccounts",access);
}
function onRole(r){
 E("shiftCreateCard").classList.toggle("hide",!manager());
 E("financeEntry").classList.toggle("hide",!["owner","executive","manager","accountant"].includes(r));
 E("inventoryEntry").classList.toggle("hide",!stockAllowed());
 E("adjustEntry").classList.toggle("hide",!["owner","accountant"].includes(r));
 E("accountsAdmin").classList.toggle("hide",!owner());
}
function loadTab(tab){
 if(tab==="shifts")return shifts();
 if(tab==="finance"&&financeAllowed())return reports();
 if(tab==="inventory"&&stockVisible())return inventory();
 if(tab==="accounts"&&owner())return access();
 if(tab==="payroll"&&payrollAllowed())return adjustments();
}
window.RVCTRLModules={attach,onRole,loadTab};
})();
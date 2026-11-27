(function(){
"use strict";
const E=id=>document.getElementById(id),api=()=>window.RVCTRL;
const S=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const T=x=>Number(x??0).toLocaleString("fa-IR");
let allowed=false,people=[],selected=null,lastThread=[],ownerRV=false,ownerRM=false,timer=null;
const key=p=>p.unit+":"+p.person_id;
function note(t,err=false){const x=E("private-message");x.textContent=t;x.classList.toggle("err",err);}
function isOwner(p){return p.my_role==="owner";}
function setup(){
 E("private-refresh").addEventListener("click",()=>load());
 E("private-filter").addEventListener("input",renderList);
 E("private-list").addEventListener("click",e=>{const b=e.target.closest("[data-private-key]");if(b)open(b.dataset.privateKey);});
 E("private-send").addEventListener("click",send);
 E("private-sheba-save").addEventListener("click",saveSheba);
 E("private-sheba-verify").addEventListener("click",()=>reviewSheba("verified"));
 E("private-sheba-reject").addEventListener("click",()=>reviewSheba("rejected"));
 E("private-copy").addEventListener("click",copySheba);
 E("private-copy-all").addEventListener("click",copyAllVerified);
 E("private-compose").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();send();}});
}
async function authorize(){
 allowed=false;people=[];selected=null;
 E("nav-private").classList.add("hide");
 try{
  const d=await api()?.rpc("rvctl_private_people");
  if(d&&Array.isArray(d.people)&&d.people.length){
   people=d.people;ownerRV=!!d.rv_owner;ownerRM=!!d.rm_owner;allowed=true;
  }
 }catch(_){}
 E("nav-private").classList.toggle("hide",!allowed);
}
function reset(){
 allowed=false;people=[];selected=null;lastThread=[];stop();
 E("nav-private").classList.add("hide");
 E("private-list").textContent="";E("private-thread").textContent="";
}
function stop(){if(timer!==null){clearInterval(timer);timer=null;}}
async function load(preserve=true){
 if(!allowed){note("دسترسی به چت کارکنان هنوز فعال نشده است.",true);return;}
 note("در حال بارگذاری پرونده‌های خصوصی...");
 try{
  const d=await api().rpc("rvctl_private_people");
  people=Array.isArray(d.people)?d.people:[];
  ownerRV=!!d.rv_owner;ownerRM=!!d.rm_owner;
  renderList();
  if(!selected || !preserve || !people.some(x=>key(x)===key(selected))){
    selected=people.length===1?people[0]:null;
  }else selected=people.find(x=>key(x)===key(selected));
  if(selected)await open(key(selected));
  else{
   E("private-detail").classList.add("hide");
   E("private-current").textContent="از فهرست، کارمند موردنظر را انتخاب کنید.";
  }
  note("پیام‌ها فقط داخل RV CONTROL نمایش داده می‌شوند؛ ارسال پیامک یا اعلان واتس‌اپ خودکار نداریم.");
 }catch(e){note("دریافت اطلاعات خصوصی ناموفق بود: "+String(e?.message||"خطا"),true);}
}
function renderList(){
 const q=E("private-filter").value.trim();
 const rows=people.filter(p=>[p.name,p.role_title,p.department,p.unit].join(" ").includes(q));
 E("private-list").innerHTML=rows.map(p=>
 '<button class="outline block" style="text-align:right;background:'+(selected&&key(selected)===key(p)?"#25513a":"transparent")+
 '" data-private-key="'+S(key(p))+'"><b>'+S(p.name)+'</b> <span class="tag">'+S(p.unit)+'</span>'+
 ' <span class="muted mini">'+S(p.role_title)+'</span>'+
 (p.unread?'<span class="tag">'+T(p.unread)+' پیام خوانده‌نشده</span>':"")+
 (p.my_role==="owner"?'<div class="mini muted">دسترسی حساب: '+(p.access_active?"فعال":"هنوز متصل نشده")+'</div>':"")+
 '<div class="mini muted">شبا: '+S(({pending:"در انتظار تأیید",verified:"تأییدشده",rejected:"نیازمند اصلاح",not_entered:"ثبت نشده"})[p.sheba_status]||"—")+'</div></button>'
 ).join("")||'<p class="muted">موردی یافت نشد.</p>';
 E("private-copy-all").classList.toggle("hide",!(ownerRV||ownerRM));
}
async function open(k){
 const p=people.find(x=>key(x)===k);
 if(!p)return;
 selected=p;renderList();
 E("private-detail").classList.remove("hide");
 E("private-current").textContent=p.name+" · "+p.unit+" · "+(isOwner(p)?"پنل مالک":"گفت‌وگو با مالک");
 E("private-bank-owner-note").textContent=isOwner(p)?
  "شماره شبا پس از بررسی تو تأیید می‌شود. دکمه کپی آن را در حافظه دستگاه کپی می‌کند؛ هیچ وجهی انتقال نمی‌یابد.":
  "می‌توانید شبا را ثبت یا اصلاح کنید. پس از ثبت، بررسی و تأیید مالک لازم است.";
 E("private-sheba").value=p.sheba||"";
 E("private-sheba-status").textContent="وضعیت شبا: "+(({pending:"در انتظار بررسی مالک",verified:"تأیید مالک",rejected:"ردشده؛ نیازمند اصلاح",not_entered:"ثبت نشده"})[p.sheba_status]||"نامشخص");
 E("private-sheba-verify").classList.toggle("hide",!isOwner(p)||p.sheba_status!=="pending");
 E("private-sheba-reject").classList.toggle("hide",!isOwner(p)||p.sheba_status!=="pending");
 E("private-copy").disabled=!p.sheba;
 E("private-compose").placeholder=isOwner(p)?"پیام خصوصی به "+p.name:"پیام مستقیم به مالک...";
 await refreshThread();
 stop();
 timer=setInterval(()=>{if(selected&&allowed&&document.getElementById("view-private")&&!E("view-private").classList.contains("hide"))refreshThread(true);},12000);
}
async function refreshThread(quiet=false){
 if(!selected)return;
 if(!quiet)E("private-thread").textContent="در حال دریافت پیام‌ها...";
 try{
  const chosen=key(selected),d=await api().rpc("rvctl_private_thread",{p_unit:selected.unit,p_person_id:selected.person_id});
  if(!selected||key(selected)!==chosen)return;
  lastThread=Array.isArray(d.messages)?d.messages:[];
  E("private-thread").innerHTML=lastThread.map(m=>{
   const mine=isOwner(selected)?m.sender_role==="owner":m.sender_role==="employee";
   const who=m.sender_role==="owner"?"مالک":selected.name;
   const date=new Date(m.created_at).toLocaleString("fa-IR",{timeZone:"Asia/Tehran"});
   return '<div style="margin:7px 0;padding:10px;border-radius:12px;border:1px solid var(--line);'+(mine?"background:#235038":"background:#0e291f")+'">'+
    '<div class="mini muted">'+S(who)+' · '+S(date)+'</div><p style="white-space:pre-wrap;overflow-wrap:anywhere">'+S(m.body)+'</p></div>';
  }).join("")||'<p class="muted">هنوز پیامی وجود ندارد. گفت‌وگو را شروع کنید.</p>';
 }catch(e){if(!quiet)note("دریافت پیام‌ها انجام نشد: "+String(e?.message||"خطا"),true);}
}
async function send(){
 if(!selected)return;
 const body=E("private-compose").value.trim();
 if(!body||body.length>2000){note("متن پیام باید بین ۱ تا ۲۰۰۰ نویسه باشد.",true);return;}
 const b=E("private-send");b.disabled=true;
 try{
  await api().rpc("rvctl_private_send",{p_unit:selected.unit,p_person_id:selected.person_id,p_body:body});
  E("private-compose").value="";await refreshThread();note("پیام داخل برنامه ثبت شد. دریافت‌کننده پس از ورود به RV CONTROL می‌تواند آن را بخواند.");
 }catch(e){note("پیام ارسال نشد: "+String(e?.message||"خطا"),true);}
 finally{b.disabled=false;}
}
function normalizeSheba(v){return String(v||"").toUpperCase().replace(/[\s-]/g,"");}
function ibanValid(v){
 if(!/^IR[0-9]{24}$/.test(v))return false;
 const str=v.slice(4)+"1827"+v.slice(2,4);
 let remainder=0;
 for(const digit of str)remainder=(remainder*10+Number(digit))%97;
 return remainder===1;
}
async function saveSheba(){
 if(!selected)return;
 const sheba=normalizeSheba(E("private-sheba").value);
 if(!ibanValid(sheba)){note("شماره شبا صحیح نیست. شبا باید با IR شروع شود و ۲۴ رقم داشته باشد و رقم کنترلی آن درست باشد.",true);return;}
 if(!confirm("شماره شبا برای «"+selected.name+"» ثبت شود و در انتظار تأیید مالک قرار بگیرد؟"))return;
 const b=E("private-sheba-save");b.disabled=true;
 try{
  await api().rpc("rvctl_sheba_submit",{p_unit:selected.unit,p_person_id:selected.person_id,p_sheba:sheba});
  await load();note("شماره شبا در انتظار تأیید مالک ثبت شد. هیچ عملیات بانکی انجام نشد.");
 }catch(e){note("ثبت شبا انجام نشد: "+String(e?.message||"خطا"),true);}
 finally{b.disabled=false;}
}
async function reviewSheba(action){
 if(!selected||!isOwner(selected)||selected.sheba_status!=="pending")return;
 const reason=prompt(action==="verified"?"یادداشت تأیید شبا (پس از تطبیق با مدرک مالکیت حساب):":"دلیل رد یا درخواست اصلاح شبا:");
 if(reason===null)return;
 if(reason.trim().length<4){note("توضیح بررسی حداقل ۴ نویسه لازم دارد.",true);return;}
 if(!confirm((action==="verified"?"تأیید":"رد")+" شماره شبای "+selected.name+" ثبت شود؟"))return;
 try{
  await api().rpc("rvctl_sheba_review",{p_unit:selected.unit,p_person_id:selected.person_id,p_action:action,p_note:reason.trim()});
  await load();note("تصمیم درباره شبا ثبت شد و در سابقه محفوظ است.");
 }catch(e){note("بررسی شبا انجام نشد: "+String(e?.message||"خطا"),true);}
}
async function copyText(s){
 if(!s)return false;
 try{
  if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(s);return true;}
  const input=E("private-sheba");input.focus();input.select();
  return document.execCommand("copy");
 }catch(_){return false;}
}
async function copySheba(){
 if(!selected?.sheba)return;
 const ok=await copyText(selected.sheba);
 note(ok?"شماره شبا کپی شد.":"کپی خودکار ممکن نشد؛ متن شبا را انتخاب و کپی کن.",!ok);
}
async function copyAllVerified(){
 if(!(ownerRV||ownerRM))return;
 const lines=people.filter(p=>p.my_role==="owner"&&p.sheba&&p.sheba_status==="verified").map(p=>p.unit+" | "+p.name+" | "+p.sheba);
 if(!lines.length){note("هنوز شماره شبای تأییدشده‌ای برای کپی گروهی وجود ندارد.",true);return;}
 try{
  await navigator.clipboard.writeText(lines.join("\n"));
  note(T(lines.length)+" شماره شبای تأییدشده با نام کارکنان کپی شد.");
 }catch(_){note("کپی گروهی در این مرورگر مجاز نیست.",true);}
}
window.PrivateStaff={setup,authorize,reset,load,enabled:()=>allowed};
})();
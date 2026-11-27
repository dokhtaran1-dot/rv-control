import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";

const html = fs.readFileSync("index.html","utf8");
const modules = fs.readFileSync("rv-modules.js","utf8");
const mall = fs.readFileSync("mall-payroll.js","utf8");
const performance = fs.readFileSync("mall-performance.js","utf8");
const combined = fs.readFileSync("combined-payroll.js","utf8");
const hr = fs.readFileSync("hr-control.js","utf8");
const rollout = fs.readFileSync("rollout.js","utf8");
const rvPerformance = fs.readFileSync("rv-performance.js","utf8");
const voteHtml = fs.readFileSync("vote.html","utf8");
const workflow = fs.readFileSync(".github/workflows/deploy-pages.yml","utf8");
const checks = [];
function test(name, fn) { fn(); checks.push(name); }

test("Independent database only", () => {
  assert.ok(html.includes("wtwbemwyntvocdilaukk.supabase.co"));
  assert.ok(!html.includes("jwddfcsikkialxzbrhle"));
  assert.ok(!modules.includes("jwddfcsikkialxzbrhle"));
  assert.ok(!mall.includes("jwddfcsikkialxzbrhle"));
  assert.ok(!performance.includes("jwddfcsikkialxzbrhle"));
  assert.ok(!combined.includes("jwddfcsikkialxzbrhle"));
  assert.ok(!hr.includes("jwddfcsikkialxzbrhle"));
  assert.ok(!rollout.includes("jwddfcsikkialxzbrhle"));
  assert.ok(!rvPerformance.includes("jwddfcsikkialxzbrhle"));
  assert.ok(!voteHtml.includes("jwddfcsikkialxzbrhle"));
  assert.ok(!mall.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!performance.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!combined.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!hr.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!rollout.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!rvPerformance.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!voteHtml.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!html.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!modules.includes("SUPABASE_SERVICE_ROLE_KEY"));
});
test("JavaScript syntax", () => {
  const inline = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m=>m[1]).filter(s=>s.trim());
  assert.ok(inline.length>=2);
  for(const script of inline)new vm.Script(script,{filename:"index.html inline"});
  new vm.Script(modules,{filename:"rv-modules.js"});
  new vm.Script(mall,{filename:"mall-payroll.js"});
  new vm.Script(performance,{filename:"mall-performance.js"});
  new vm.Script(combined,{filename:"combined-payroll.js"});
  new vm.Script(hr,{filename:"hr-control.js"});
  new vm.Script(rollout,{filename:"rollout.js"});
  new vm.Script(rvPerformance,{filename:"rv-performance.js"});
  for(const m of voteHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1],{filename:"vote.html inline"});
});
test("Module deployed as separate script", () => {
  assert.ok(html.includes('<script src="./rv-modules.js" defer></script>'));
  assert.ok(html.includes('<script src="./mall-payroll.js" defer></script>'));
  assert.ok(html.includes('<script src="./mall-performance.js" defer></script>'));
  assert.ok(html.includes('<script src="./combined-payroll.js" defer></script>'));
  assert.ok(html.includes('<script src="./hr-control.js" defer></script>'));
  assert.ok(html.includes('<script src="./rollout.js" defer></script>'));
  assert.ok(html.includes('<script src="./rv-performance.js" defer></script>'));
  assert.ok(html.includes("window.RVCTRLModules?.attach?.()"));
});
test("Tab panels", () => {
  for(const t of ["dashboard","presence","attendance","kiosk","requests","people",
                  "payroll","mall-payroll","combined-payroll","performance","hr","setup","rv-performance","my-rewards","shifts","finance","inventory","accounts"]){
    assert.ok(html.includes('data-tab="'+t+'"'),"missing tab "+t);
    assert.ok(html.includes('id="view-'+t+'"'),"missing panel "+t);
  }
});
test("Referenced DOM elements exist", () => {
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(ids.length,new Set(ids).size,"duplicate HTML id");
  const expected=[...modules.matchAll(/\bE\("([^"]+)"\)/g),...mall.matchAll(/\bE\("([^"]+)"\)/g),...performance.matchAll(/\bE\("([^"]+)"\)/g),...combined.matchAll(/\bE\("([^"]+)"\)/g),...hr.matchAll(/\bE\("([^"]+)"\)/g),...rollout.matchAll(/\bE\("([^"]+)"\)/g),...rvPerformance.matchAll(/\bE\("([^"]+)"\)/g)].map(x=>x[1]);
  for(const e of expected)assert.ok(ids.includes(e),"missing module HTML id "+e);
});
test("No accidental HTML section truncation",()=>{
  assert.equal((html.match(/<section\b/g)||[]).length,(html.match(/<\/section>/g)||[]).length);
});
test("Separate Mall payroll authorization",()=>{
  assert.ok(html.includes('id="nav-mall-payroll" class="hide"'));
  assert.ok(html.includes("await window.MallPayroll?.authorize?.()"));
  assert.ok(html.includes('nav(onlyEmployee?"my-payroll":"mall-payroll")'));
  assert.ok(html.includes('id="nav-my-payroll" class="hide"'));
  assert.ok(html.includes('id="view-my-payroll"'));
  assert.ok(mall.includes('E("mall-link-save").addEventListener("click",linkEmployee)'));
  assert.ok(mall.includes("rvmall_payroll_employee_link"));
  assert.ok(mall.includes("rvmall_payroll_employee_unlink"));
  assert.ok(mall.includes("rvmall_payroll_role"));
  assert.ok(mall.includes("rvmall_payroll_list"));
  assert.ok(!mall.includes("rvctl_payroll"));
  assert.ok(!mall.includes("rvctl_staff"));
});
test("Separate manager scoring and owner approval workflow",()=>{
  assert.ok(html.includes('id="nav-performance" class="hide"'));
  assert.ok(html.includes("window.MallPerformance?.setup?.()"));
  assert.ok(html.includes("await window.MallPerformance?.authorize?.()"));
  for(const id of ["p-month","p-refresh","p-list","p-message","p-summary"])assert.ok(html.includes('id="'+id+'"'));
  for(const name of ["rvmall_performance_role","rvmall_performance_board","rvmall_performance_assign","rvmall_performance_score_save","rvmall_performance_review"])assert.ok(performance.includes(name));
  assert.ok(!performance.includes("rvmall_payroll_record"));
  assert.ok(!performance.includes("rvmall_payroll_decide"));
});
test("Read-only owner combined payroll and complete deployment bundle",()=>{
  assert.ok(html.includes('id="nav-combined-payroll" class="hide"'));
  assert.ok(html.includes('id="view-combined-payroll" class="hide"'));
  assert.ok(html.includes("window.CombinedPayroll?.setup?.()"));
  assert.ok(html.includes("await window.CombinedPayroll?.authorize?.()"));
  assert.ok(html.includes('if(next==="combined-payroll")window.CombinedPayroll?.load?.()'));
  assert.ok(combined.includes("rvctl_combined_payroll_board"));
  assert.ok(combined.includes("rvmall_payroll_role"));
  assert.ok(!combined.includes("rvmall_payroll_record"));
  assert.ok(!combined.includes("rvmall_payroll_decide"));
  assert.ok(!combined.includes("rvctl_payroll_record"));
  for(const file of ["mall-payroll.js","mall-performance.js","combined-payroll.js"]){
    assert.ok(workflow.includes("test -s dist/"+file),"not bundled: "+file);
    assert.ok(workflow.includes("'"+file+"'"),"no push trigger: "+file);
  }
});
test("Owner HR roles, employee duties, incident review, no automatic fines",()=>{
  assert.ok(html.includes('id="nav-hr" class="hide"'));
  assert.ok(html.includes('id="view-hr" class="hide"'));
  assert.ok(html.includes("await window.HRControl?.authorize?.()"));
  assert.ok(html.includes("window.HRControl?.setup?.()"));
  assert.ok(html.includes('if(next==="hr")window.HRControl?.load?.()'));
  for(const x of ["hr-info","hr-unit","hr-search","hr-refresh","hr-catalog","hr-people","hr-incidents","hr-count"])
    assert.ok(html.includes('id="'+x+'"'),"missing HR id "+x);
  for(const fn of ["rvctl_hr_board","rvctl_hr_profile_save","rvctl_hr_incident_report","rvctl_hr_incident_reply","rvctl_hr_incident_review"])
    assert.ok(hr.includes(fn),"missing RPC "+fn);
  for(const dangerous of ["rvmall_payroll_decide","rvmall_payroll_record","rvctl_payroll_record"])
    assert.ok(!hr.includes(dangerous),"unexpected payroll write "+dangerous);
  assert.ok(!html.includes("قانون کار"));
  assert.ok(!hr.includes("قانون کار"));
  assert.ok(workflow.includes("test -s dist/hr-control.js"));
  assert.ok(workflow.includes("'hr-control.js'"));
});
test("Owner 7-step launchpad, customer codes, private bonuses and RV scoring",()=>{
 for(const tab of ["setup","rv-performance","my-rewards"]){
   assert.ok(html.includes('id="nav-'+tab+'" class="hide"'));
   assert.ok(html.includes('id="view-'+tab+'" class="hide"'));
 }
 assert.ok(html.includes("window.Rollout?.setup?.()"));
 assert.ok(html.includes("await window.Rollout?.authorize?.()"));
 assert.ok(html.includes("window.RVPerformance?.setup?.()"));
 assert.ok(html.includes("await window.RVPerformance?.authorize?.()"));
 for(const id of ["setup-steps","setup-reload","setup-owner-note","setup-message","setup-salary-person","setup-salary-save",
     "setup-bonus-unit","setup-bonus-person","setup-bonus-month","setup-bonus-save","setup-bonus-list","setup-voting",
     "setup-rv-round","setup-lateness","setup-lateness-result","rvp-month","rvp-people","rvp-refresh",
     "my-rewards-refresh","my-rewards-list"]){
   assert.ok(html.includes('id="'+id+'"'),"Missing rollout id "+id);
 }
 for(const name of ["rvctl_setup_progress","rvctl_bonus_board","rvctl_bonus_save","rvctl_bonus_decide",
    "rvctl_owner_salary_set","rvctl_rv_vote_admin","rvmall_vote_admin","rvctl_rv_attendance_lateness_preview"])
  assert.ok(rollout.includes(name),"Missing rollout RPC "+name);
 for(const name of ["rvctl_rv_performance_board","rvctl_rv_performance_save","rvctl_rv_performance_review","rvctl_my_pay_rewards"])
  assert.ok(rvPerformance.includes(name),"Missing RV scoring RPC "+name);
 assert.ok(voteHtml.includes("rvmall_vote_cast"));
 assert.ok(voteHtml.includes("rvctl_rv_vote_cast"));
 assert.ok(voteHtml.includes("rvmall_vote_public_candidates"));
 assert.ok(voteHtml.includes("rvctl_rv_vote_public_candidates"));
 assert.ok(!voteHtml.includes("SUPABASE_SERVICE_ROLE_KEY"));
 assert.ok(!rollout.includes("rvmall_payroll_decide"));
 assert.ok(!rvPerformance.includes("rvmall_payroll_decide"));
 assert.ok(!rollout.includes("قانون کار"));
 for(const file of ["rollout.js","rv-performance.js","vote.html"]){
  assert.ok(workflow.includes("test -s dist/"+file),"No publish file "+file);
  assert.ok(workflow.includes("'"+file+"'"),"No publish trigger "+file);
 }
});
test("Mobile alias login and protected workflow",()=>{
  assert.ok(html.includes("phoneLoginAlias(phone,\"rv2-\")"));
  assert.ok(html.includes("phoneLoginAlias(phone),password"));
  assert.ok(html.includes("signInByPhone(phone,password)"));
  assert.ok(html.includes("rvctl_current_role"));
  assert.ok(modules.includes("rvctl_report_summary"));
  assert.ok(modules.includes("rvctl_shift_list"));
  assert.ok(modules.includes("rvctl_stock_overview"));
  assert.ok(modules.includes("rvctl_access_board"));
});
console.log("RV CONTROL static checks passed: "+checks.join(" | "));

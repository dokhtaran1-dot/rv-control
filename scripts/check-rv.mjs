import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";

const html = fs.readFileSync("index.html","utf8");
const modules = fs.readFileSync("rv-modules.js","utf8");
const mall = fs.readFileSync("mall-payroll.js","utf8");
const performance = fs.readFileSync("mall-performance.js","utf8");
const checks = [];
function test(name, fn) { fn(); checks.push(name); }

test("Independent database only", () => {
  assert.ok(html.includes("wtwbemwyntvocdilaukk.supabase.co"));
  assert.ok(!html.includes("jwddfcsikkialxzbrhle"));
  assert.ok(!modules.includes("jwddfcsikkialxzbrhle"));
  assert.ok(!mall.includes("jwddfcsikkialxzbrhle"));
  assert.ok(!performance.includes("jwddfcsikkialxzbrhle"));
  assert.ok(!mall.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!performance.includes("SUPABASE_SERVICE_ROLE_KEY"));
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
});
test("Module deployed as separate script", () => {
  assert.ok(html.includes('<script src="./rv-modules.js" defer></script>'));
  assert.ok(html.includes('<script src="./mall-payroll.js" defer></script>'));
  assert.ok(html.includes('<script src="./mall-performance.js" defer></script>'));
  assert.ok(html.includes("window.RVCTRLModules?.attach?.()"));
});
test("Tab panels", () => {
  for(const t of ["dashboard","presence","attendance","kiosk","requests","people",
                  "payroll","mall-payroll","performance","shifts","finance","inventory","accounts"]){
    assert.ok(html.includes('data-tab="'+t+'"'),"missing tab "+t);
    assert.ok(html.includes('id="view-'+t+'"'),"missing panel "+t);
  }
});
test("Referenced DOM elements exist", () => {
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(ids.length,new Set(ids).size,"duplicate HTML id");
  const expected=[...modules.matchAll(/\bE\("([^"]+)"\)/g),...mall.matchAll(/\bE\("([^"]+)"\)/g)].map(x=>x[1]);
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

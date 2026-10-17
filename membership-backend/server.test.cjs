// Dependency-injected server tests: no SDK installation, credentials or network.
const {test} = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
function setup(env = true) {
  const records = new Map(), accounts = new Map(), writes=[];
  const ref = path => ({id:path.split('/').pop(),path,collection:name=>({doc:id=>ref(path+'/'+name+'/'+id)}),get:async()=>snapshot(path)});
  const snapshot = path => ({exists:records.has(path),data:()=>records.get(path)});
  const db={collection:name=>({doc:id=>ref(name+'/'+id)}),runTransaction:async fn=>{
    const pending=[];
    const result=await fn({get:async r=>snapshot(r.path),create:(r,d)=>{assert(!records.has(r.path));pending.push([r.path,d]);},update:(r,d)=>pending.push([r.path,{...records.get(r.path),...d}])});
    pending.forEach(([p,d])=>{writes.push(p);records.set(p,d);});return result;
  }};
  class HttpsError extends Error {constructor(code,msg){super(msg);this.code=code;}}
  const modules={"firebase-functions/v2/https":{onCall:(_,fn)=>fn,HttpsError},"firebase-admin/app":{initializeApp(){}},"firebase-admin/auth":{getAuth:()=>({getUser:async uid=>accounts.get(uid)})},"firebase-admin/firestore":{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>"SERVER_TIME"}},"./policy.cjs":require('./policy.cjs')};
  const exports={};
  vm.runInNewContext(fs.readFileSync(__dirname+'/index.cjs','utf8'),{require:name=>modules[name],exports,process:{env:env?{FUNCTIONS_EMULATOR:'true',GCLOUD_PROJECT:'demo-gintho-membership',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'}:{}}});
  const account=(uid,admin=false,verified=true)=>{accounts.set(uid,{uid,email:uid+'@example.invalid',emailVerified:verified,customClaims:{membershipReviewer:admin}});return {uid,token:{email_verified:verified,auth_time:Date.now()/1000}};};
  return {api:exports,records,writes,account};
}
const payload=()=>({firstName:'Mario',lastName:'Prova',birthDate:'1990-01-01',birthPlace:'Roma',address:'Via Prova',city:'Roma',versions:{statute:'draft-2026-10-17',privacy:'draft-2026-10-17'},acknowledgements:{statute:true,privacy:true,review:true,draft:true}});
test('all endpoints refuse production before touching data',async()=>{
  const s=setup(false);for(const fn of Object.values(s.api))await assert.rejects(fn({}),e=>e.code==='failed-precondition');assert.equal(s.writes.length,0);
});
test('unauthenticated, unverified, ordinary and stale admin access denied',async()=>{
  const s=setup();await assert.rejects(s.api.membershipSubmit({data:payload()}),e=>e.code==='unauthenticated');
  await assert.rejects(s.api.membershipSubmit({auth:s.account('unverified',false,false),data:payload()}),e=>e.code==='permission-denied');
  await assert.rejects(s.api.membershipReviewList({auth:s.account('ordinary')}),e=>e.code==='permission-denied');
  const admin=s.account('admin',true);admin.token.auth_time-=1000;
  await assert.rejects(s.api.membershipReviewList({auth:admin}),e=>e.code==='permission-denied');assert.equal(s.writes.length,0);
});
test('idempotent receipt, ownership, conflict and audit; no license mutations',async()=>{
  const s=setup();const auth=s.account('applicant');
  const first=await s.api.membershipSubmit({auth,data:payload()});
  const again=await s.api.membershipSubmit({auth,data:payload()});assert.equal(first.id,again.id);assert.equal(again.duplicate,true);assert.equal(s.writes.length,2);
  const other=s.account('other');assert.equal((await s.api.membershipRead({auth:other})).status,'not_submitted');
  const admin=s.account('reviewer',true);
  await s.api.membershipReview({auth:admin,data:{id:'applicant',revision:0,status:'under_review',reason:'Presa in carico demo'}});
  await assert.rejects(s.api.membershipReview({auth:admin,data:{id:'applicant',revision:0,status:'approved',reason:'Verbale demo'}}),e=>e.code==='aborted');
  await s.api.membershipReview({auth:admin,data:{id:'applicant',revision:1,status:'approved',reason:'Verbale demo'}});
  assert.equal(s.records.get('membershipApplications/applicant').status,'approved');
  assert(s.records.has('membershipApplications/applicant/audit/2'));
  assert(s.writes.every(p=>p.startsWith('membershipApplications/')));
});
test('reviewer cannot approve own application',async()=>{
  const s=setup();const auth=s.account('reviewer',true);await s.api.membershipSubmit({auth,data:payload()});
  await assert.rejects(s.api.membershipReview({auth,data:{id:'reviewer',revision:0,status:'under_review',reason:'x'}}),e=>e.code==='permission-denied');
});

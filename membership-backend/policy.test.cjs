const {test} = require("node:test");
const assert = require("node:assert/strict");
const {validate,transition} = require("./policy.cjs");
const now = new Date("2026-10-17T12:00:00Z");
const data = () => ({firstName:"Mario",lastName:"Prova",birthDate:"1990-01-01",birthPlace:"Roma",address:"Via Prova",city:"Roma",versions:{statute:"draft-2026-10-17",privacy:"draft-2026-10-17"},acknowledgements:{statute:true,privacy:true,review:true,draft:true}});
test("verified identity determines email; no privileged fields accepted",()=>{
  assert.equal(validate(data(),"Verified@EXAMPLE.invalid",now).email,"verified@example.invalid");
  for(const field of ["status","uid","email","edition","license","sportAuthorization","payment","membershipReviewer"])assert.throws(()=>validate({...data(),[field]:"active"},"a@example.invalid",now));
});
test("server rejects missing declarations, obsolete documents, whitespace and oversize data",()=>{
  for(const field of ["statute","privacy","review","draft"]){const d=data();d.acknowledgements[field]=false;assert.throws(()=>validate(d,"a@example.invalid",now));}
  for(const d of [{...data(),firstName:" "},{...data(),city:"a".repeat(151)},{...data(),versions:{statute:"old",privacy:"old"}}, {...data(),acknowledgements:undefined}])assert.throws(()=>validate(d,"a@example.invalid",now));
});
test("date and age boundary; minors remain blocked",()=>{
  for(const birthDate of ["2026-02-30","2027-01-01","2008-10-18","2020-01-01","1899-01-01"])assert.throws(()=>validate({...data(),birthDate},"a@example.invalid",now));
  assert.equal(validate({...data(),birthDate:"2008-10-17"},"a@example.invalid",now).birthDate,"2008-10-17");
});
test("review cannot skip deliberation flow or reopen terminal state",()=>{
  assert.equal(transition("received","under_review","Review demo").status,"under_review");
  for(const next of ["approved","rejected"])assert.equal(transition("under_review",next,"Verbale demo").status,next);
  for(const pair of [["received","approved"],["approved","received"],["rejected","approved"],["under_review","active"]])assert.throws(()=>transition(...pair,"x"));
  assert.throws(()=>transition("under_review","rejected"," "));
});

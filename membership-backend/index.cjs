"use strict";
const {onCall,HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore,FieldValue} = require("firebase-admin/firestore");
const policy = require("./policy.cjs");
initializeApp();
const db = getFirestore();
const emulator = process.env.FUNCTIONS_EMULATOR === "true";
const options = {region:"europe-west1", enforceAppCheck: !emulator, maxInstances:2};
function assertLocal() {
  // Deliberately no production switch: a reviewed release must replace this guard.
  if (!emulator || process.env.GCLOUD_PROJECT !== "demo-gintho-membership" || !process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) throw new HttpsError("failed-precondition","Prototipo disponibile solo negli emulatori demo");
}
async function user(request, admin = false) {
  assertLocal();
  if (!request.auth) throw new HttpsError("unauthenticated","Accedi e verifica la tua email");
  const record = await getAuth().getUser(request.auth.uid);
  if (record.disabled || !record.emailVerified || request.auth.token.email_verified !== true) throw new HttpsError("permission-denied","Verifica email richiesta; aggiorna la sessione");
  if (admin && (record.customClaims?.membershipReviewer !== true || Date.now()/1000 - request.auth.token.auth_time > 900)) throw new HttpsError("permission-denied","Revisore autorizzato con accesso recente richiesto");
  return record;
}
const invalid = fn => {try { return fn(); } catch(error) { throw new HttpsError("invalid-argument",error.message); }};
exports.membershipSubmit = onCall(options, async request => {
  const account = await user(request);
  const data = invalid(() => policy.validate(request.data,account.email));
  const ref = db.collection("membershipApplications").doc(account.uid);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    // One immutable application per UID: retry returns the original receipt.
    if (snapshot.exists) return {id:ref.id,status:snapshot.data().status,duplicate:true};
    tx.create(ref,{...data,uid:account.uid,status:"received",createdAt:FieldValue.serverTimestamp(),revision:0,environment:"emulator",sportAuthorization:"not_requested",payment:"not_recorded"});
    tx.create(ref.collection("audit").doc("submission"),{actor:account.uid,action:"received",at:FieldValue.serverTimestamp()});
    return {id:ref.id,status:"received",duplicate:false};
  });
});
exports.membershipRead = onCall(options, async request => {
  const account = await user(request);
  const snapshot = await db.collection("membershipApplications").doc(account.uid).get();
  return snapshot.exists ? {id:snapshot.id,status:snapshot.data().status,revision:snapshot.data().revision,sportAuthorization:"not_requested"} : {status:"not_submitted"};
});
exports.membershipReviewList = onCall(options, async request => {
  await user(request,true);
  const snapshot = await db.collection("membershipApplications").orderBy("createdAt","desc").limit(50).get();
  return snapshot.docs.map(doc => ({id:doc.id,...doc.data(),createdAt:doc.data().createdAt.toDate().toISOString()}));
});
exports.membershipReview = onCall(options, async request => {
  const reviewer = await user(request,true);
  const input = request.data;
  invalid(() => policy.sameKeys(input,["id","revision","status","reason"]));
  if (!input || typeof input.id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(input.id) || !Number.isSafeInteger(input.revision) || input.revision < 0) throw new HttpsError("invalid-argument","Identificativo o revisione non validi");
  if (input.id === reviewer.uid) throw new HttpsError("permission-denied","Non puoi deliberare sulla tua domanda");
  const ref = db.collection("membershipApplications").doc(input.id);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new HttpsError("not-found","Domanda non trovata");
    const current = snapshot.data();
    if (current.revision !== input.revision) throw new HttpsError("aborted","Domanda aggiornata da un altro revisore: ricarica");
    const change = invalid(() => policy.transition(current.status,input.status,input.reason));
    tx.update(ref,{status:change.status,revision:current.revision+1,reviewedAt:FieldValue.serverTimestamp(),reviewer:reviewer.uid});
    tx.create(ref.collection("audit").doc(String(current.revision+1)),{...change,actor:reviewer.uid,at:FieldValue.serverTimestamp(),from:current.status});
    // No payment, membership book, mail queue, SPORT grant or license writes.
    return {status:change.status,revision:current.revision+1,sportAuthorization:"not_requested"};
  });
});

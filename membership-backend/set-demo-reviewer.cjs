"use strict";
// Local helper only; never grants roles in the real Firebase project.
if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") throw Error("Imposta FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099");
const uid = process.argv[2];
if (!uid || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw Error("Indica UID dell'account demo verificato");
const {initializeApp}=require("firebase-admin/app");
const {getAuth}=require("firebase-admin/auth");
initializeApp({projectId:"demo-gintho-membership"});
(async()=>{const account=await getAuth().getUser(uid);await getAuth().setCustomUserClaims(uid,{...account.customClaims,membershipReviewer:true});console.log("Ruolo revisore assegnato SOLO nell'emulatore. Esci e accedi di nuovo.");})().catch(error=>{console.error(error.message);process.exitCode=1;});

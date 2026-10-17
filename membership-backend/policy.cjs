"use strict";
const fail = message => { throw new Error(message); };
const text = (value, max) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : fail("Campo mancante o troppo lungo");
const sameKeys = (data, keys) => {
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).some(k => !keys.includes(k))) fail("Campi non ammessi");
};
const versions = Object.freeze({statute: "draft-2026-10-17", privacy: "draft-2026-10-17"});
function validate(data, email, now = new Date()) {
  sameKeys(data, ["firstName", "lastName", "birthDate", "birthPlace", "address", "city", "phone", "acknowledgements", "versions"]);
  const clean = {};
  for (const [key, max] of Object.entries({firstName:100,lastName:100,birthPlace:150,address:200,city:150})) clean[key] = text(data[key], max);
  const dob = text(data.birthDate, 10);
  const date = new Date(dob + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== dob || dob > now.toISOString().slice(0,10) || Number(dob.slice(0,4)) < 1900) fail("Data non valida");
  const cutoff = `${now.getUTCFullYear()-18}-${String(now.getUTCMonth()+1).padStart(2,"0")}-${String(now.getUTCDate()).padStart(2,"0")}`;
  if (dob > cutoff) fail("Invio minorenni non disponibile: procedura da definire");
  sameKeys(data.versions, ["statute", "privacy"]);
  if (data.versions.statute !== versions.statute || data.versions.privacy !== versions.privacy) fail("Versioni documenti non valide");
  sameKeys(data.acknowledgements, ["statute", "privacy", "review", "draft"]);
  if (["statute","privacy","review","draft"].some(k => data.acknowledgements[k] !== true)) fail("Dichiarazioni mancanti");
  clean.birthDate = dob;
  clean.phone = data.phone === undefined || data.phone === "" ? "" : text(data.phone,30);
  clean.email = text(email,254).toLowerCase();
  return {...clean, versions, acknowledgements: {statute:true,privacy:true,review:true,draft:true}};
}
function transition(current, next, reason) {
  if (!(current === "received" && next === "under_review") && !(current === "under_review" && ["approved","rejected"].includes(next))) fail("Passaggio di stato non ammesso");
  return {status: next, reason: text(reason,1000)};
}
module.exports = {validate, transition, sameKeys};

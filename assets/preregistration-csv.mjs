const statuses={received:'Da gestire',contacted:'Contattata',closed:'Archiviata'};
const access={none:'Non abilitato',active:'Attivo',expired:'Scaduto',revoked:'Revocato',external:'Gestito con altra procedura'};
export function csvCell(value){
  let text=String(value??'');
  if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
export function buildCsv(rows){
  const header=['Riferimento','Nome','Cognome','Email','Stato preiscrizione','Ricevuta il (UTC)','Conservazione fino al (UTC)','Interesse tester','Accesso SPORT','Scadenza SPORT (UTC)','Ammissione associativa'];
  return '\uFEFF'+[header,...rows.map(row=>[row.id,row.firstName,row.lastName,row.email,statuses[row.status]||row.status,row.createdAt,row.expiresAt,row.testerInterest?'Sì':'No',access[row.testerAccess?.status]||'Non abilitato',row.testerAccess?.expiresAt||'','Non formalizzata'])].map(row=>row.map(csvCell).join(';')).join('\r\n');
}

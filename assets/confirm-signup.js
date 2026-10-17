import {client,received} from './automatic-client.js';
const params=new URLSearchParams(location.search);const data={uid:params.get('uid'),token:params.get('token'),oobCode:params.get('oobCode')};
// Remove the one-time capability from the address bar and subsequent navigation.
history.replaceState(null,'',location.pathname+(params.get('test')==='emulator'?'?test=emulator':''));
const feedback=document.getElementById('feedback'),retry=document.getElementById('retry');let busy=false,call;
async function confirm(){if(busy)return;busy=true;retry.hidden=true;feedback.textContent='Verifica email e invio della preiscrizione in corso…';try{const result=await call('preregistrationComplete',data);document.getElementById('title').textContent='Preiscrizione ricevuta';feedback.textContent='Email verificata. La tua preiscrizione è stata inviata automaticamente: hai finito.';document.getElementById('result-text').textContent=received(result);}catch(e){document.getElementById('title').textContent='Conferma da completare';feedback.textContent=e.message||'Connessione interrotta. Riprova: la richiesta non viene duplicata.';retry.hidden=false;}finally{busy=false;}}
try{({call}=await client());retry.onclick=confirm;await confirm();}catch(e){feedback.textContent='Servizio non raggiungibile. Riapri il collegamento ricevuto via email fra qualche istante.';}

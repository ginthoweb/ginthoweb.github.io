import {client,received} from './automatic-client.js';
const el=id=>document.getElementById(id),form=el('signup-form'),feedback=el('feedback');let busy=false;
const buttons=()=>form.querySelectorAll('button');buttons().forEach(b=>b.disabled=true);
try{
 const {auth,a,call}=await client();buttons().forEach(b=>b.disabled=false);feedback.hidden=true;
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!form.reportValidity())return;busy=true;buttons().forEach(b=>b.disabled=true);feedback.hidden=false;feedback.classList.remove('message-error');feedback.textContent='Preparazione della richiesta…';
  try{
   const email=el('account-email').value.trim(),password=el('account-password').value,mode=event.submitter?.value||'register';
   if(auth.currentUser?.email?.toLowerCase()!==email.toLowerCase()){
    if(auth.currentUser)await a.signOut(auth);
    if(mode==='register'){if(password.length<8)throw Error('Scegli una password di almeno 8 caratteri.');await a.createUserWithEmailAndPassword(auth,email,password);}
    else await a.signInWithEmailAndPassword(auth,email,password);
   }
   const result=await call('preregistrationPrepare',{firstName:el('first-name').value,lastName:el('last-name').value,adult:el('adult').checked,privacyRead:el('privacy-read').checked,termsRead:el('terms-read').checked,testerInterest:el('tester-interest').checked,privacyVersion:'preregistration-2026-10-17-v1'});
   el('account-password').value='';el('account-password').required=false;feedback.hidden=true;el('result').hidden=false;
   if(result.status==='verification_sent'){
    el('result-title').textContent='Ora controlla la tua email';el('result-text').textContent=`Abbiamo inviato il collegamento a ${email}. Cliccalo: l’email sarà verificata e la preiscrizione inviata automaticamente. Non devi tornare qui né premere altri pulsanti. Controlla anche Spam. Il collegamento scade entro 24 ore. Puoi chiudere questa scheda.`;
    event.submitter.textContent='Invia nuovamente il link';
   }else{el('result-title').textContent='Preiscrizione ricevuta';el('result-text').textContent=received(result);form.hidden=true;el('account-password').value='';}
   el('result').scrollIntoView({behavior:'smooth',block:'start'});el('result-title').focus({preventScroll:true});
  }catch(e){feedback.hidden=false;feedback.classList.add('message-error');feedback.textContent=e.code==='auth/email-already-in-use'?'L’account esiste già. Usa la stessa password e premi “Accedi e preiscriviti”, senza creare un nuovo account.':e.code==='auth/invalid-credential'?'Email o password non valide. Usa Recupera password se necessario.':e.message||'Operazione non riuscita. Riprova.';feedback.scrollIntoView({behavior:'smooth',block:'center'});}
  finally{busy=false;buttons().forEach(b=>b.disabled=false);}
 });
 el('reset-password').onclick=async()=>{const email=el('account-email');if(!email.value||!email.reportValidity())return;try{await a.sendPasswordResetEmail(auth,email.value.trim());feedback.hidden=false;feedback.textContent='Se l’account è disponibile, riceverai le istruzioni per recuperare la password.';}catch{feedback.hidden=false;feedback.textContent='Recupero non disponibile: attendi e riprova.';}};
}catch(e){feedback.textContent='Collegamento non disponibile: '+e.message;}

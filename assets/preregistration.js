import {config} from './preregistration-config.js';
const el=id=>document.getElementById(id);
const status=el('service-status');
const local=['localhost','127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('test')==='emulator';
let auth,authSDK,call,busy=false,verifyAfter=0,cursor=null;
const labels={received:'Ricevuta',contacted:'Contattata',closed:'Chiusa',not_found:'Nessuna preiscrizione attiva'};
async function run(action) {
  if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{await action();}catch(error){status.textContent=messages[error.code] || error.message || 'Operazione non riuscita. Riprova.';}
  finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}
}
const messages={'auth/invalid-credential':'Email o password non valide.','auth/email-already-in-use':'Questo account esiste già: usa Accedi oppure Recupera password.','auth/too-many-requests':'Troppi tentativi: attendi prima di riprovare.','auth/weak-password':'Scegli una password più robusta.','functions/unauthenticated':'Accedi per continuare.','functions/permission-denied':'Verifica l’email o accedi con un account autorizzato.','functions/unavailable':'Servizio temporaneamente non disponibile.','functions/failed-precondition':'Ricezione non ancora disponibile o richiesta scaduta. Contatta GinTho.','functions/aborted':'La richiesta è cambiata: ricarica l’elenco.'};
function receipt(data){status.textContent=`${local?'PROVA LOCALE — ':''}${labels[data.status]||data.status}${data.id?' · Riferimento: '+data.id:''}${data.expiresAt?' · Termine conservazione: '+new Date(data.expiresAt).toLocaleDateString('it-IT'):''}. Nessun pagamento richiesto. Nessuna abilitazione SPORT assegnata.`;}
if(!local && (!config.enabled || !config.firebase || !config.appCheckSiteKey)) {
  status.textContent='Preiscrizioni non ancora aperte: collegamento Firebase in preparazione. Nessun dato può essere inviato da questa pagina.';
} else {
  try {
    const base='https://www.gstatic.com/firebasejs/12.0.0/';
    const [appSDK,a,f]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-functions.js')]);authSDK=a;
    const settings=local?{projectId:'demo-gintho-prereg',apiKey:'demo-key',authDomain:'demo-gintho-prereg.firebaseapp.com'}:config.firebase;
    if(!local && (settings.projectId!=='gintho-crono' || location.origin!=='https://ginthoweb.github.io'))throw Error('Configurazione del sito non valida');
    const app=appSDK.initializeApp(settings,'gintho-preregistration');
    if(!local){const check=await import(base+'firebase-app-check.js');check.initializeAppCheck(app,{provider:new check.ReCaptchaEnterpriseProvider(config.appCheckSiteKey),isTokenAutoRefreshEnabled:true});}
    auth=a.getAuth(app);auth.languageCode='it';
    if(local)a.connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:false});
    await a.setPersistence(auth,a.inMemoryPersistence);
    const functions=f.getFunctions(app,config.region);if(local)f.connectFunctionsEmulator(functions,'127.0.0.1',5001);
    call=async(name,data={})=>(await f.httpsCallable(functions,name)(data)).data;
    document.querySelectorAll('[data-service]').forEach(section=>section.inert=false);
    status.textContent=local?'PROVA LOCALE: usa solo dati inventati. Le email appaiono nel terminale Auth.':'Accedi o crea un account, verifica l’email e presenta la preiscrizione.';
    a.onAuthStateChanged(auth,user=>{el('account-state').textContent=user?`Accesso: ${user.email} · ${user.emailVerified?'email verificata':'email da verificare'}`:'Non hai effettuato l’accesso.';el('requests')?.replaceChildren();});
    const credentials=()=>({email:el('account-email').value.trim(),password:el('account-password').value});
    el('login-form').onsubmit=event=>{event.preventDefault();run(async()=>{const c=credentials();await a.signInWithEmailAndPassword(auth,c.email,c.password);el('account-password').value='';status.textContent='Accesso eseguito. Premi Aggiorna sessione e stato.';});};
    el('register').onclick=()=>run(async()=>{if(!el('login-form').reportValidity())return;if(!el('account-privacy').checked)throw Error('Leggi e conferma l’informativa prima di creare l’account.');const c=credentials();if(c.password.length<8)throw Error('Per un nuovo account usa almeno 8 caratteri.');await a.createUserWithEmailAndPassword(auth,c.email,c.password);el('account-password').value='';status.textContent='Account creato. Premi Invia email di verifica. Non è stata ancora presentata una preiscrizione.';});
    el('reset-password').onclick=()=>run(async()=>{const email=el('account-email');if(!email.value || !email.reportValidity())return;await a.sendPasswordResetEmail(auth,email.value.trim());status.textContent='Se l’account è disponibile, riceverai le istruzioni di recupero.';});
    el('verify').onclick=()=>run(async()=>{if(!auth.currentUser)throw Error('Accedi prima.');if(Date.now()<verifyAfter)throw Error('Attendi un minuto prima di richiedere un altro messaggio.');await a.sendEmailVerification(auth.currentUser,{url:location.origin+'/iscrizione.html',handleCodeInApp:false});verifyAfter=Date.now()+60000;status.textContent=local?'Link di verifica nel terminale Auth: nessuna email reale inviata.':'Email di verifica richiesta. Controlla anche la posta indesiderata, poi torna qui e aggiorna la sessione.';});
    el('refresh').onclick=()=>run(async()=>{if(!auth.currentUser)throw Error('Accedi prima.');await a.reload(auth.currentUser);await auth.currentUser.getIdToken(true);el('account-state').textContent=`${auth.currentUser.email} · ${auth.currentUser.emailVerified?'email verificata':'email da verificare'}`;receipt(await call('preregistrationStatus'));});
    el('signout').onclick=()=>run(async()=>{await a.signOut(auth);el('requests')?.replaceChildren();status.textContent='Sessione chiusa.';});
    el('preregistration-form')?.addEventListener('submit',event=>{event.preventDefault();run(async()=>{const form=event.currentTarget;if(!form.reportValidity())return;const input={firstName:el('first-name').value,lastName:el('last-name').value,adult:el('adult').checked,privacyRead:el('privacy-read').checked,termsRead:el('terms-read').checked,testerInterest:el('tester-interest').checked,privacyVersion:'preregistration-2026-10-17-v1'};receipt(await call('preregistrationSubmit',input));});});
    el('withdraw')?.addEventListener('click',()=>{el('withdraw-confirmation').hidden=false;});
    el('withdraw-cancel')?.addEventListener('click',()=>{el('withdraw-confirmation').hidden=true;});
    el('withdraw-confirm')?.addEventListener('click',()=>run(async()=>{await call('preregistrationWithdraw');el('withdraw-confirmation').hidden=true;status.textContent='Preiscrizione ritirata e cancellata. L’account condiviso con l’app e le autorizzazioni SPORT restano invariati.';}));
    el('load-requests')?.addEventListener('click',()=>{cursor=null;run(load);});
    el('next-requests')?.addEventListener('click',()=>run(load));
    async function load(){
      const result=await call('preregistrationAdminList',cursor?{cursor}:{});cursor=result.cursor;
      const target=el('requests');target.replaceChildren();el('next-requests').hidden=!cursor;
      for(const row of result.rows){const article=document.createElement('article');article.className='card';
        const title=document.createElement('h2');title.textContent=`${row.firstName} ${row.lastName}`;
        const details=document.createElement('p');details.textContent=`${row.email} · UID ${row.id} · ${labels[row.status]} · Interesse tester: ${row.testerInterest?'sì':'no'} · Scadenza ${new Date(row.expiresAt).toLocaleDateString('it-IT')}`;article.append(title,details);
        for(const [next,label] of (row.status==='received'?[['contacted','Segna come contattata'],['closed','Chiudi richiesta']]:row.status==='contacted'?[['closed','Chiudi richiesta']]:[])){const button=document.createElement('button');button.className='btn secondary';button.textContent=label;button.onclick=()=>run(async()=>{await call('preregistrationAdminReview',{id:row.id,revision:row.revision,status:next});cursor=null;await load();});article.append(button);}
        target.append(article);
        const access=document.createElement('p');access.textContent='Accesso tester: '+(row.testerAccess?.status||'none')+(row.testerAccess?.expiresAt?' · scadenza '+new Date(row.testerAccess.expiresAt).toLocaleDateString('it-IT'):'');article.append(access);
        if(row.testerAccess?.status!=='external'){
          const days=document.createElement('input');days.type='number';days.min='1';days.max='30';days.value='7';days.setAttribute('aria-label','Giorni di prova per '+row.email);
          const consent=document.createElement('input');consent.type='checkbox';const label=document.createElement('label');label.append(consent,document.createTextNode(' Confermo l’abilitazione o revoca tester per questo account. Non è un’ammissione associativa.'));
          const note=document.createElement('p');note.textContent='Una revoca non raggiunge un dispositivo offline fino alla verifica online o alla scadenza del permesso già firmato.';article.append(days,label,note);
          for(const [action,text] of [['grant','Abilita SPORT temporaneamente'],['revoke','Revoca accesso tester']]){const b=document.createElement('button');b.className='btn secondary';b.textContent=text;b.onclick=()=>run(async()=>{if(!consent.checked)throw Error('Conferma l’operazione sul tester selezionato.');if(action==='grant'&&!days.reportValidity())return;const result=await call('preregistrationTesterAccess',{id:row.id,action,...(action==='grant'?{days:Number(days.value)}:{}),confirmed:true});consent.checked=false;status.textContent='Operazione tester: '+result.action+(result.expiresAt?' · scadenza '+new Date(result.expiresAt).toLocaleDateString('it-IT'):'')+'. Ricarica l’elenco per aggiornare lo stato.';});article.append(b);}
        }else{const note=document.createElement('p');note.textContent='Licenza gestita dalla procedura esistente: questa pagina non la modifica.';article.append(note);}
      }status.textContent=`${result.rows.length} richieste in questa pagina. SPORT richiede una tua operazione e conferma separate.`;
    }
  }catch(error){status.textContent='Collegamento non disponibile: '+error.message;document.querySelectorAll('[data-service]').forEach(section=>section.inert=true);}
}

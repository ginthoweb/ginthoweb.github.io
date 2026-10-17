import {config} from './preregistration-config.js';
import {buildCsv} from './preregistration-csv.mjs';
const el=id=>document.getElementById(id);
let messageTarget=null;
function showMessage(value,error=false){
  const target=messageTarget?.isConnected?messageTarget:el('service-status');
  target.textContent=value;target.hidden=false;
  target.classList.toggle('message-error',error);
  if(target===el('service-status'))target.scrollIntoView({block:'nearest',behavior:'smooth'});
}
const status={set textContent(value){showMessage(value);}};
document.addEventListener('click',event=>{messageTarget=event.target.closest('[data-service]')?.querySelector('[data-feedback]')||el('service-status');},true);
document.addEventListener('submit',event=>{messageTarget=event.target.closest('[data-service]')?.querySelector('[data-feedback]')||el('service-status');},true);
const local=['localhost','127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('test')==='emulator';
let auth,authSDK,call,busy=false,verifyAfter=0,cursor=null;
let listView='received',pageNumber=1;
const testerLabels={none:'Non abilitato',active:'Attivo',expired:'Scaduto',revoked:'Revocato',external:'Gestito con altra procedura'};
const labels={received:'Ricevuta',contacted:'Contattata',closed:'Chiusa',not_found:'Nessuna preiscrizione attiva'};
async function run(action) {
  if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{await action();}catch(error){showMessage(messages[error.code] || error.message || 'Operazione non riuscita. Riprova.',true);}
  finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}
}
const messages={'auth/invalid-credential':'Email o password non valide.','auth/email-already-in-use':'Questo account esiste già: usa Accedi oppure Recupera password.','auth/too-many-requests':'Troppi tentativi: attendi prima di riprovare.','auth/weak-password':'Scegli una password più robusta.','functions/unauthenticated':'Accedi per continuare.','functions/permission-denied':'Verifica l’email o accedi con un account autorizzato.','functions/unavailable':'Servizio temporaneamente non disponibile.','functions/failed-precondition':'Ricezione non ancora disponibile o richiesta scaduta. Contatta GinTho.','functions/aborted':'La richiesta è cambiata: ricarica l’elenco.'};
function advance(id){const target=el(id);if(!target)return;target.scrollIntoView({block:'start',behavior:'smooth'});target.querySelector('h2')?.focus({preventScroll:true});}
function updateSteps(user){
  if(!el('email-step'))return;
  const verified=!!user?.emailVerified;
  el('login-form').hidden=!!user;el('session-actions').hidden=!user;
  if(user)el('account-step').querySelector('[data-feedback]').hidden=true;
  el('email-step').hidden=!user || verified;
  el('request-fields').disabled=!verified;
  el('request-locked').hidden=verified;
  el('request-step').classList.toggle('step-locked',!verified);
  el('progress-account').classList.toggle('complete',!!user);
  el('progress-email').classList.toggle('complete',verified);
  el('account-state').textContent=user?`Accesso: ${user.email}${verified?' · email verificata':' · verifica email richiesta'}`:'Crea un account oppure accedi con quello che usi già nell’app.';
}
function receipt(data){
  if(el('email-step')){
    const received=data.status!=='not_found';
    el('receipt-step').hidden=!received;el('manage-request').hidden=!received;
    el('request-fields').disabled=received || !auth?.currentUser?.emailVerified;
    el('progress-request').classList.toggle('complete',received);
    if(received){el('request-step').querySelector('[data-feedback]').hidden=true;el('receipt-data').textContent=`Stato: ${labels[data.status]||data.status}. Riferimento: ${data.id}. Conservazione fino al ${new Date(data.expiresAt).toLocaleDateString('it-IT')}. Nessun pagamento richiesto; SPORT non viene abilitato automaticamente.`;messageTarget=el('receipt-step').querySelector('[data-feedback]');status.textContent=local?'PROVA LOCALE — preiscrizione ricevuta.':'Preiscrizione inviata e ricevuta correttamente.';advance('receipt-step');}
    else{messageTarget=el('request-step').querySelector('[data-feedback]');status.textContent='Email verificata. Ora completa i dati e premi “Invia la preiscrizione gratuita”. La richiesta non è ancora stata inviata.';advance('request-step');}
  }else status.textContent=`${labels[data.status]||data.status}${data.id?' · Riferimento: '+data.id:''}. La verifica email non presenta una preiscrizione.`;
}
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
    el('service-status').hidden=true;
    a.onAuthStateChanged(auth,user=>{el('account-state').textContent=user?`Accesso: ${user.email} · ${user.emailVerified?'email verificata':'email da verificare'}`:'Non hai effettuato l’accesso.';updateSteps(user);if(!el('email-step'))el('login-form').hidden=!!user;el('requests')?.replaceChildren();if(!user && el('receipt-step')){el('receipt-step').hidden=true;el('manage-request').hidden=true;el('preregistration-form').reset();}});
    async function syncAccount(){
      if(!auth.currentUser)throw Error('Accedi prima.');await a.reload(auth.currentUser);await auth.currentUser.getIdToken(true);updateSteps(auth.currentUser);
      if(!auth.currentUser.emailVerified){messageTarget=el('email-step')?.querySelector('[data-feedback]')||messageTarget;status.textContent='Email non ancora verificata. Apri il link ricevuto e poi premi “Ho verificato l’email: continua”.';if(el('email-step'))advance('email-step');return;}
      if(el('email-step'))receipt(await call('preregistrationStatus'));
      else{el('account-state').textContent=`Accesso: ${auth.currentUser.email} · email verificata`;status.textContent='Accesso verificato. Premi “Carica richieste” nella sezione qui sotto.';}
    }
    const credentials=()=>({email:el('account-email').value.trim(),password:el('account-password').value});
    el('login-form').onsubmit=event=>{event.preventDefault();run(async()=>{const c=credentials();await a.signInWithEmailAndPassword(auth,c.email,c.password);el('account-password').value='';await syncAccount();});};
    el('register').onclick=()=>run(async()=>{if(!el('login-form').reportValidity())return;if(!el('account-privacy').checked)throw Error('Leggi e conferma l’informativa prima di creare l’account.');const c=credentials();if(c.password.length<8)throw Error('Per un nuovo account usa almeno 8 caratteri.');await a.createUserWithEmailAndPassword(auth,c.email,c.password);el('account-password').value='';updateSteps(auth.currentUser);messageTarget=el('email-step')?.querySelector('[data-feedback]')||messageTarget;if(el('email-step'))advance('email-step');status.textContent='Account creato. Invio dell’email di verifica in corso…';try{await a.sendEmailVerification(auth.currentUser,{url:location.origin+'/iscrizione.html',handleCodeInApp:false});verifyAfter=Date.now()+60000;status.textContent=local?'PROVA LOCALE: link di verifica nel terminale Auth.':'Email di verifica inviata. Apri il link ricevuto, poi torna qui per completare i dati. Non è stata ancora inviata una preiscrizione.';}catch(error){status.textContent='Account creato, ma non è stato possibile inviare l’email. Premi “Invia di nuovo l’email” tra qualche istante.';}});
    el('reset-password').onclick=()=>run(async()=>{const email=el('account-email');if(!email.value || !email.reportValidity())return;await a.sendPasswordResetEmail(auth,email.value.trim());status.textContent='Se l’account è disponibile, riceverai le istruzioni di recupero.';});
    el('verify').onclick=()=>run(async()=>{if(!auth.currentUser)throw Error('Accedi prima.');if(Date.now()<verifyAfter)throw Error('Attendi un minuto prima di richiedere un altro messaggio.');await a.sendEmailVerification(auth.currentUser,{url:location.origin+'/iscrizione.html',handleCodeInApp:false});verifyAfter=Date.now()+60000;status.textContent=local?'Link di verifica nel terminale Auth: nessuna email reale inviata.':'Email di verifica richiesta. Controlla anche la posta indesiderata, poi torna qui e aggiorna la sessione.';});
    el('refresh').onclick=()=>run(syncAccount);
    let checkedAt=0;
    window.addEventListener('focus',()=>{if(el('email-step') && auth.currentUser && !auth.currentUser.emailVerified && !busy && Date.now()-checkedAt>10000){checkedAt=Date.now();run(syncAccount);}});
    el('signout').onclick=()=>run(async()=>{await a.signOut(auth);el('requests')?.replaceChildren();status.textContent='Sessione chiusa.';});
    el('preregistration-form')?.addEventListener('submit',event=>{event.preventDefault();run(async()=>{const form=event.currentTarget;if(!form.reportValidity())return;const input={firstName:el('first-name').value,lastName:el('last-name').value,adult:el('adult').checked,privacyRead:el('privacy-read').checked,termsRead:el('terms-read').checked,testerInterest:el('tester-interest').checked,privacyVersion:'preregistration-2026-10-17-v1'};receipt(await call('preregistrationSubmit',input));});});
    el('withdraw')?.addEventListener('click',()=>{el('withdraw-confirmation').hidden=false;});
    el('withdraw-cancel')?.addEventListener('click',()=>{el('withdraw-confirmation').hidden=true;});
    el('withdraw-confirm')?.addEventListener('click',()=>run(async()=>{await call('preregistrationWithdraw');el('withdraw-confirmation').hidden=true;if(el('receipt-step')){el('receipt-step').hidden=true;el('manage-request').hidden=true;el('progress-request').classList.remove('complete');el('request-fields').disabled=false;messageTarget=el('request-step').querySelector('[data-feedback]');advance('request-step');}status.textContent='Preiscrizione ritirata e cancellata. L’account condiviso con l’app e le autorizzazioni SPORT restano invariati.';}));
    el('load-requests')?.addEventListener('click',()=>{cursor=null;pageNumber=1;run(load);});
    el('next-requests')?.addEventListener('click',()=>{pageNumber++;run(load);});
    el('tab-pending')?.addEventListener('click',()=>selectView('received'));
    el('tab-directory')?.addEventListener('click',()=>selectView(el('directory-filter').value));
    el('directory-filter')?.addEventListener('change',()=>selectView(el('directory-filter').value));
    function selectView(view){
      if(busy)return;listView=view;cursor=null;pageNumber=1;
      el('tab-pending').setAttribute('aria-pressed',String(view==='received'));
      el('tab-directory').setAttribute('aria-pressed',String(view!=='received'));
      el('directory-controls').hidden=view==='received';
      el('list-heading').textContent=view==='received'?'Richieste da gestire':'Elenco preiscritti e archivio';
      run(load);
    }
    el('export-requests')?.addEventListener('click',()=>run(async()=>{
      messageTarget=el('list-feedback');const rows=[];let next=null;let pages=0;const seen=new Set();const view=listView;
      do{
        if(++pages>200)throw Error('Elenco troppo ampio: usa un filtro più specifico. Nessun file parziale creato.');
        status.textContent=`Esportazione in corso: ${rows.length} righe raccolte…`;
        const result=await call('preregistrationAdminList',{view,...(next?{cursor:next}:{})});
        for(const row of result.rows)if(!seen.has(row.id)){seen.add(row.id);rows.push(row);}
        if(result.cursor===next && next)throw Error('Esportazione interrotta: cursore non aggiornato. Nessun file parziale creato.');
        next=result.cursor;
        if(rows.length>10000)throw Error('Elenco oltre 10.000 righe: usa un filtro più specifico. Nessun file parziale creato.');
      }while(next);
      if(!rows.length){status.textContent='Nessun preiscritto da esportare con questo filtro.';return;}
      const url=URL.createObjectURL(new Blob([buildCsv(rows)],{type:'text/csv;charset=utf-8;'}));
      const link=document.createElement('a');link.href=url;link.download=`GinTho-preiscritti-${view}-${new Date().toISOString().slice(0,10)}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      status.textContent=`Esportate ${rows.length} righe in CSV, includendo tutte le pagine del filtro scelto. È un elenco preiscritti, non il libro soci. Conserva il file con accesso riservato e cancellalo quando non serve più.`;
    }));
    async function load(){
      messageTarget=el('requests').parentElement.querySelector(':scope > [data-feedback]')||messageTarget;
      const result=await call('preregistrationAdminList',{view:listView,...(cursor?{cursor}:{})});cursor=result.cursor;
      if(el('page-label'))el('page-label').textContent=`Pagina ${pageNumber} · ${result.rows.length} richieste`;
      const target=el('requests');target.replaceChildren();el('next-requests').hidden=!cursor;
      for(const row of result.rows){const article=document.createElement('article');article.className='card';article.setAttribute('data-service','');
        let cardBody=article;if(listView!=='received'){const disclosure=document.createElement('details');const summary=document.createElement('summary');summary.textContent=`${row.firstName} ${row.lastName} · ${row.email} · ${labels[row.status]} · SPORT ${testerLabels[row.testerAccess?.status]||'Non abilitato'}`;cardBody=document.createElement('div');disclosure.append(summary,cardBody);article.append(disclosure);}
        const title=document.createElement('h2');title.textContent=`${row.firstName} ${row.lastName}`;
        const details=document.createElement('p');details.textContent=`${row.email} · UID ${row.id} · ${labels[row.status]} · Interesse tester: ${row.testerInterest?'sì':'no'} · Scadenza ${new Date(row.expiresAt).toLocaleDateString('it-IT')}`;cardBody.append(title,details);const accountState=document.createElement('p');accountState.textContent=row.accountDisabled?'Account DISATTIVATO':'Account attivo';cardBody.append(accountState);
        for(const [next,label] of (row.status==='received'?[['contacted','Conferma presa in carico'],['closed','Archivia richiesta']]:row.status==='contacted'?[['closed','Archivia richiesta']]:row.status==='closed'?[['contacted','Riapri richiesta e prendi in carico']]:[])){const button=document.createElement('button');button.className='btn secondary';button.textContent=label;button.onclick=()=>run(async()=>{await call('preregistrationAdminReview',{id:row.id,revision:row.revision,status:next});cursor=null;pageNumber=1;await load();if(next==='contacted')status.textContent='Presa in carico confermata. Email all’utente in coda, normalmente inviata entro cinque minuti.';});cardBody.append(button);}
        target.append(article);
        const access=document.createElement('p');access.textContent='Accesso tester: '+(testerLabels[row.testerAccess?.status]||'Non abilitato')+(row.testerAccess?.expiresAt?' · scadenza '+new Date(row.testerAccess.expiresAt).toLocaleDateString('it-IT'):'');cardBody.append(access);
        if(row.testerAccess?.status!=='external'){
          const days=document.createElement('input');days.type='number';days.min='1';days.max='30';days.value='7';days.setAttribute('aria-label','Giorni di prova per '+row.email);
          const consent=document.createElement('input');consent.type='checkbox';const label=document.createElement('label');label.append(consent,document.createTextNode(' Confermo l’abilitazione o revoca tester per questo account. Non è un’ammissione associativa.'));
          const note=document.createElement('p');note.textContent='Una revoca non raggiunge un dispositivo offline fino alla verifica online o alla scadenza del permesso già firmato.';cardBody.append(days,label,note);
          for(const [action,text] of [['grant','Abilita SPORT temporaneamente'],['revoke','Revoca accesso tester']]){const b=document.createElement('button');b.className='btn secondary';b.textContent=text;b.onclick=()=>run(async()=>{if(!consent.checked)throw Error('Conferma l’operazione sul tester selezionato.');if(action==='grant'&&!days.reportValidity())return;const result=await call('preregistrationTesterAccess',{id:row.id,action,...(action==='grant'?{days:Number(days.value)}:{}),confirmed:true});consent.checked=false;status.textContent=(result.action==='grant'?'SPORT abilitato':'Accesso tester revocato')+(result.expiresAt?' · scadenza '+new Date(result.expiresAt).toLocaleDateString('it-IT'):'')+(result.action==='grant'?'. Email di abilitazione in coda, normalmente inviata entro cinque minuti.':'')+' Ricarica l’elenco per aggiornare lo stato.';});cardBody.append(b);}
        }else{const note=document.createElement('p');note.textContent='Licenza gestita dalla procedura esistente: questa pagina non la modifica.';cardBody.append(note);}
        if(row.testerAccess?.status!=='external'){
          const manage=document.createElement('button');manage.className='btn secondary';manage.style.borderColor='#ee9b8d';manage.style.marginTop='20px';manage.textContent=row.accountDisabled?'Riattiva account':'Disattiva utente';
          manage.onclick=()=>run(async()=>{
            const action=row.accountDisabled?'enable':'disable';
            if(!window.confirm(action==='disable'?`Disattivare ${row.email}? L’accesso sarà bloccato e SPORT revocato. I dati resteranno recuperabili fino alla scadenza prevista. La revoca su un telefono offline arriva alla verifica online o alla scadenza del permesso memorizzato.`:`Riattivare ${row.email}? SPORT resterà revocato: occorrerà una nuova abilitazione separata.`))return;
            await call('preregistrationAccountState',{id:row.id,action,confirmed:true});cursor=null;pageNumber=1;await load();status.textContent=action==='disable'?'Utente disattivato. Dati conservati e accesso tester revocato.':'Account riattivato. SPORT richiede una nuova abilitazione separata.';
          });cardBody.append(manage);
        }
        const feedback=document.createElement('p');feedback.className='feedback';feedback.setAttribute('data-feedback','');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');feedback.hidden=true;cardBody.append(feedback);
      }status.textContent=listView==='received'?`${result.rows.length} richieste da gestire in questa pagina. Quelle contattate o archiviate restano nell’elenco preiscritti.`:`${result.rows.length} preiscritti in questa pagina. L’archiviazione non cancella i dati e non revoca SPORT. Il CSV include tutte le pagine del filtro selezionato.`;
    }
  }catch(error){status.textContent='Collegamento non disponibile: '+error.message;document.querySelectorAll('[data-service]').forEach(section=>section.inert=true);}
}

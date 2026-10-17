import {config} from './preregistration-config.js';
export const local=['127.0.0.1','localhost'].includes(location.hostname)&&new URLSearchParams(location.search).get('test')==='emulator';
export async function client(){
 if(!local&&(!config.enabled||location.origin!=='https://ginthoweb.github.io'))throw Error('Servizio non disponibile da questo indirizzo');
 const base='https://www.gstatic.com/firebasejs/12.0.0/';const [appSDK,a,f]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-functions.js')]);
 const app=appSDK.initializeApp(local?{apiKey:'demo-key',projectId:'demo-gintho-prereg',authDomain:'demo-gintho-prereg.firebaseapp.com'}:config.firebase,'gintho-automatic');
 if(!local){const check=await import(base+'firebase-app-check.js');check.initializeAppCheck(app,{provider:new check.ReCaptchaEnterpriseProvider(config.appCheckSiteKey),isTokenAutoRefreshEnabled:true});}
 const auth=a.getAuth(app);auth.languageCode='it';if(local)a.connectAuthEmulator(auth,'http://127.0.0.1:9099');await a.setPersistence(auth,a.inMemoryPersistence);
 const functions=f.getFunctions(app,config.region);if(local)f.connectFunctionsEmulator(functions,'127.0.0.1',5001);
 return {auth,a,call:async(name,data)=>(await f.httpsCallable(functions,name)(data)).data};
}
export function received(data){return `Riferimento: ${data.id}. Stato: richiesta ricevuta. Conservazione fino al ${new Date(data.expiresAt).toLocaleDateString('it-IT')}. Nessun pagamento richiesto. SPORT resta un’abilitazione separata. Riceverai anche una ricevuta via email, normalmente entro 5 minuti.`;}

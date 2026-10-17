// Explicit local opt-in only. No Firebase imports or network calls on the public draft.
const local = ["localhost","127.0.0.1"].includes(location.hostname);
if (local && new URLSearchParams(location.search).get("test") === "emulator") {
  const panel = document.createElement("section");
  panel.className = "container card";
  panel.innerHTML = `<h2>Laboratorio locale iscrizioni</h2>
    <p>Solo dati inventati. Simulazione su progetto demo: nessuna domanda all'associazione, email reale, quota o licenza.</p>
    <form id="lab-login"><label>Email fittizia <input name="email" type="email" required autocomplete="off"></label>
    <label>Password di prova <input name="password" type="password" minlength="8" required autocomplete="off"></label>
    <button>Accedi</button><button type="button" id="lab-register">Crea account di prova</button></form>
    <button id="lab-verify">Genera link verifica nell'emulatore</button>
    <button id="lab-refresh">Ho verificato: aggiorna sessione e stato</button><button id="lab-signout">Esci</button>
    <p>Il link di verifica appare nel terminale degli emulatori; non viene spedito.</p>
    <fieldset><legend>Dichiarazioni simulate sui documenti in bozza</legend>
    <label><input type="checkbox" id="lab-statute"> Ho letto la bozza di statuto (solo prova).</label><br>
    <label><input type="checkbox" id="lab-privacy"> Ho letto la traccia privacy soci (solo prova).</label><br>
    <label><input type="checkbox" id="lab-review-ack"> Comprendo la valutazione del Consiglio e la separazione da SPORT.</label></fieldset>
    <button id="lab-submit">Invia dati fittizi all'emulatore</button>
    <p id="lab-status" role="status" aria-live="polite"></p>
    <details><summary>Revisione amministrativa di prova</summary><p>Serve un secondo account verificato con ruolo membershipReviewer assegnato nell'emulatore. Non puoi deliberare sulla tua domanda.</p><button id="lab-list">Carica ultime 50 domande</button><div id="lab-applications"></div></details>`;
  document.querySelector("main").append(panel);
  const status = panel.querySelector("#lab-status");
  const run = async action => {
    const buttons = panel.querySelectorAll("button");
    buttons.forEach(b => b.disabled = true);
    try { await action(); } catch(error) { status.textContent = error.message; }
    finally { buttons.forEach(b => b.disabled = false); }
  };
  try {
    const base = "https://www.gstatic.com/firebasejs/12.0.0/";
    const [appSDK,authSDK,functionsSDK] = await Promise.all([import(base+"firebase-app.js"),import(base+"firebase-auth.js"),import(base+"firebase-functions.js")]);
    const app = appSDK.initializeApp({projectId:"demo-gintho-membership",apiKey:"demo-only-key",authDomain:"demo-gintho-membership.firebaseapp.com"},"membership-emulator");
    const auth = authSDK.getAuth(app);
    authSDK.connectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:false});
    await authSDK.setPersistence(auth,authSDK.inMemoryPersistence);
    const functions = functionsSDK.getFunctions(app,"europe-west1");
    functionsSDK.connectFunctionsEmulator(functions,"127.0.0.1",5001);
    const call = async (name,data={}) => (await functionsSDK.httpsCallable(functions,name)(data)).data;
    const login = panel.querySelector("#lab-login");
    login.addEventListener("submit",e => {e.preventDefault();run(async()=>{await authSDK.signInWithEmailAndPassword(auth,login.email.value,login.password.value);login.password.value="";status.textContent="Accesso demo eseguito. Verifica email necessaria.";});});
    panel.querySelector("#lab-register").onclick = () => run(async()=>{if(!login.reportValidity())return;await authSDK.createUserWithEmailAndPassword(auth,login.email.value,login.password.value);login.password.value="";status.textContent="Account creato solo nell'emulatore. Genera ora il link di verifica.";});
    panel.querySelector("#lab-verify").onclick = () => run(async()=>{if(!auth.currentUser)throw Error("Accedi prima");await authSDK.sendEmailVerification(auth.currentUser);status.textContent="Link generato nel terminale dell'emulatore Auth. Aprilo per verificare l'account fittizio.";});
    panel.querySelector("#lab-refresh").onclick = () => run(async()=>{if(!auth.currentUser)throw Error("Accedi prima");await authSDK.reload(auth.currentUser);await auth.currentUser.getIdToken(true);status.textContent=JSON.stringify(await call("membershipRead"));});
    panel.querySelector("#lab-signout").onclick = () => run(async()=>{await authSDK.signOut(auth);panel.querySelector("#lab-applications").replaceChildren();status.textContent="Sessione demo chiusa.";});
    panel.querySelector("#lab-submit").onclick = () => run(async()=>{
      const form = document.querySelector("#membership-form");
      form.requestSubmit();
      if(!form.reportValidity())return;
      if(!["lab-statute","lab-privacy","lab-review-ack"].every(id=>panel.querySelector("#"+id).checked))throw Error("Completa le dichiarazioni simulate");
      const data = Object.fromEntries(["firstName","lastName","birthDate","birthPlace","address","city","phone"].map(key=>[key,form.elements.namedItem(key).value]));
      data.acknowledgements={statute:true,privacy:true,review:true,draft:true};
      data.versions={statute:"draft-2026-10-17",privacy:"draft-2026-10-17"};
      const receipt = await call("membershipSubmit",data);
      status.textContent=`Ricevuta SOLO DEMO: ${receipt.id}, stato ${receipt.status}. SPORT non richiesto. L'email registrata è quella dell'account verificato.`;
    });
    panel.querySelector("#lab-list").onclick = () => run(async()=>{
      const target = panel.querySelector("#lab-applications");target.replaceChildren();
      for(const row of await call("membershipReviewList")){
        const article=document.createElement("article");
        const info=document.createElement("pre");info.style.whiteSpace="pre-wrap";info.textContent=JSON.stringify(row,null,2);article.append(info);
        const reason=document.createElement("textarea");reason.maxLength=1000;reason.placeholder="Riferimento e motivazione della deliberazione simulata";reason.setAttribute("aria-label","Motivazione per "+row.id);article.append(reason);
        for(const [next,label] of (row.status==="received"?[["under_review","Prendi in valutazione"]]:row.status==="under_review"?[["approved","Simula ammissione"],["rejected","Simula rigetto"]]:[])){
          const button=document.createElement("button");button.textContent=label;
          button.onclick=()=>run(async()=>{const result=await call("membershipReview",{id:row.id,revision:row.revision,status:next,reason:reason.value});article.replaceChildren(document.createTextNode(`Esito demo: ${result.status}. Ricarica l'elenco. Nessuna abilitazione SPORT.`));});article.append(button);
        }target.append(article);
      }
    });
    status.textContent="Laboratorio collegato agli emulatori locali. Non usare dati reali.";
  } catch(error) { status.textContent="Laboratorio non disponibile: "+error.message;panel.querySelectorAll("button").forEach(b=>b.disabled=true); }
}

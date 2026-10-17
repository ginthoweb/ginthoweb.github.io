# GinTho Web — integrazione locale, non pubblicata

Questa è una copia del sito esistente `ginthoweb/ginthoweb.github.io`, scaricata dal repository pubblico (base `9bca0dd`) il 17 ottobre 2026, con le modifiche dello ZIP applicate sopra. Non è un sito distinto. Le altre pagine, immagini, download e dimostrazioni sono conservati. Il menu mantiene un'unica voce GinTho Sport Community e aggiunge Diventa socio.

Il percorso `/mnt/data/GinTho_Sito_Iscrizione_BOZZA.zip` non esiste su questo PC Windows. È stato aperto lo ZIP locale equivalente in `consegna/A7g-Step3d`, verificandone l'elenco; non si presume identità binaria con l'allegato remoto. README, modello di domanda e bozze HTML sono stati letti. Lo statuto Word originale non è stato modificato né nuovamente verificato in questa integrazione.

## Cosa si può vedere ora

Apri `iscrizione.html`: compilazione con dati inventati, riepilogo e stampa locale. Nessun account, invio o salvataggio sul sito pubblico. Senza JavaScript il modulo è bloccato per evitare un invio accidentale nell'indirizzo della pagina. La pagina segnala che l'associazione non è ancora registrata. Statuto e privacy soci restano bozze; la privacy del sito personale resta distinta. La quota di 20 euro è una proposta, non un pagamento o prezzo di SPORT.

## Aggiornare GitHub, quando deciderai di pubblicare

1. Scarica prima una copia aggiornata del repository. Confronta eventuali modifiche successive alla base `9bca0dd`.
2. Crea un ramo di lavoro, per esempio `bozza-iscrizione`, nell'attuale repository. Non creare un altro repository o sito.
3. Carica **soltanto** i file elencati come `modified` o `new` nel manifesto della consegna. Non eliminare altri file. I file di lavoro Firebase e questa guida possono restare fuori dal sito pubblico; non servono alla pagina di anteprima.
4. Controlla la differenza dei file, le pagine Home/Sport, menu su telefono, link, riepilogo e stampa. Lascia le bozze fuori dalla pubblicazione finché i testi non saranno approvati: `noindex` non rende privato un file.
5. Una futura unione nel ramo usato da GitHub Pages può pubblicare automaticamente il sito. Questa consegna non ha creato commit remoti, richieste di unione o pubblicazioni.

Non caricare ZIP, cartelle `node_modules`, dati emulatori, credenziali o file di esportazione. Il sito statico non esegue il backend Firebase solo perché questi sorgenti sono presenti nel repository.

## Laboratorio Firebase locale, facoltativo

Richiede Node 22, Firebase CLI e Java compatibile con la CLI installata. Dalla cartella di questa guida:

```powershell
cd membership-backend
npm install
node --test policy.test.cjs server.test.cjs
cd ..
firebase emulators:start --config firebase.membership.json --project demo-gintho-membership --only auth,firestore,functions
```

In un secondo terminale, nella stessa cartella:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Apri `http://127.0.0.1:8765/iscrizione.html?test=emulator`. Solo questo indirizzo locale abilita il laboratorio. I moduli Firebase vengono scaricati da gstatic solo dopo questo accesso esplicito. Servono connessione per i moduli e SDK backend installati; nessun dato di domanda viene inviato a gstatic.

Crea un account inventato, genera il link di verifica, apri il link mostrato nel terminale Auth e aggiorna la sessione. Le email dell'emulatore non sono recapitate. Compila il modulo con dati inventati; per l'invio demo l'email è sempre quella dell'account verificato, non il campo modificabile del riepilogo. Le caselle simulate non rappresentano accettazione di documenti definitivi. I minorenni restano bloccati lato server, pur potendo provare il riepilogo locale con il rappresentante.

Per la revisione crea e verifica un **secondo** account demo. Copia il suo UID dalla UI emulatori (`http://127.0.0.1:4000`), poi:

```powershell
$env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099'
node membership-backend/set-demo-reviewer.cjs UID_DEMO
```

Esci e accedi come revisore. Apri la sezione amministrativa: carica le ultime 50 domande, passa a valutazione, poi simula ammissione o rigetto con motivazione. Il ruolo non si assegna dalla pagina. Il revisore non può deliberare sulla propria domanda. Il prototipo non è un libro soci.

## Separazione degli stati

`received → under_review → approved / rejected`. La domanda è immutabile dopo il primo invio; un nuovo clic restituisce la ricevuta esistente. Ogni decisione controlla la revisione per evitare sovrascritture e registra autore, motivazione e data server nell'audit. Gli esiti sono consultabili tramite sessione; nessuna email di esito è implementata.

Quota, tesseramento e autorizzazione SPORT non derivano da questi stati. Il campo `sportAuthorization: not_requested` è solo descrittivo. Non esistono endpoint di concessione SPORT e nessuna funzione scrive `licenses`, trasferimenti, dispositivi o chiavi. Le funzioni SPORT esistenti non sono state modificate. Una futura concessione dovrà restare nella procedura amministrativa separata già usata dall'app, con controlli server e audit propri.

## Cosa manca prima di collegare gin tho-crono reale

Il project ID locale dell'app risulta `gintho-crono`; nessun accesso alla console o configurazione cloud reale è stato eseguito. Non usare il nome scritto con spazi come identificativo tecnico.

- Statuto adottato e senza note, stato effettivo dell'associazione, quota e anno deliberati; procedura minori approvata.
- Informativa soci definitiva: titolare, contatti, finalità, base giuridica, destinatari, conservazione e cancellazione. Versioni immutabili dei documenti, attestazione della presentazione e gestione del libro soci vanno definite.
- Registrazione app web Firebase, configurazione pubblica web corretta (quella Android non va riciclata), dominio autorizzato `ginthoweb.github.io`, provider di accesso e verifica email, mittente/modelli e limiti di invio. Nessuna credenziale privata nel browser.
- Regione effettiva da verificare: il prototipo propone `europe-west1`, coerente con il sorgente SPORT locale. App Check web e controlli antiabuso su account, indirizzi e invii; quote e monitoraggio costi.
- Ruoli revisori assegnati da un operatore fidato, revoca, accessi recenti e procedura organizzativa di deliberazione. Lista paginata, gestione richieste successive, ricorsi, comunicazione degli esiti, minimizzazione dei dati, conservazione e audit delle letture amministrative restano da completare.
- Integrazione delle regole nella configurazione esistente: il file `firestore.emulator.rules` nega tutto ed è **solo per il progetto demo**. Non sostituire le regole reali o i sorgenti delle funzioni SPORT. Nel progetto reale verificare anche che eventuali regole generiche non concedano accesso alle nuove collezioni; i permessi Firestore si combinano in modo permissivo.
- Revisione dei permessi IAM: Admin SDK opera con privilegi server e non è limitato dalle regole dei client. Servono un'identità di servizio adeguata e revisione dell'intero ambiente esistente.

Il backend rifiuta intenzionalmente ogni esecuzione fuori dagli emulatori `demo-gintho-membership`. Non basta cambiare un interruttore per aprire il servizio: serve una successiva implementazione revisionata per produzione, con test emulatori completi e configurazione reale. Non è fornito alcun comando di deploy.

Riferimenti tecnici consultati: [verifica email Firebase](https://firebase.google.com/docs/auth/web/manage-users), [funzioni callable](https://firebase.google.com/docs/functions/callable), [regole di accesso](https://firebase.google.com/docs/rules/basics).

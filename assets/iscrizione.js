"use strict";
(() => {
  const form = document.getElementById("membership-form");
  const birth = document.getElementById("birth-date");
  const guardian = document.getElementById("guardian");
  const review = document.getElementById("review");
  const output = document.getElementById("review-data");
  const today = new Date();
  const iso = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  birth.max = iso(today);
  const adulthood = `${today.getFullYear()-18}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  function updateGuardian() {
    const minor = birth.value !== "" && birth.value <= birth.max && birth.value > adulthood;
    guardian.hidden = !minor;
    guardian.querySelectorAll("input").forEach(input => { input.disabled = !minor; input.required = minor; });
  }
  form.addEventListener("input", () => { review.hidden = true; output.replaceChildren(); updateGuardian(); });
  form.addEventListener("submit", event => {
    event.preventDefault();
    updateGuardian();
    // Native 'required' also accepts spaces; reject those before producing a draft.
    for (const input of form.querySelectorAll("input[required]:not([type=checkbox])")) {
      input.setCustomValidity(input.value.trim() ? "" : "Compila questo campo.");
    }
    if (!form.reportValidity()) return;
    output.replaceChildren();
    const labels = [
      ["first-name", "Nome"], ["last-name", "Cognome"], ["birth-date", "Data di nascita"],
      ["birth-place", "Luogo di nascita"], ["address", "Indirizzo"], ["city", "Comune e provincia o Stato"],
      ["email", "Email"], ["phone", "Telefono"], ["guardian-name", "Genitore o rappresentante legale"],
      ["guardian-role", "Qualità"], ["guardian-email", "Email del rappresentante legale"]
    ];
    for (const [id, label] of labels) {
      const input = document.getElementById(id);
      if (input.disabled || !input.value.trim()) continue;
      const paragraph = document.createElement("p");
      const title = document.createElement("strong");
      title.textContent = `${label}: `;
      paragraph.append(title, document.createTextNode(input.value.trim()));
      output.append(paragraph);
    }
    review.hidden = false;
    review.focus();
  });
  form.addEventListener("input", event => { if (event.target.setCustomValidity) event.target.setCustomValidity(""); });
  form.addEventListener("reset", () => {
    review.hidden = true; output.replaceChildren();
    form.querySelectorAll("input").forEach(input => input.setCustomValidity(""));
    setTimeout(updateGuardian, 0);
  });
  document.getElementById("print-request").addEventListener("click", () => window.print());
  updateGuardian();
  form.inert = false;
})();


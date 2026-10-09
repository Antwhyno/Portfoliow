// 1) URL de votre application web Google Apps Script
const SHEET_URL = "https://script.google.com/macros/s/AKfycbzmLNXbHFqTQR8jXOzWts4s03Y62mMcVsxi3B9EL4dyufMK6JuH9pgMnY3gbsmxeN7C/exec";

// 2) Catalogue de produits
const PRODUCTS = [
  { id: "pk", name: "Porte-clés personnalisé", cat: "Objets perso", price: 4, desc: "Votre texte ou votre logo, en PLA de la couleur de votre choix." },
  { id: "ss", name: "Support de smartphone", cat: "Utilitaire", price: 9, desc: "Stable, inclinable, adapté aux coques épaisses." },
  { id: "or", name: "Organiseur de bureau", cat: "Utilitaire", price: 14, desc: "Stylos, câbles et notes, avec compartiments modulables." },
  { id: "fg", name: "Figurine en résine 8 cm", cat: "Déco", price: 25, desc: "Haut niveau de détail, ponçage inclus." },
  { id: "pl", name: "Plaque de porte gravée", cat: "Objets perso", price: 12, desc: "Nom, numéro ou message en relief." },
  { id: "pr", name: "Pièce de rechange", cat: "Sur mesure", price: null, desc: "Envoyez la pièce cassée ou ses cotes, nous la reproduisons." }
];

const $ = s => document.querySelector(s);
const eur = n => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const cart = {};
let filter = "Tous";

// Animation des couches du héro (sécurisé si présent)
const layersEl = $("#layers");
if (layersEl) {
  layersEl.innerHTML = [70, 78, 84, 88, 86, 80, 72, 66, 64, 68, 76, 84, 90]
    .map((w, i) => `<span style="--w:${w}%;--i:${i}"></span>`).join("");
}

function renderFilters() {
  const filtersEl = $("#filters");
  if (!filtersEl) return;
  const cats = ["Tous", ...new Set(PRODUCTS.map(p => p.cat))];
  filtersEl.innerHTML = cats.map(c =>
    `<button type="button" class="chip" data-cat="${c}" aria-pressed="${c === filter}">${c}</button>`).join("");
}

function renderProducts() {
  const gridEl = $("#grid");
  if (!gridEl) return;
  gridEl.innerHTML = PRODUCTS.filter(p => filter === "Tous" || p.cat === filter).map(p => `
    <article class="prod">
      <div class="thumb">${p.image ? `<img src="${p.image}" alt="${p.name}">` : `<span>${p.cat}</span>`}</div>
      <div class="prod-b">
        <h3>${p.name}</h3><p>${p.desc}</p>
        <div class="prod-f"><strong>${p.price != null ? eur(p.price) : "Sur devis"}</strong>
        <button type="button" class="btn sm" data-add="${p.id}">Ajouter</button></div>
      </div>
    </article>`).join("");
}

function totals() {
  let total = 0, devis = false;
  for (const id in cart) {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) continue;
    p.price == null ? (devis = true) : (total += p.price * cart[id]);
  }
  return { total, devis };
}

function renderCart() {
  const ids = Object.keys(cart);
  const countEl = $("#count");
  if (countEl) countEl.textContent = ids.reduce((n, id) => n + cart[id], 0);

  // Mise à jour de la liste principale
  const cartEl = $("#cart");
  if (cartEl) {
    cartEl.innerHTML = ids.length ? ids.map(id => {
      const p = PRODUCTS.find(x => x.id === id);
      return `<li><span>${p.name}</span>
        <button type="button" data-dec="${id}" aria-label="Retirer un ${p.name}">−</button><b>${cart[id]}</b>
        <button type="button" data-inc="${id}" aria-label="Ajouter un ${p.name}">+</button></li>`;
    }).join("") : `<li class="empty">Aucun article. Ajoutez des produits du catalogue ou décrivez simplement votre projet ci-dessous.</li>`;
  }

  // Mise à jour du récapitulatif dans la boîte modale
  const listePanierEl = $("#liste-panier");
  if (listePanierEl) {
    listePanierEl.innerHTML = ids.length ? ids.map(id => {
      const p = PRODUCTS.find(x => x.id === id);
      const subtotal = p.price != null ? eur(p.price * cart[id]) : "sur devis";
      return `<li>${p.name} (x${cart[id]}) — <strong>${subtotal}</strong></li>`;
    }).join("") : `<li>Aucun article sélectionné (demande sur mesure).</li>`;
  }

  // Totaux
  const { total, devis } = totals();
  const texteTotal = ids.length
    ? `Estimation : ${eur(total)}${devis ? " + articles sur devis" : ""}`
    : "Sur devis";

  const totalEl = $("#total");
  if (totalEl) totalEl.textContent = ids.length ? texteTotal : "";

  const montantTotalEl = $("#montant-total");
  if (montantTotalEl) montantTotalEl.textContent = texteTotal;
}

function change(id, d) {
  cart[id] = (cart[id] || 0) + d;
  if (cart[id] <= 0) delete cart[id];
  renderCart();
}

// Clics généraux (catalogue, filtres, sélection de projet)
document.addEventListener("click", e => {
  const t = e.target.closest("[data-add],[data-inc],[data-dec],[data-cat],[data-type]");
  if (!t) return;
  if (t.dataset.add) change(t.dataset.add, 1);
  if (t.dataset.inc) change(t.dataset.inc, 1);
  if (t.dataset.dec) change(t.dataset.dec, -1);
  if (t.dataset.cat) { filter = t.dataset.cat; renderFilters(); renderProducts(); }
  if (t.dataset.type) {
    e.preventDefault();
    if ($("#orderForm") && $("#orderForm").elements.type) {
      $("#orderForm").elements.type.value = t.dataset.type;
    }
    openOrder();
  }
});

const form = $("#orderForm");
const statusEl = $("#status");
const say = (txt, cls = "") => {
  if (statusEl) {
    statusEl.textContent = txt;
    statusEl.className = cls;
  }
};

// Gestion de la modale
const dlg = $("#orderDialog");
function openOrder() {
  say("");
  renderCart();
  if (dlg) dlg.showModal();
}

$("#openOrder")?.addEventListener("click", openOrder);
$("#closeOrder")?.addEventListener("click", () => dlg?.close());
dlg?.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

// Soumission du formulaire vers Google Apps Script
form?.addEventListener("submit", async e => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  const f = Object.fromEntries(new FormData(form));
  if (f.website) return; // Anti-spam piège à robots

  const { total, devis } = totals();
  const data = {
    ref: "CMD-" + Date.now().toString(36).toUpperCase(),
    type: f.type || "standard",
    nom: f.nom || "",
    email: f.email || "",
    tel: f.tel || "",
    livraison: f.livraison || "",
    lien: f.lien || "",
    message: f.message || "",
    articles: Object.keys(cart).map(id => {
      const p = PRODUCTS.find(x => x.id === id);
      return `${cart[id]} x ${p.name} (${p.price != null ? eur(p.price * cart[id]) : "sur devis"})`;
    }).join(" | ") || "Aucun article (projet sur mesure)",
    total: devis ? `${eur(total)} + sur devis` : eur(total)
  };

  const btn = $("#send");
  if (btn) btn.disabled = true;
  say("Envoi en cours…");

  try {
    if (SHEET_URL) {
      // mode: "no-cors" est impératif pour éviter le blocage CORS de Google Apps Script
      await fetch(SHEET_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data)
      });
      say(`Demande ${data.ref} bien envoyée ! Nous vous répondrons par e-mail.`, "ok");
    } else {
      console.info("Mode démo :", data);
      say(`Mode démo : Demande ${data.ref} enregistrée.`, "ok");
    }

    form.reset();
    for (const id in cart) delete cart[id];
    renderCart();

    // Fermeture automatique après 3 secondes
    setTimeout(() => {
      dlg?.close();
      say("");
      if (btn) btn.disabled = false;
    }, 3000);

  } catch (err) {
    console.error("Erreur d'envoi :", err);
    say("L'envoi a échoué. Vérifiez votre connexion ou contactez-nous par e-mail.", "err");
    if (btn) btn.disabled = false;
  }
});

// Initialisation au chargement
renderFilters();
renderProducts();
renderCart();
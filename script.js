// 1) URL de ton application web Google Apps Script
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

// Décor : animation de couches (si l'élément existe)
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
    `<button class="chip" data-cat="${c}" aria-pressed="${c === filter}">${c}</button>`).join("");
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
        <button class="btn sm" data-add="${p.id}">Ajouter</button></div>
      </div>
    </article>`).join("");
}

function totals() {
  let total = 0, devis = false;
  for (const id in cart) {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) continue;
    p.price == null ? devis = true : total += p.price * cart[id];
  }
  return { total, devis };
}

function renderCart() {
  const ids = Object.keys(cart);
  const countEl = $("#count");
  if (countEl) countEl.textContent = ids.reduce((n, id) => n + cart[id], 0);

  // 1. Mise à jour de la liste dans la page principale
  const cartEl = $("#cart");
  if (cartEl) {
    cartEl.innerHTML = ids.length ? ids.map(id => {
      const p = PRODUCTS.find(x => x.id === id);
      return `<li><span>${p.name}</span>
        <button type="button" data-dec="${id}" aria-label="Retirer un ${p.name}">−</button><b>${cart[id]}</b>
        <button type="button" data-inc="${id}" aria-label="Ajouter un ${p.name}">+</button></li>`;
    }).join("") : `<li class="empty">Aucun article sélectionné.</li>`;
  }

  // 2. Mise à jour de la liste récapitulative dans la modale
  const listePanierEl = $("#liste-panier");
  if (listePanierEl) {
    listePanierEl.innerHTML = ids.length ? ids.map(id => {
      const p = PRODUCTS.find(x => x.id === id);
      const subtotal = p.price != null ? eur(p.price * cart[id]) : "sur devis";
      return `<li>${p.name} (x${cart[id]}) — <strong>${subtotal}</strong></li>`;
    }).join("") : `<li>Votre panier est vide.</li>`;
  }

  // 3. Mise à jour des totaux (page + modale)
  const { total, devis } = totals();
  const texteTotal = ids.length
    ? `${eur(total)}${devis ? " + articles sur devis" : ""}`
    : "0,00 €";

  const totalEl = $("#total");
  if (totalEl) totalEl.textContent = ids.length ? `Estimation : ${texteTotal}` : "";

  const montantTotalEl = $("#montant-total");
  if (montantTotalEl) montantTotalEl.textContent = texteTotal;
}

function change(id, d) {
  cart[id] = (cart[id] || 0) + d;
  if (cart[id] <= 0) delete cart[id];
  renderCart();
}

// Clics généraux (catalogue, quantité, filtres)
document.addEventListener("click", e => {
  const t = e.target.closest("[data-add],[data-inc],[data-dec],[data-cat]");
  if (!t) return;
  if (t.dataset.add) change(t.dataset.add, 1);
  if (t.dataset.inc) change(t.dataset.inc, 1);
  if (t.dataset.dec) change(t.dataset.dec, -1);
  if (t.dataset.cat) { filter = t.dataset.cat; renderFilters(); renderProducts(); }
});

// Gestion de la modale de commande
const dlg = $("#orderDialog");
const form = $("#orderForm") \vert{}\vert{} $("#commandeForm");
const confirmation = $("#confirmation");
const btnSubmit = $("#btnSubmit") \vert{}\vert{} $("#send");

function openOrder() {
  if (Object.keys(cart).length === 0) {
    alert("Veuillez ajouter au moins un produit à votre commande.");
    return;
  }
  if (confirmation) confirmation.style.display = "none";
  if (form) form.style.display = "block";
  renderCart();
  dlg.showModal();
}

$("#openOrder")?.addEventListener("click", openOrder);
$("#closeOrder")?.addEventListener("click", () => dlg.close());
dlg?.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

// Soumission du formulaire vers Google Sheets
form?.addEventListener("submit", async e => {
  e.preventDefault();

  if (Object.keys(cart).length === 0) {
    alert("Votre panier est vide.");
    return;
  }

  const { total, devis } = totals();
  const refCommande = "CMD-" + Date.now().toString(36).toUpperCase();

  // Extraction des valeurs selon les ID présents dans le HTML
  const payload = {
    ref: refCommande,
    nom: $("#nom")?.value || "",
    email: $("#email")?.value || "",
    telephone: $("#telephone")?.value || "",
    remarques: $("#remarques")?.value || "",
    articles: Object.keys(cart).map(id => {
      const p = PRODUCTS.find(x => x.id === id);
      return `${p.name} x${cart[id]} (${p.price != null ? eur(p.price * cart[id]) : "sur devis"})`;
    }).join(" | "),
    total: devis ? `${eur(total)} + sur devis` : eur(total)
  };

  btnSubmit.disabled = true;
  btnSubmit.textContent = "Envoi en cours…";

  try {
    if (SHEET_URL) {
      await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
    }

    // Réinitialisation du panier et formulaire
    for (const id in cart) delete cart[id];
    renderCart();
    form.reset();

    // Affichage de la confirmation
    form.style.display = "none";
    if (confirmation) {
      confirmation.textContent = `Merci ! Votre commande (${refCommande}) a bien été enregistrée.`;
      confirmation.style.display = "block";
    }

    setTimeout(() => {
      dlg.close();
      if (confirmation) confirmation.style.display = "none";
      form.style.display = "block";
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Envoyer la commande";
    }, 3500);

  } catch (err) {
    console.error("Erreur lors de l'envoi :", err);
    alert("Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.");
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Envoyer la commande";
  }
});

// Initialisation
renderFilters();
renderProducts();
renderCart();
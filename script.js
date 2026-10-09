// 1) Collez ici l'URL de votre application web Google Apps Script (voir google-apps-script.gs)
const SHEET_URL = "";

// 2) Votre catalogue : modifiez, ajoutez ou supprimez des lignes. price: null = sur devis.
// Pour une vraie photo, ajoutez image: "images/mon-produit.jpg"
const PRODUCTS = [
  { id: "pk", name: "Porte-clés personnalisé", cat: "Objets perso", price: 4,  desc: "Votre texte ou votre logo, en PLA de la couleur de votre choix." },
  { id: "ss", name: "Support de smartphone",   cat: "Utilitaire",   price: 9,  desc: "Stable, inclinable, adapté aux coques épaisses." },
  { id: "or", name: "Organiseur de bureau",    cat: "Utilitaire",   price: 14, desc: "Stylos, câbles et notes, avec compartiments modulables." },
  { id: "fg", name: "Figurine en résine 8 cm", cat: "Déco",         price: 25, desc: "Haut niveau de détail, ponçage inclus." },
  { id: "pl", name: "Plaque de porte gravée",  cat: "Objets perso", price: 12, desc: "Nom, numéro ou message en relief." },
  { id: "pr", name: "Pièce de rechange",       cat: "Sur mesure",   price: null, desc: "Envoyez la pièce cassée ou ses cotes, nous la reproduisons." }
];

const $ = s => document.querySelector(s);
const eur = n => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const cart = {};
let filter = "Tous";

// Décor : pile de couches du héros
$("#layers").innerHTML = [70,78,84,88,86,80,72,66,64,68,76,84,90]
  .map((w, i) => `<span style="--w:${w}%;--i:${i}"></span>`).join("");

function renderFilters() {
  const cats = ["Tous", ...new Set(PRODUCTS.map(p => p.cat))];
  $("#filters").innerHTML = cats.map(c =>
    `<button class="chip" data-cat="${c}" aria-pressed="${c === filter}">${c}</button>`).join("");
}

function renderProducts() {
  $("#grid").innerHTML = PRODUCTS.filter(p => filter === "Tous" || p.cat === filter).map(p => `
    <article class="prod">
      <div class="thumb">${p.image ? `<img src="${p.image}" alt="${p.name}">` : `<span>${p.cat}</span>`}</div>
      <div class="prod-b">
        <h3>${p.name}</h3><p>${p.desc}</p>
        <div class="prod-f"><strong>${p.price != null ? eur(p.price) : "Sur devis"}</strong>
        <button class="btn sm" data-add="${p.id}">Ajouter</button></div>
      </div>
    </article>`).join("");
}

function renderCart() {
  const ids = Object.keys(cart);
  $("#count").textContent = ids.reduce((n, id) => n + cart[id], 0);
  $("#cart").innerHTML = ids.length ? ids.map(id => {
    const p = PRODUCTS.find(x => x.id === id);
    return `<li><span>${p.name}</span>
      <button data-dec="${id}" aria-label="Retirer un ${p.name}">−</button><b>${cart[id]}</b>
      <button data-inc="${id}" aria-label="Ajouter un ${p.name}">+</button></li>`;
  }).join("") : `<li class="empty">Aucun article. Ajoutez des produits du catalogue ou décrivez simplement votre projet.</li>`;
  const { total, devis } = totals();
  $("#total").textContent = ids.length
    ? `Estimation : ${eur(total)}${devis ? " + articles sur devis" : ""}` : "";
}

function totals() {
  let total = 0, devis = false;
  for (const id in cart) {
    const p = PRODUCTS.find(x => x.id === id);
    p.price == null ? devis = true : total += p.price * cart[id];
  }
  return { total, devis };
}

function change(id, d) {
  cart[id] = (cart[id] || 0) + d;
  if (cart[id] <= 0) delete cart[id];
  renderCart();
}

document.addEventListener("click", e => {
  const t = e.target.closest("[data-add],[data-inc],[data-dec],[data-cat],[data-type]");
  if (!t) return;
  if (t.dataset.add) change(t.dataset.add, 1);
  if (t.dataset.inc) change(t.dataset.inc, 1);
  if (t.dataset.dec) change(t.dataset.dec, -1);
  if (t.dataset.cat) { filter = t.dataset.cat; renderFilters(); renderProducts(); }
  if (t.dataset.type) $("#orderForm").elements.type.value = t.dataset.type;
});

const form = $("#orderForm"), status = $("#status");
const say = (txt, cls = "") => { status.textContent = txt; status.className = cls; };

form.addEventListener("submit", async e => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const f = Object.fromEntries(new FormData(form));
  if (f.website) return; // anti-spam : champ piège rempli par les robots
  const { total, devis } = totals();
  const data = {
    ref: "CMD-" + Date.now().toString(36).toUpperCase(),
    type: f.type, nom: f.nom, email: f.email, tel: f.tel || "", livraison: f.livraison,
    lien: f.lien || "", message: f.message || "",
    articles: Object.keys(cart).map(id => `${cart[id]} x ${PRODUCTS.find(p => p.id === id).name}`).join(" | ") || "Aucun",
    total: devis ? `${total} + sur devis` : String(total)
  };
  const btn = $("#send");
  btn.disabled = true; say("Envoi en cours…");
  try {
    if (SHEET_URL) {
      await fetch(SHEET_URL, { method: "POST", mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
      say(`Demande ${data.ref} envoyée. Nous vous répondons sous 24 h ouvrées.`, "ok");
    } else {
      console.info("Mode démo, données qui seraient envoyées :", data);
      say(`Mode démo : ajoutez l'URL Google Apps Script dans script.js pour enregistrer la demande ${data.ref}.`, "ok");
    }
    form.reset();
    for (const id in cart) delete cart[id];
    renderCart();
  } catch (err) {
    say("L'envoi a échoué. Vérifiez votre connexion et réessayez, ou écrivez-nous directement.", "err");
  }
  btn.disabled = false;
});

renderFilters(); renderProducts(); renderCart();

// À coller dans Google Sheets > Extensions > Apps Script, puis Déployer > Application web
// (Exécuter en tant que : moi / Accès : tout le monde). Copiez l'URL obtenue dans script.js.
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Commandes") || ss.insertSheet("Commandes");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Date", "Référence", "Projet", "Nom", "E-mail", "Téléphone", "Réception",
                     "Lien fichier", "Articles", "Total estimé (€)", "Message", "Statut"]);
  }
  const d = JSON.parse(e.postData.contents);
  sheet.appendRow([new Date(), d.ref, d.type, d.nom, d.email, d.tel, d.livraison,
                   d.lien, d.articles, d.total, d.message, "Nouvelle"]);
  return ContentService.createTextOutput("ok");
}

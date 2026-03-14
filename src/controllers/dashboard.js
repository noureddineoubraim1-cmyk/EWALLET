import { getUsers, saveUsers } from "../models/database.js";

// Recharger le currentUser depuis localStorage (données à jour)
const reloadCurrentUser = () => {
  const sessionRaw = sessionStorage.getItem("currentUser");
  if (!sessionRaw) return null;
  const users = getUsers();
  const session = JSON.parse(sessionRaw);
  return users.find(u => u.id === session.id);
};

let currentUser = reloadCurrentUser();

if (!currentUser) {
  window.location.replace("/src/view/login.html");
}

let wallet = currentUser.wallet;

// --- Affichage initial ---
document.getElementById("greetingName").textContent = currentUser.name;
document.getElementById("availableBalance").textContent = parseFloat(wallet.balance).toFixed(2) + " " + wallet.currency;

const totalIncome = wallet.transactions
  .filter(t => t.type === "credit")
  .reduce((sum, t) => sum + t.amount, 0);
document.getElementById("monthlyIncome").textContent = "+" + totalIncome.toFixed(2) + " " + wallet.currency;

const totalExpenses = wallet.transactions
  .filter(t => t.type === "debit")
  .reduce((sum, t) => sum + t.amount, 0);
document.getElementById("monthlyExpenses").textContent = "-" + totalExpenses.toFixed(2) + " " + wallet.currency;

document.getElementById("activeCards").textContent = wallet.cards.length;

// --- Afficher les transactions récentes ---
const renderTransactions = () => {
  const list = document.getElementById("recentTransactionsList");
  const transactions = reloadCurrentUser().wallet.transactions;

  if (transactions.length === 0) {
    list.innerHTML = `<p style="color:gray;">Aucune transaction.</p>`;
    return;
  }

  list.innerHTML = transactions.slice().reverse().map(t => {
    const isCredit = t.type === "credit";
    const label = isCredit ? "Transfert reçu" : "Transfert envoyé";
    const montant = isCredit ? `+${parseFloat(t.amount).toFixed(2)}` : `-${parseFloat(t.amount).toFixed(2)}`;
    const couleur = isCredit ? "green" : "red";
    return `
      <div class="transaction-item" style="padding:12px 0; border-bottom:1px solid #eee;">
        <div>
          <span style="font-weight:bold;">${label}</span>
          <span style="font-weight:bold; color:${couleur}; margin-left:8px;">${montant} ${wallet.currency}</span>
        </div>
        <div style="color:gray; font-size:0.9rem; margin-top:4px;">
          ${t.date} &nbsp;&nbsp; De: ${t.from} | Vers: ${t.to}
        </div>
      </div>
    `;
  }).join("");
};

renderTransactions();
const logout = () => {
  sessionStorage.removeItem("currentUser");
  window.location.href = "/src/view/login.html";
};

document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("logoutSidebarBtn").addEventListener("click", (e) => {
  e.preventDefault();
  logout();
});

// --- Remplir select carte source ---
const sourceCardSelect = document.getElementById("sourceCard");
sourceCardSelect.innerHTML = `<option value="" disabled selected>Sélectionner une carte</option>`;
wallet.cards.forEach(card => {
  sourceCardSelect.innerHTML += `<option value="${card.numcards}">${card.type.toUpperCase()} — **** ${card.numcards.slice(-4)} (${parseFloat(card.balance).toFixed(2)} MAD)</option>`;
});

// --- Remplir select bénéficiaire ---
const beneficiarySelect = document.getElementById("beneficiary");
beneficiarySelect.innerHTML = `<option value="" disabled selected>Choisir un bénéficiaire</option>`;
getUsers().forEach(user => {
  if (user.id !== currentUser.id) {
    user.wallet.cards.forEach(card => {
      beneficiarySelect.innerHTML += `<option value="${card.numcards}">${card.type.toUpperCase()} — **** ${card.numcards.slice(-4)} (${user.name})</option>`;
    });
  }
});

// --- Ouvrir / fermer formulaire transfert ---
const transferSection = document.getElementById("transfer-section");
document.getElementById("quickTransfer").addEventListener("click", () => transferSection.classList.remove("hidden"));
document.getElementById("closeTransferBtn").addEventListener("click", () => transferSection.classList.add("hidden"));
document.getElementById("cancelTransferBtn").addEventListener("click", () => transferSection.classList.add("hidden"));



// Callback 1 : Vérifier que le montant est valide
const checkAmount = (montant, sourceCardNum, beneficiaryId, callback) => {
  if (isNaN(montant) || montant <= 0) {
    alert(" Le montant doit être supérieur à 0.");
    return;
  }
  if (!sourceCardNum) {
    alert(" Veuillez sélectionner une carte source.");
    return;
  }
  if (!beneficiaryId) {
    alert(" Veuillez sélectionner un bénéficiaire.");
    return;
  }
  // Montant valide → continuer
  callback(montant, sourceCardNum, beneficiaryId);
};

// Callback 2 : Vérifier que le solde de la carte est suffisant
const checkSolde = (montant, sourceCardNum, beneficiaryId, callback) => {
  const users      = getUsers();
  const senderInDB = users.find(u => u.id === currentUser.id);
  const sourceCard = senderInDB.wallet.cards.find(c => c.numcards === sourceCardNum);

  const instantTransfer = document.getElementById("instantTransfer").checked;
  const frais = instantTransfer ? 13.4 : 0;
  const montantTotal = montant + frais;

  if (!sourceCard) {
    alert(" Carte source introuvable.");
    return;
  }
  if (parseFloat(sourceCard.balance) < montantTotal) {
    alert(` Solde insuffisant sur cette carte.\nDisponible : ${parseFloat(sourceCard.balance).toFixed(2)} MAD | Demandé : ${montantTotal.toFixed(2)} MAD (dont ${frais.toFixed(2)} MAD de frais)`);
    return;
  }
  // Solde OK → continuer
  callback(montant, sourceCardNum, beneficiaryId, users, senderInDB, sourceCard, frais);
};

// Callback 3 : Vérifier que le bénéficiaire existe et est différent de l'expéditeur
const checkBeneficiaire = (montant, sourceCardNum, beneficiaryId, users, senderInDB, sourceCard, frais, callback) => {
  const beneficiary = users.find(u => u.wallet.cards.find(c => c.numcards === beneficiaryId));

  if (!beneficiary) {
    alert(" Bénéficiaire introuvable.");
    return;
  }
  if (beneficiary.id === senderInDB.id) {
    alert(" Vous ne pouvez pas vous transférer de l'argent à vous-même.");
    return;
  }
  if (beneficiary.wallet.cards.length === 0) {
    alert(` ${beneficiary.name} n'a aucune carte pour recevoir le transfert.`);
    return;
  }
  // Bénéficiaire valide → continuer
  callback(montant, sourceCardNum, beneficiaryId, users, senderInDB, sourceCard, frais, beneficiary);
};

// Callback 4 : Créer les objets transaction (debit + credit)
const createTransfert = (montant, sourceCardNum, beneficiaryId, users, senderInDB, sourceCard, frais, beneficiary, callback) => {
  const today = new Date().toLocaleDateString("fr-FR");
  const transferId = Date.now().toString();

  const debitTransaction = {
    id:     transferId,
    type:   "debit",
    amount: montant + frais,
    date:   today,
    from:   sourceCard.numcards,
    to:     beneficiary.name,
  };

  const creditTransaction = {
    id:     transferId + "b",
    type:   "credit",
    amount: montant,
    date:   today,
    from:   senderInDB.name,
    to:     beneficiary.wallet.cards[0].numcards,
  };

  // Transactions créées → continuer
  callback(montant, users, senderInDB, sourceCard, frais, beneficiary, debitTransaction, creditTransaction);
};

// Callback 5 : Appliquer le débit/crédit, sauvegarder et rafraîchir l'affichage
const debitCredit = (montant, users, senderInDB, sourceCard, frais, beneficiary, debitTransaction, creditTransaction, formElement, callback) => {
  const beneficiaryCard = beneficiary.wallet.cards[0];
  const montantTotal = montant + frais;

  // Débiter l'expéditeur (montant + frais)
  sourceCard.balance        = parseFloat(sourceCard.balance) - montantTotal;
  senderInDB.wallet.balance = parseFloat(senderInDB.wallet.balance) - montantTotal;
  senderInDB.wallet.transactions.push(debitTransaction);

  // Créditer le bénéficiaire
  beneficiaryCard.balance        = parseFloat(beneficiaryCard.balance) + montant;
  beneficiary.wallet.balance     = parseFloat(beneficiary.wallet.balance) + montant;
  beneficiary.wallet.transactions.push(creditTransaction);

  // Sauvegarder dans localStorage
  saveUsers(users);

  // Mettre à jour sessionStorage et variables locales
  sessionStorage.setItem("currentUser", JSON.stringify(senderInDB));
  currentUser = senderInDB;
  wallet      = senderInDB.wallet;

  // Rafraîchir le DOM
  document.getElementById("availableBalance").textContent = parseFloat(wallet.balance).toFixed(2) + " " + wallet.currency;

  const newTotalExpenses = wallet.transactions
    .filter(t => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);
  document.getElementById("monthlyExpenses").textContent = "-" + newTotalExpenses.toFixed(2) + " " + wallet.currency;

  sourceCardSelect.innerHTML = `<option value="" disabled selected>Sélectionner une carte</option>`;
  wallet.cards.forEach(card => {
    sourceCardSelect.innerHTML += `<option value="${card.numcards}">${card.type.toUpperCase()} — **** ${card.numcards.slice(-4)} (${parseFloat(card.balance).toFixed(2)} MAD)</option>`;
  });

  renderTransactions();

  // Tout est bon → callback final
  callback(montant, beneficiary.name, formElement);
};

// --- Point d'entrée : soumission du formulaire ---
document.getElementById("transferForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const montant       = parseFloat(document.getElementById("amount").value);
  const sourceCardNum = document.getElementById("sourceCard").value;
  const beneficiaryId = document.getElementById("beneficiary").value;

  // Chaîne de callbacks imbriqués : 1 → 2 → 3 → 4 → 5
  checkAmount(montant, sourceCardNum, beneficiaryId,
    (montant, sourceCardNum, beneficiaryId) => {
      checkSolde(montant, sourceCardNum, beneficiaryId,
        (montant, sourceCardNum, beneficiaryId, users, senderInDB, sourceCard, frais) => {
          checkBeneficiaire(montant, sourceCardNum, beneficiaryId, users, senderInDB, sourceCard, frais,
            (montant, sourceCardNum, beneficiaryId, users, senderInDB, sourceCard, frais, beneficiary) => {
              createTransfert(montant, sourceCardNum, beneficiaryId, users, senderInDB, sourceCard, frais, beneficiary,
                (montant, users, senderInDB, sourceCard, frais, beneficiary, debitTransaction, creditTransaction) => {
                  debitCredit(montant, users, senderInDB, sourceCard, frais, beneficiary, debitTransaction, creditTransaction, e.target,
                    (montant, beneficiaryName, formElement) => {
                      alert(`Transfert de ${montant.toFixed(2)} MAD vers ${beneficiaryName} effectué avec succès !`);
                      formElement.reset();
                      transferSection.classList.add("hidden");
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});
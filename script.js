const STORAGE_KEY = "festa-junina-2706-respostas";
const CONFIG = window.FESTA_JUNINA_CONFIG || { appsScriptUrl: "" };

const foods = [
  { name: "Cachorro quente", max: 6 },
  { name: "Milho", max: 4 },
  { name: "Pamonha", max: 3 },
  { name: "Coxinha", max: 6 },
  { name: "Bolinha de queijo", max: 4 },
  { name: "Empadinha", max: 4 },
  { name: "Pipoca", max: 6 },
  { name: "Pastel", max: 4 },
  { name: "Mandioca", max: 3 },
  { name: "Torta salgada", max: 5 },
  { name: "Mini sanduíches", max: 4 },
  { name: "Cuscuz", max: 2 },
  { name: "Arroz doce", max: 3 },
  { name: "Bolo de fubá", max: 4 },
  { name: "Bolo de milho", max: 4 },
  { name: "Bolo de cenoura", max: 3 },
  { name: "Paçoca / doce de leite / pé de moleque", max: 6 },
  { name: "Quentão", max: 3 },
  { name: "Vinho quente", max: 3 },
  { name: "Outro (avisar qual)", max: 99, isOther: true }
];

const state = {
  selections: Object.fromEntries(foods.map((food) => [food.name, 0])),
  registrations: loadLocalRegistrations(),
  totals: {},
  isSubmitting: false
};

const form = document.querySelector("#party-form");
const itemsGrid = document.querySelector("#items-grid");
const formMessage = document.querySelector("#form-message");
const otherWrapper = document.querySelector("#other-wrapper");
const otherText = document.querySelector("#other-text");
const submitButton = form.querySelector("button[type='submit']");

function loadLocalRegistrations() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocalRegistrations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.registrations));
}

function requestAppsScript(action, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!CONFIG.appsScriptUrl) {
      resolve(null);
      return;
    }

    const callbackName = `festaJuninaCallback_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const script = document.createElement("script");
    const params = new URLSearchParams({
      action,
      callback: callbackName,
      payload: JSON.stringify(payload)
    });

    window[callbackName] = (response) => {
      cleanup();
      resolve(response);
    };

    function cleanup() {
      delete window[callbackName];
      script.remove();
    }

    script.onerror = () => {
      cleanup();
      reject(new Error("Não foi possível falar com a planilha."));
    };

    script.src = `${CONFIG.appsScriptUrl}?${params.toString()}`;
    document.body.append(script);
  });
}

async function loadRemoteRegistrations() {
  if (!CONFIG.appsScriptUrl) {
    state.totals = getLocalTotals();
    return;
  }

  try {
    const response = await requestAppsScript("totals");
    if (response?.ok && response.totals) {
      state.totals = response.totals;
      renderFoodCards();
    }
  } catch {
    showMessage("Não consegui atualizar as vagas agora. Ocê ainda pode responder.", "error");
  }
}

function getLocalTotals() {
  return state.registrations.reduce((totals, registration) => {
    Object.entries(registration.items).forEach(([itemName, quantity]) => {
      totals[itemName] = (totals[itemName] || 0) + Number(quantity);
    });

    return totals;
  }, {});
}

function getTakenCount(foodName) {
  return state.totals[foodName] || 0;
}

function getRemaining(food) {
  if (food.isOther) {
    return 99;
  }

  return Math.max(food.max - getTakenCount(food.name), 0);
}

function renderFoodCards() {
  itemsGrid.innerHTML = "";

  foods.forEach((food) => {
    const remaining = getRemaining(food);
    const selected = state.selections[food.name];
    const card = document.createElement("article");
    card.className = `food-card${remaining === 0 && !food.isOther ? " is-complete" : ""}`;

    const info = document.createElement("div");
    const title = document.createElement("p");
    title.className = "food-name";
    title.textContent = food.name;

    const meta = document.createElement("p");
    meta.className = "food-meta";
    meta.textContent = food.isOther
      ? "Escreva abaixo o que vai levar"
      : `${remaining} de ${food.max} disponíveis`;

    info.append(title, meta);

    const controls = document.createElement("div");
    controls.className = "quantity-control";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "-";
    minus.ariaLabel = `Diminuir ${food.name}`;
    minus.disabled = selected === 0 || state.isSubmitting;
    minus.addEventListener("click", () => updateSelection(food, -1));

    const value = document.createElement("output");
    value.textContent = selected;
    value.ariaLabel = `${selected} selecionado`;

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.ariaLabel = `Aumentar ${food.name}`;
    plus.disabled = state.isSubmitting || (!food.isOther && selected >= remaining);
    plus.addEventListener("click", () => updateSelection(food, 1));

    controls.append(minus, value, plus);
    card.append(info, controls);
    itemsGrid.append(card);
  });

  updateConditionalFields();
}

function updateSelection(food, change) {
  const current = state.selections[food.name];
  const remaining = getRemaining(food);
  const limit = food.isOther ? 99 : remaining;
  state.selections[food.name] = Math.max(0, Math.min(current + change, limit));
  renderFoodCards();
}

function updateConditionalFields() {
  const hasOtherFood = state.selections["Outro (avisar qual)"] > 0;
  otherWrapper.hidden = !hasOtherFood;
  otherText.required = hasOtherFood;
}

function getChosenItems() {
  return Object.fromEntries(
    Object.entries(state.selections).filter(([, quantity]) => quantity > 0)
  );
}

function resetSelections() {
  foods.forEach((food) => {
    state.selections[food.name] = 0;
  });
  otherText.value = "";
  renderFoodCards();
}

function showMessage(text, type = "success") {
  formMessage.textContent = text;
  formMessage.classList.toggle("error", type === "error");
}

function setSubmitting(isSubmitting) {
  state.isSubmitting = isSubmitting;
  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? "Confirmando..." : "Confirmar escolha";
  renderFoodCards();
}

async function handleSubmit(event) {
  event.preventDefault();
  const guestName = document.querySelector("#guest-name").value.trim();
  const items = getChosenItems();

  if (!guestName) {
    showMessage("Preencha seu nome para confirmar.", "error");
    return;
  }

  if (Object.keys(items).length === 0) {
    showMessage("Escolha pelo menos uma comida.", "error");
    return;
  }

  if (items["Outro (avisar qual)"] && !otherText.value.trim()) {
    showMessage("Conte qual é o outro item que ocê vai levar.", "error");
    return;
  }

  const limitedItems = {};
  for (const [foodName, quantity] of Object.entries(items)) {
    const food = foods.find((entry) => entry.name === foodName);
    const available = getRemaining(food);

    if (!food.isOther && quantity > available) {
      showMessage(`${foodName} já passou do limite disponível. Ajustei a lista pra ocê.`, "error");
      renderFoodCards();
      return;
    }

    limitedItems[foodName] = quantity;
  }

  const registration = {
    id: crypto.randomUUID(),
    guestName,
    otherFood: otherText.value.trim(),
    items: limitedItems,
    createdAt: new Date().toISOString()
  };

  setSubmitting(true);

  try {
    if (CONFIG.appsScriptUrl) {
      const response = await requestAppsScript("submit", registration);
      if (!response?.ok) {
        showMessage(response?.message || "Não consegui confirmar essa escolha agora.", "error");
        return;
      }

      state.totals = response.totals || {};
    } else {
      state.registrations.push(registration);
      saveLocalRegistrations();
      state.totals = getLocalTotals();
    }

    form.reset();
    resetSelections();
    showMessage("Escolha confirmada. Obrigado por ajudar no arraiá!");
  } catch {
    showMessage("Não consegui enviar para a planilha agora. Tente de novo em instantes.", "error");
  } finally {
    setSubmitting(false);
  }
}

form.addEventListener("submit", handleSubmit);
document.querySelector("#reset-form").addEventListener("click", () => {
  form.reset();
  resetSelections();
  showMessage("");
});

state.totals = getLocalTotals();
renderFoodCards();
loadRemoteRegistrations();

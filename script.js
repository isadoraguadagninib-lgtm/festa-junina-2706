const STORAGE_KEY = "festa-junina-2706-respostas";
const CONFIG = window.FESTA_JUNINA_CONFIG || { appsScriptUrl: "" };

const foods = [
  { name: "Mini cachorro quente (mínimo 50 unidades)", max: 2 },
  { name: "Milho", max: 0 },
  { name: "Coxinha (mínimo 50 unidades)", max: 4 },
  { name: "Bolinha de queijo (mínimo 50 unidades)", max: 4 },
  { name: "Pipoca", max: 0 },
  { name: "Pastelzinho (mínimo 50 unidades)", max: 4 },
  { name: "Mini esfiha (mínimo 50 unidades)", max: 4 },
  { name: "Mandioca", max: 0 },
  { name: "Torta salgada", max: 5 },
  { name: "Mini sanduíches (mínimo 50 unidades)", max: 2 },
  { name: "Cuscuz", max: 4 },
  { name: "1kg de amendoim japonês", max: 1 },
  { name: "1kg de amendoim torrado", max: 1 },
  { name: "Arroz doce", max: 2 },
  { name: "Bolo de fubá", max: 4 },
  { name: "Bolo de milho", max: 4 },
  { name: "Doce de abóbora", max: 2 },
  { name: "Doce de batata doce", max: 2 },
  { name: "Mini churros (mínimo 50 unidades)", max: 2 },
  { name: "Paçoca pote", max: 0 },
  { name: "Doce de leite", max: 0 },
  { name: "Pé de moleque/pé de moça", max: 0 },
  { name: "Quentão 3L", max: 3 },
  { name: "Vinho quente 3L", max: 3 },
  { name: "Outro (avisar qual)", max: 99, isOther: true }
];

const state = {
  selections: Object.fromEntries(foods.map((food) => [food.name, 0])),
  registrations: loadLocalRegistrations(),
  totals: {},
  totalsLoaded: !CONFIG.appsScriptUrl,
  isSubmitting: false
};

const form = document.querySelector("#party-form");
const itemsGrid = document.querySelector("#items-grid");
const formMessage = document.querySelector("#form-message");
const otherWrapper = document.querySelector("#other-wrapper");
const otherText = document.querySelector("#other-text");
const peopleNames = document.querySelector("#people-names");
const pixProof = document.querySelector("#pix-proof");
const submitButton = form.querySelector("button[type='submit']");
const thankYouScreen = document.querySelector("#thank-you-screen");

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
    state.totalsLoaded = true;
    return;
  }

  try {
    const response = await requestAppsScript("totals");
    if (response?.ok && response.totals) {
      state.totals = response.totals;
      state.totalsLoaded = true;
      renderFoodCards();
    }
  } catch {
    state.totalsLoaded = false;
    renderFoodCards();
    showMessage("Não consegui carregar as vagas da planilha. Atualize a página em instantes.", "error");
  }
}

function readPixProof() {
  const file = pixProof.files[0];

  if (!file) {
    return Promise.resolve(null);
  }

  if (file.type.startsWith("image/") && file.size > 800 * 1024) {
    return readCompressedImage(file);
  }

  if (file.size > 3 * 1024 * 1024) {
    return Promise.reject(new Error("Arquivo muito grande."));
  }

  return readFileAsPayload(file);
}

function readFileAsPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const [, base64 = ""] = result.split(",");
      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        base64
      });
    };
    reader.onerror = () => reject(new Error("Não consegui ler o comprovante."));
    reader.readAsDataURL(file);
  });
}

function readCompressedImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxSide = 900;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.62);
        const [, base64 = ""] = dataUrl.split(",");
        const cleanName = file.name.replace(/\.[^.]+$/, "");

        resolve({
          name: `${cleanName}.jpg`,
          type: "image/jpeg",
          base64
        });
      };

      image.onerror = () => reject(new Error("Não consegui preparar a imagem."));
      image.src = String(reader.result);
    };

    reader.onerror = () => reject(new Error("Não consegui ler o comprovante."));
    reader.readAsDataURL(file);
  });
}

async function submitRegistration(registration) {
  if (!CONFIG.appsScriptUrl) {
    state.registrations.push(registration);
    saveLocalRegistrations();
    state.totals = getLocalTotals();
    return true;
  }

  await fetch(CONFIG.appsScriptUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: "submit",
      payload: registration
    })
  });

  return true;
}

async function refreshTotalsQuietly() {
  try {
    const response = await requestAppsScript("totals");
    if (response?.ok && response.totals) {
      state.totals = response.totals;
      renderFoodCards();
    }
  } catch {
    // A confirmação do convidado não depende dessa atualização visual.
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
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
    card.className = `food-card${remaining === 0 && !food.isOther ? " is-complete is-unavailable" : ""}`;

    const info = document.createElement("div");
    const title = document.createElement("p");
    title.className = "food-name";
    title.textContent = food.name;

    const meta = document.createElement("p");
    meta.className = "food-meta";
    meta.textContent = !state.totalsLoaded && !food.isOther
      ? "Atualizando vagas..."
      : food.isOther
      ? "Escreva abaixo o que vai levar"
      : remaining === 0
      ? "Sem disponibilidade"
      : `${remaining} de ${food.max} disponíveis`;

    info.append(title, meta);

    const controls = document.createElement("div");
    controls.className = "quantity-control";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "-";
    minus.ariaLabel = `Diminuir ${food.name}`;
    minus.disabled = selected === 0 || state.isSubmitting || !state.totalsLoaded;
    minus.addEventListener("click", () => updateSelection(food, -1));

    const value = document.createElement("output");
    value.textContent = selected;
    value.ariaLabel = `${selected} selecionado`;

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.ariaLabel = `Aumentar ${food.name}`;
    plus.disabled = state.isSubmitting || !state.totalsLoaded || (!food.isOther && selected >= remaining);
    plus.addEventListener("click", () => updateSelection(food, 1));

    controls.append(minus, value, plus);
    card.append(info, controls);
    itemsGrid.append(card);
  });

  updateConditionalFields();
}

function updateSelection(food, change) {
  if (!state.totalsLoaded) {
    showMessage("Aguarde carregar as vagas da planilha.", "error");
    return;
  }

  const current = state.selections[food.name];
  const remaining = getRemaining(food);
  const limit = food.isOther ? 99 : remaining;

  if (change > 0) {
    state.selections[food.name] = Math.max(0, Math.min(current + change, limit));
  } else {
    state.selections[food.name] = Math.max(0, Math.min(current + change, limit));
  }
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
  submitButton.disabled = isSubmitting || !state.totalsLoaded;
  submitButton.textContent = isSubmitting ? "Enviando..." : "Confirmar escolha";
  renderFoodCards();
}

function showThankYouScreen() {
  document.body.classList.add("is-confirmed");
  document.querySelector(".page-shell").hidden = true;
  thankYouScreen.hidden = false;
  window.scrollTo(0, 0);
}

async function handleSubmit(event) {
  event.preventDefault();
  const guestName = document.querySelector("#guest-name").value.trim();
  const presentPeople = peopleNames.value.trim();
  const items = getChosenItems();

  if (!state.totalsLoaded) {
    showMessage("Aguarde carregar as vagas da planilha antes de confirmar.", "error");
    return;
  }

  if (!guestName) {
    showMessage("Preencha seu nome para confirmar.", "error");
    return;
  }

  if (Object.keys(items).length === 0) {
    showMessage("Escolha pelo menos uma comida.", "error");
    return;
  }

  if (!presentPeople) {
    showMessage("Preencha os participantes incluídos no Pix.", "error");
    return;
  }

  if (!pixProof.files[0]) {
    showMessage("Anexe o comprovante do pix.", "error");
    return;
  }

  if (!pixProof.files[0].type.startsWith("image/") && pixProof.files[0].size > 3 * 1024 * 1024) {
    showMessage("Envie um PDF de até 3 MB ou uma imagem do comprovante.", "error");
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
      showMessage(`${foodName} não tem disponibilidade suficiente. Ajustei a lista pra ocê.`, "error");
      renderFoodCards();
      return;
    }

    limitedItems[foodName] = quantity;
  }

  setSubmitting(true);

  let receipt;
  try {
    receipt = await readPixProof();
  } catch {
    showMessage("Não consegui ler o comprovante. Tente anexar novamente.", "error");
    setSubmitting(false);
    return;
  }

  const registration = {
    id: crypto.randomUUID(),
    guestName,
    peopleNames: presentPeople,
    otherFood: otherText.value.trim(),
    pixProof: receipt,
    items: limitedItems,
    createdAt: new Date().toISOString()
  };

  try {
    await submitRegistration(registration);

    if (CONFIG.appsScriptUrl) {
      Object.entries(limitedItems).forEach(([itemName, quantity]) => {
        state.totals[itemName] = (state.totals[itemName] || 0) + quantity;
      });
      refreshTotalsQuietly();
    }

    form.reset();
    resetSelections();
    showThankYouScreen();
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
submitButton.disabled = !state.totalsLoaded;
loadRemoteRegistrations();

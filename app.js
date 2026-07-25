let menuData = null;
let persons = [];
let currentPerson = null;
let activeCategory = null;

const STEPS = ["name", "category", "review"]; // "products" is a sub-step of "category"
let currentStep = "name";

const CATEGORIES = {
  burgers: { label: "Burger", icon: "🍔" },
  menus: { label: "Menüs", icon: "🍽️" },
  chicken_snacks: { label: "Chicken", icon: "🍗" },
  sides: { label: "Beilagen", icon: "🍟" },
  drinks: { label: "Getränke", icon: "🥤" },
  desserts: { label: "Desserts", icon: "🍦" },
  breakfast: { label: "Frühstück", icon: "🥞" },
  sauces: { label: "Saucen", icon: "🧂" }
};

document.addEventListener("DOMContentLoaded", () => {
  fetch("menu.json")
    .then(res => {
      if (!res.ok) throw new Error("menu.json konnte nicht geladen werden");
      return res.json();
    })
    .then(data => {
      menuData = data;
      initUI();
    })
    .catch(err => {
      document.getElementById("stepContainer").innerHTML =
        `<div style="padding:24px;color:#DA291C;font-size:13px">
          Fehler: ${err.message}<br>Stelle sicher, dass menu.json im selben
          Ordner liegt und die Seite über einen Webserver (z.B. GitHub Pages)
          geöffnet wird, nicht per Doppelklick.
        </div>`;
    });
});

function initUI() {
  const nameInput = document.getElementById("nameInput");
  nameInput.addEventListener("input", updatePrimaryButtonState);
  nameInput.addEventListener("keydown", e => {
    if (e.key === "Enter") handlePrimaryAction();
  });

  document.getElementById("backBtn").onclick = handleBack;
  document.getElementById("primaryActionBtn").onclick = handlePrimaryAction;
  document.getElementById("addMoreBtn").onclick = () => goToStep("category");

  document.getElementById("overviewBtn").onclick = openOverview;
  document.getElementById("closeOverviewBtn").onclick = closeOverview;
  document.getElementById("printBtn").onclick = () => window.print();
  document.getElementById("resetBtn").onclick = resetAll;

  document.getElementById("sheetOverlay").onclick = closeSheets;

  renderCategoryGrid();
  updatePersonCountBadge();
  goToStep("name");
}

/* ================= Step navigation ================= */

function goToStep(step, opts = {}) {
  currentStep = step;

  document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));

  if (step === "products") {
    document.getElementById("step-products").classList.add("active");
  } else {
    document.getElementById("step-" + step).classList.add("active");
  }

  renderStepIndicator(step);
  renderBottomBar(step);

  document.getElementById("backBtn").hidden = (step === "name");

  if (step === "category") {
    document.getElementById("catPersonName").textContent = currentPerson ? currentPerson.name : "";
    renderCategoryGrid();
  }

  if (step === "review") {
    document.getElementById("reviewPersonName").textContent = currentPerson ? currentPerson.name : "";
    renderReview();
  }

  if (step === "name") {
    document.getElementById("nameInput").focus();
  }

  document.getElementById("stepContainer").scrollTop = 0;
}

function renderStepIndicator(step) {
  const map = { name: "name", category: "category", products: "category", review: "review" };
  const activeKey = map[step];

  let seenActive = false;
  document.querySelectorAll(".step-indicator .dot").forEach(dot => {
    const key = dot.dataset.step;
    dot.classList.remove("done", "current");
    if (key === activeKey) {
      dot.classList.add("current");
      seenActive = true;
    } else if (!seenActive) {
      dot.classList.add("done");
    }
  });
}

function renderBottomBar(step) {
  const btn = document.getElementById("primaryActionBtn");
  const info = document.getElementById("bottomBarInfo");
  const bar = document.getElementById("bottomBar");
  bar.style.display = "flex";
  info.textContent = "";

  if (step === "name") {
    btn.textContent = "Weiter";
    updatePrimaryButtonState();
  } else if (step === "category") {
    const count = currentPerson ? currentPerson.items.length : 0;
    if (count > 0) {
      info.textContent = `${count} Artikel im Korb`;
      btn.textContent = "Fertig — Bestellung prüfen";
      btn.disabled = false;
    } else {
      info.textContent = "";
      btn.textContent = "Kategorie wählen";
      btn.disabled = true;
    }
  } else if (step === "products") {
    const count = currentPerson ? currentPerson.items.length : 0;
    info.textContent = count > 0 ? `${count} Artikel im Korb` : "";
    btn.textContent = "Fertig — Bestellung prüfen";
    btn.disabled = count === 0;
  } else if (step === "review") {
    bar.style.display = "none";
  }
}

function updatePrimaryButtonState() {
  if (currentStep !== "name") return;
  const btn = document.getElementById("primaryActionBtn");
  const name = document.getElementById("nameInput").value.trim();
  btn.disabled = name.length === 0;
}

function handlePrimaryAction() {
  if (currentStep === "name") {
    const name = document.getElementById("nameInput").value.trim();
    if (!name) return;
    currentPerson = { name, items: [] };
    goToStep("category");
  } else if (currentStep === "category" || currentStep === "products") {
    goToStep("review");
  }
}

function handleBack() {
  if (currentStep === "category") {
    if (confirm("Zurück zur Namenseingabe? Bereits gewählte Artikel bleiben erhalten.")) {
      goToStep("name");
    }
  } else if (currentStep === "products") {
    goToStep("category");
  } else if (currentStep === "review") {
    goToStep("category");
  }
}

/* ================= Toast ================= */

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("visible"), 1300);
}

/* ================= Category & product steps ================= */

function renderCategoryGrid() {
  const grid = document.getElementById("categoryGrid");
  grid.innerHTML = "";

  Object.entries(CATEGORIES).forEach(([key, { label, icon }]) => {
    const count = currentPerson
      ? currentPerson.items.filter(i => i.category === key).length
      : 0;

    const tile = document.createElement("button");
    tile.className = "category-tile" + (count > 0 ? " has-items" : "");
    tile.innerHTML = `
      <span class="tile-icon">${icon}</span>
      <span class="tile-label">${label}</span>
      <span class="tile-count">${count > 0 ? count + " gewählt" : ""}</span>
    `;
    tile.onclick = () => {
      activeCategory = key;
      renderProducts(key);
      goToStep("products");
    };

    grid.appendChild(tile);
  });
}

function renderProducts(category) {
  document.getElementById("productsTitle").textContent = CATEGORIES[category].label;

  const list = document.getElementById("productList");
  list.innerHTML = "";

  const items = menuData[category] || [];
  const icon = CATEGORIES[category].icon;

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "product-card";

    const isMenu = category === "menus";
    const qty = currentPerson
      ? currentPerson.items.filter(i => i.name === item.name).length
      : 0;

    card.innerHTML = `
      ${qty > 0 ? `<span class="qty-badge">${qty}×</span>` : ""}
      <div class="product-icon">${icon}</div>
      <h3>${item.name}</h3>
      <button class="${isMenu ? "is-menu" : ""}">${isMenu ? "Konfigurieren" : "+ Hinzufügen"}</button>
    `;

    card.querySelector("button").onclick = () => {
      if (isMenu) {
        openConfigurator(item, category);
      } else {
        currentPerson.items.push({ name: item.name, category });
        showToast(`${item.name} hinzugefügt`);
        renderProducts(category);
        renderBottomBar("products");
      }
    };

    list.appendChild(card);
  });
}

/* ================= Menu configurator (chip based) ================= */

function openConfigurator(menuItem, category) {
  const container = document.getElementById("configContainer");
  container.innerHTML = "";

  const title = document.createElement("div");
  title.className = "config-title";
  title.textContent = menuItem.name;
  container.appendChild(title);

  const selections = {};

  const groups = [
    ["größe", "Größe", menuData.meta.sizes || ["Normal", "Groß"]],
    ["getränk", "Getränk", menuData.options.drinkOptions],
    ["beilage", "Beilage", menuData.options.sideOptions],
    ["sauce", "Sauce", menuData.options.sauceOptions]
  ];

  groups.forEach(([key, label, options]) => {
    selections[key] = options[0];
    container.appendChild(createChipGroup(label, options, key, selections));
  });

  const addBtn = document.createElement("button");
  addBtn.className = "primary-btn full";
  addBtn.style.marginTop = "6px";
  addBtn.textContent = "Zum Warenkorb hinzufügen";

  addBtn.onclick = () => {
    currentPerson.items.push({
      name: menuItem.name,
      category,
      config: { ...selections }
    });
    closeSheets();
    showToast(`${menuItem.name} hinzugefügt`);
    renderProducts(category);
    renderBottomBar("products");
  };

  container.appendChild(addBtn);
  openSheet("configSheet");
}

function createChipGroup(label, options, key, selections) {
  const group = document.createElement("div");
  group.className = "config-group";

  const groupLabel = document.createElement("span");
  groupLabel.className = "config-group-label";
  groupLabel.textContent = label;
  group.appendChild(groupLabel);

  const chipWrap = document.createElement("div");
  chipWrap.className = "chip-options";

  options.forEach((opt, i) => {
    const chip = document.createElement("button");
    chip.className = "chip-option" + (i === 0 ? " selected" : "");
    chip.textContent = opt;
    chip.onclick = () => {
      selections[key] = opt;
      chipWrap.querySelectorAll(".chip-option").forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
    };
    chipWrap.appendChild(chip);
  });

  group.appendChild(chipWrap);
  return group;
}

function openSheet(id) {
  document.getElementById("sheetOverlay").classList.add("visible");
  document.getElementById(id).classList.add("open");
}

function closeSheets() {
  document.getElementById("sheetOverlay").classList.remove("visible");
  document.querySelectorAll(".bottom-sheet").forEach(s => s.classList.remove("open"));
}

/* ================= Review step ================= */

function renderReview() {
  const list = document.getElementById("reviewItemsList");
  list.innerHTML = "";

  if (!currentPerson || currentPerson.items.length === 0) {
    list.innerHTML = `<p class="empty-state">Noch keine Produkte gewählt.</p>`;
  } else {
    currentPerson.items.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "review-item";

      let configText = "";
      if (item.config) {
        const parts = [];
        if (item.config.größe) parts.push(item.config.größe);
        if (item.config.getränk && item.config.getränk !== "Kein Getränk") parts.push(item.config.getränk);
        if (item.config.beilage && item.config.beilage !== "Keine Beilage") parts.push(item.config.beilage);
        if (item.config.sauce && item.config.sauce !== "Keine Sauce") parts.push(item.config.sauce);
        if (parts.length > 0) {
          configText = `<span class="item-config">${parts.join(" · ")}</span>`;
        }
      }

      row.innerHTML = `
        <div class="review-item-text">
          <span class="item-name">${item.name}</span>
          ${configText}
        </div>
      `;

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "✕";
      removeBtn.onclick = () => {
        currentPerson.items.splice(idx, 1);
        renderReview();
      };

      row.appendChild(removeBtn);
      list.appendChild(row);
    });
  }

  renderReviewFooter();
}

function renderReviewFooter() {
  let footer = document.getElementById("reviewFooterBtn");
  if (!footer) {
    footer = document.createElement("button");
    footer.id = "reviewFooterBtn";
    footer.className = "primary-btn full";
    footer.style.marginTop = "12px";
    document.getElementById("step-review").appendChild(footer);
  }

  const hasItems = currentPerson && currentPerson.items.length > 0;
  footer.textContent = "Bestellung abschließen";
  footer.disabled = !hasItems;
  footer.onclick = finishPerson;
}

function finishPerson() {
  if (!currentPerson || currentPerson.items.length === 0) return;

  persons.push(currentPerson);
  const name = currentPerson.name;
  currentPerson = null;

  updatePersonCountBadge();
  document.getElementById("nameInput").value = "";
  showToast(`${name} fertig — nächster Gast?`);
  goToStep("name");
}

/* ================= Overview overlay ================= */

function openOverview() {
  renderSummary();
  document.getElementById("overviewScreen").classList.add("open");
}

function closeOverview() {
  document.getElementById("overviewScreen").classList.remove("open");
}

function updatePersonCountBadge() {
  document.getElementById("personCountBadge").textContent = persons.length;
}

function resetAll() {
  if (!confirm("Wirklich alles löschen?")) return;
  persons = [];
  updatePersonCountBadge();
  renderSummary();
}

function renderSummary() {
  const output = document.getElementById("summaryOutput");
  output.innerHTML = "";

  if (persons.length === 0) {
    output.innerHTML = `<p class="empty-state">Noch keine Bestellung abgeschlossen.</p>`;
    return;
  }

  persons.forEach((person, personIdx) => {
    const card = document.createElement("div");
    card.className = "person-card";

    const header = document.createElement("div");
    header.className = "person-card-header";
    header.innerHTML = `<h3>${person.name} <span class="person-badge">${person.items.length}</span></h3>`;

    const removeBtn = document.createElement("button");
    removeBtn.className = "person-card-remove";
    removeBtn.textContent = "Entfernen";
    removeBtn.onclick = () => {
      persons.splice(personIdx, 1);
      updatePersonCountBadge();
      renderSummary();
    };
    header.appendChild(removeBtn);

    const ul = document.createElement("ul");
    person.items.forEach(item => {
      const li = document.createElement("li");
      let html = item.name;
      if (item.config) {
        const parts = [];
        if (item.config.größe) parts.push(item.config.größe);
        if (item.config.getränk && item.config.getränk !== "Kein Getränk") parts.push(item.config.getränk);
        if (item.config.beilage && item.config.beilage !== "Keine Beilage") parts.push(item.config.beilage);
        if (item.config.sauce && item.config.sauce !== "Keine Sauce") parts.push(item.config.sauce);
        if (parts.length > 0) {
          html += `<span class="item-config">${parts.join(" · ")}</span>`;
        }
      }
      li.innerHTML = html;
      ul.appendChild(li);
    });

    card.appendChild(header);
    card.appendChild(ul);
    output.appendChild(card);
  });
}
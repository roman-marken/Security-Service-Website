const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const state = {
  estimate: null,
  deferredInstall: null,
};

const solutions = {
  office: {
    title: "Офис и бизнес-центр",
    text: "Фокус на контроле доступа, посетителях, парковке и сохранности техники.",
    items: ["СКУД с ролями сотрудников", "Пост охраны на ресепшене", "Видеоаналитика входов", "Тревожная кнопка и регламент эвакуации"],
  },
  warehouse: {
    title: "Склад и логистика",
    text: "Главная задача - периметр, зоны погрузки, ночные смены и учет транспорта.",
    items: ["Охрана КПП и доков", "Тепловизионные камеры периметра", "Маршруты обходов через QR-точки", "Реагирование мобильной группы"],
  },
  residential: {
    title: "Жилой комплекс",
    text: "Баланс безопасности, сервиса для жильцов и прозрачной коммуникации с управляющей компанией.",
    items: ["Консьерж-сервис и патрули", "Контроль гостевого доступа", "Мониторинг паркинга", "Ежедневные отчеты для УК"],
  },
  retail: {
    title: "Ритейл и торговые точки",
    text: "Контроль потерь, конфликтных ситуаций, кассовых зон и ночной охраны.",
    items: ["Антикражные сценарии", "Видеоразбор инцидентов", "Охрана открытия и закрытия", "Единая отчетность по сети"],
  },
};

function formatMoney(value) {
  return new Intl.NumberFormat("ru-UA", {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 0,
  }).format(value);
}

function showToast(message) {
  const toast = qs("[data-toast]");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function setTheme(theme) {
  document.documentElement.classList.toggle("light", theme === "light");
  localStorage.setItem("fortress-theme", theme);
}

function initActiveNavigation() {
  const current = location.pathname.split("/").pop() || "index.html";
  qsa(".nav a").forEach((link) => {
    const target = link.getAttribute("href");
    link.classList.toggle("active", target === current);
  });
}

function initHeader() {
  const header = qs("[data-header]");
  const nav = qs("[data-nav]");
  const menuToggle = qs("[data-menu-toggle]");
  if (!header) return;

  const updateHeader = () => header.classList.toggle("scrolled", window.scrollY > 12);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      menuToggle.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");
      document.body.classList.toggle("locked", isOpen);
    });

    qsa(".nav a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        document.body.classList.remove("locked");
      });
    });
  }

  qs("[data-theme-toggle]")?.addEventListener("click", () => {
    setTheme(document.documentElement.classList.contains("light") ? "dark" : "light");
  });
}

function renderSolution(key = "office") {
  const data = solutions[key];
  const output = qs("[data-solution-output]");
  if (!data || !output) return;
  output.innerHTML = `
    <h3>${data.title}</h3>
    <p>${data.text}</p>
    <ul>${data.items.map((item) => `<li>${item}</li>`).join("")}</ul>
    <button class="button button-primary" type="button" data-open-modal="quote">Получить план</button>
  `;
}

function initSolutions() {
  if (!qs("[data-solution-output]")) return;
  renderSolution();
  qsa("[data-solution]").forEach((button) => {
    button.addEventListener("click", () => {
      qsa("[data-solution]").forEach((item) => {
        item.classList.remove("active");
        item.setAttribute("aria-selected", "false");
      });
      button.classList.add("active");
      button.setAttribute("aria-selected", "true");
      renderSolution(button.dataset.solution);
    });
  });
}

function calculateEstimate() {
  const form = qs("[data-calculator]");
  if (!form) return;
  const data = new FormData(form);
  const area = Number(data.get("area") || 0);
  const guards = Number(data.get("guards") || 0);
  const multipliers = {
    office: 1,
    warehouse: 1.28,
    residential: 1.18,
    retail: 1.12,
  };
  const objectType = data.get("objectType");
  let total = 18000;
  total += area * 14 * (multipliers[objectType] || 1);
  total += guards * 22000;
  if (data.get("cameras")) total += Math.max(9000, area * 5);
  if (data.get("alarm")) total += 7800;
  if (data.get("access")) total += 12400;
  if (data.get("patrol")) total += 15600;

  const rounded = Math.round(total / 500) * 500;
  state.estimate = {
    objectType,
    area,
    guards,
    cameras: Boolean(data.get("cameras")),
    alarm: Boolean(data.get("alarm")),
    access: Boolean(data.get("access")),
    patrol: Boolean(data.get("patrol")),
    total: rounded,
    createdAt: new Date().toISOString(),
  };

  qs("[data-calc-price]").textContent = formatMoney(rounded);
  qs("[data-calc-note]").textContent =
    guards === 0 ? "Для объекта без поста рекомендуем минимум тревожную кнопку." : "Включены базовые операционные расходы и мониторинг.";
}

function initCalculator() {
  const form = qs("[data-calculator]");
  if (!form) return;
  form.addEventListener("input", calculateEstimate);
  form.addEventListener("change", calculateEstimate);
  qs("[data-save-estimate]")?.addEventListener("click", () => {
    calculateEstimate();
    localStorage.setItem("fortress-estimate", JSON.stringify(state.estimate));
    showToast("Расчет сохранен в клиентском портале");
  });
  calculateEstimate();
}

function initCases() {
  if (!qs("[data-filter]")) return;
  qsa("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      qsa("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
      qsa(".case-card").forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.category !== filter;
      });
    });
  });
}

function initFaq() {
  const faq = qs("[data-faq]");
  if (!faq) return;
  qsa("button", faq).forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.nextElementSibling;
      const nextState = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(nextState));
      if (panel) panel.hidden = !nextState;
    });
  });
}

function serializeForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function markInvalid(form) {
  qsa("input, textarea, select", form).forEach((field) => {
    field.classList.toggle("invalid", !field.checkValidity());
  });
}

function initLeadForms() {
  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-lead-form], [data-modal-form]");
    if (!form) return;
    event.preventDefault();
    markInvalid(form);

    if (!form.checkValidity()) {
      showToast("Проверьте обязательные поля");
      return;
    }

    const lead = {
      ...serializeForm(form),
      source: form.dataset.source || "contact",
      estimate: state.estimate,
      createdAt: new Date().toISOString(),
    };
    const leads = JSON.parse(localStorage.getItem("fortress-leads") || "[]");
    leads.push(lead);
    localStorage.setItem("fortress-leads", JSON.stringify(leads));

    const status = qs("[data-form-status]", form);
    if (status) status.textContent = "Заявка принята. Мы свяжемся с вами в ближайшее время.";
    showToast("Заявка отправлена");
    form.reset();
    qsa(".invalid", form).forEach((field) => field.classList.remove("invalid"));

    const dialog = qs("[data-modal]");
    if (dialog?.open && form.matches("[data-modal-form]")) dialog.close();
    renderPortal();
  });
}

function modalTemplate(mode, value = "") {
  const isAudit = mode === "audit";
  const title = isAudit ? "Бесплатный аудит безопасности" : "Получить расчет и план защиты";
  const message = value ? `Интересует: ${value}` : isAudit ? "Хочу провести аудит объекта." : "Нужен расчет охраны объекта.";
  return `
    <div class="modal-content">
      <p class="eyebrow">${isAudit ? "Audit" : "Request"}</p>
      <h2>${title}</h2>
      <p>Заполните короткую форму. Заявка сохранится в клиентском портале этого браузера.</p>
      <form data-modal-form data-source="${mode}" novalidate>
        <label>Имя<input name="name" required minlength="2" autocomplete="name" /></label>
        <label>Телефон<input name="phone" required pattern="^[+0-9 ()-]{9,}$" autocomplete="tel" /></label>
        <label>Email<input name="email" type="email" autocomplete="email" /></label>
        <label>Комментарий<textarea name="message" rows="4" required minlength="10">${message}</textarea></label>
        <label class="check-row"><input name="privacy" type="checkbox" required />Согласен на обработку заявки</label>
        <button class="button button-primary" type="submit">Отправить</button>
      </form>
    </div>
  `;
}

function openModal(mode, value = "") {
  const dialog = qs("[data-modal]");
  const content = qs("[data-modal-content]");
  if (!dialog || !content) return;
  content.innerHTML = modalTemplate(mode, value);
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function initActions() {
  document.addEventListener("click", (event) => {
    const modalButton = event.target.closest("[data-open-modal]");
    if (modalButton) openModal(modalButton.dataset.openModal);

    const serviceButton = event.target.closest("[data-service]");
    if (serviceButton) openModal("quote", serviceButton.dataset.service);

    const planButton = event.target.closest("[data-plan]");
    if (planButton) openModal("quote", `Тариф ${planButton.dataset.plan}`);
  });
}

function botReply(message) {
  const text = message.toLowerCase();
  if (text.includes("цена") || text.includes("стоимость") || text.includes("тариф")) {
    return "Стоимость зависит от площади, постов охраны и оборудования. Быстрее всего начать с калькулятора и сохранить расчет в портале.";
  }
  if (text.includes("срок") || text.includes("быстро") || text.includes("запуск")) {
    return "Базовый запуск обычно занимает 48-72 часа после аудита и согласования регламентов.";
  }
  if (text.includes("кам")) {
    return "Мы можем подключить существующие камеры, если они поддерживают безопасный удаленный доступ и стандартные протоколы.";
  }
  if (text.includes("инцидент") || text.includes("тревога")) {
    return "Для фиксации инцидента откройте страницу контактов и заполните форму рапорта. Она сохранится в клиентском портале.";
  }
  return "Я могу подсказать по тарифам, срокам запуска, камерам, аудиту и инцидентам. Для точного ответа оставьте контакты в форме.";
}

function appendMessage(text, type = "bot") {
  const log = qs("[data-chat-log]");
  if (!log) return;
  const node = document.createElement("div");
  node.className = `message ${type}`;
  node.textContent = text;
  log.append(node);
  log.scrollTop = log.scrollHeight;
}

function initChat() {
  const chat = qs("[data-chat]");
  if (!chat) return;

  const openChat = () => {
    chat.hidden = false;
    if (!chat.dataset.ready) {
      appendMessage("Здравствуйте. Чем помочь с безопасностью объекта?");
      chat.dataset.ready = "true";
    }
    qs("[data-chat-form] input")?.focus();
  };

  const closeChat = () => {
    chat.hidden = true;
  };

  qsa("[data-chat-open]").forEach((button) => button.addEventListener("click", openChat));
  qsa("[data-chat-close]").forEach((button) => button.addEventListener("click", closeChat));

  qs("[data-chat-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.message;
    const message = input.value.trim();
    if (!message) return;
    appendMessage(message, "user");
    input.value = "";
    setTimeout(() => appendMessage(botReply(message)), 350);
  });
}

function initRiskChecklist() {
  const form = qs("[data-risk-checklist]");
  if (!form) return;
  const scoreNode = qs("[data-risk-score]");
  const textNode = qs("[data-risk-text]");

  const update = () => {
    const checked = qsa("input:checked", form).length;
    const total = qsa("input", form).length || 1;
    const score = Math.round((checked / total) * 100);
    scoreNode.textContent = `${score}%`;
    textNode.textContent =
      score >= 80 ? "Контур выглядит сильным. Рекомендуем аудит регламентов." : score >= 50 ? "Есть база, но видны зоны риска." : "Нужен быстрый аудит и план закрытия критичных точек.";
  };

  form.addEventListener("change", update);
  update();
}

function initIncidentForm() {
  const form = qs("[data-incident-form]");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    markInvalid(form);
    if (!form.checkValidity()) {
      showToast("Заполните обязательные поля рапорта");
      return;
    }
    const incidents = JSON.parse(localStorage.getItem("fortress-incidents") || "[]");
    incidents.push({ ...serializeForm(form), createdAt: new Date().toISOString(), status: "new" });
    localStorage.setItem("fortress-incidents", JSON.stringify(incidents));
    form.reset();
    qsa(".invalid", form).forEach((field) => field.classList.remove("invalid"));
    showToast("Инцидент сохранен в портале");
    renderPortal();
  });
}

function initPlanCompare() {
  const form = qs("[data-plan-compare]");
  if (!form) return;
  const output = qs("[data-compare-output]");
  const update = () => {
    const values = qsa("input:checked", form).map((item) => item.value);
    if (!values.length) {
      output.textContent = "Выберите один или несколько тарифов для сравнения.";
      return;
    }
    output.textContent = `Сравнение: ${values.join(", ")}. Для точной сметы сохраните расчет и отправьте заявку.`;
  };
  form.addEventListener("change", update);
  update();
}

function renderPortal() {
  const portal = qs("[data-portal]");
  if (!portal) return;
  const estimate = JSON.parse(localStorage.getItem("fortress-estimate") || "null");
  const leads = JSON.parse(localStorage.getItem("fortress-leads") || "[]");
  const incidents = JSON.parse(localStorage.getItem("fortress-incidents") || "[]");

  qs("[data-portal-estimate]").innerHTML = estimate
    ? `<strong>${formatMoney(estimate.total)}</strong><span>${estimate.area} м2, постов: ${estimate.guards}</span>`
    : "<span>Сохраненного расчета пока нет.</span>";

  qs("[data-portal-leads]").innerHTML = leads.length
    ? leads
        .slice()
        .reverse()
        .map((lead) => `<li><strong>${lead.name || "Заявка"}</strong><span>${lead.phone || ""} · ${lead.source}</span></li>`)
        .join("")
    : "<li><span>Заявок пока нет.</span></li>";

  qs("[data-portal-incidents]").innerHTML = incidents.length
    ? incidents
        .slice()
        .reverse()
        .map((incident) => `<li><strong>${incident.type}</strong><span>${incident.location} · ${new Date(incident.createdAt).toLocaleString("ru-UA")}</span></li>`)
        .join("")
    : "<li><span>Инцидентов пока нет.</span></li>";
}

function initPortal() {
  if (!qs("[data-portal]")) return;
  renderPortal();

  qs("[data-export-portal]")?.addEventListener("click", () => {
    const payload = {
      estimate: JSON.parse(localStorage.getItem("fortress-estimate") || "null"),
      leads: JSON.parse(localStorage.getItem("fortress-leads") || "[]"),
      incidents: JSON.parse(localStorage.getItem("fortress-incidents") || "[]"),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fortress-security-portal.json";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Экспорт подготовлен");
  });

  qs("[data-clear-portal]")?.addEventListener("click", () => {
    const confirmed = confirm("Очистить локальные заявки, расчеты и инциденты?");
    if (!confirmed) return;
    localStorage.removeItem("fortress-estimate");
    localStorage.removeItem("fortress-leads");
    localStorage.removeItem("fortress-incidents");
    renderPortal();
    showToast("Портал очищен");
  });
}

function initBackToTop() {
  const button = qs("[data-back-top]");
  if (!button) return;
  const update = () => button.classList.toggle("show", window.scrollY > 520);
  update();
  window.addEventListener("scroll", update, { passive: true });
  button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function initInstallPrompt() {
  const button = qs("[data-install]");
  if (!button) return;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstall = event;
    button.hidden = false;
  });
  button.addEventListener("click", async () => {
    if (!state.deferredInstall) return;
    state.deferredInstall.prompt();
    await state.deferredInstall.userChoice;
    state.deferredInstall = null;
    button.hidden = true;
  });
}

function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {
      console.info("Service worker registration skipped.");
    });
  }
}

function boot() {
  setTheme(localStorage.getItem("fortress-theme") || "dark");
  initActiveNavigation();
  initHeader();
  initSolutions();
  initCalculator();
  initCases();
  initFaq();
  initLeadForms();
  initActions();
  initChat();
  initRiskChecklist();
  initIncidentForm();
  initPlanCompare();
  initPortal();
  initBackToTop();
  initInstallPrompt();
  initServiceWorker();
}

document.addEventListener("DOMContentLoaded", boot);

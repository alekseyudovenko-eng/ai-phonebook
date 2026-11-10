"use strict";

const DB_NAME = "ai-phonebook-pwa";
const DB_VERSION = 1;
const STORE = "contacts";
const $ = (selector, root = document) => root.querySelector(selector);
const els = {
  list: $("#list"), detail: $("#detail"), count: $("#count"), search: $("#search"),
  editor: $("#editor"), form: $("#contactForm"), fileInput: $("#fileInput"), toast: $("#toast")
};
let db;
let contacts = [];
let toastTimer;
let installPrompt;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("name", "name", { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function transaction(mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const result = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(result?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Хранилище недоступно"));
  });
}
const allContacts = () => transaction("readonly", store => store.getAll());
const putContact = contact => transaction("readwrite", store => store.put(contact));
const removeContact = id => transaction("readwrite", store => store.delete(id));
const escapeHTML = value => String(value ?? "").replace(/[&<>\"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const normalize = value => String(value ?? "").normalize("NFKC").toLocaleLowerCase("ru").replace(/ё/g, "е").trim();
const lines = value => String(value || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean);
const initials = name => (name || "?").trim().split(/\s+/).slice(0, 2).map(x => x[0] || "").join("").toLocaleUpperCase("ru");

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2600);
}
function safeURL(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}
function filteredContacts() {
  const query = normalize(els.search.value);
  const rows = query ? contacts.filter(contact => normalize([
    contact.name, contact.company, contact.position, contact.phones.join(" "), contact.emails.join(" "),
    contact.city, contact.country, contact.tags.join(" "), contact.notes
  ].join(" ")).includes(query)) : contacts;
  return rows.sort((a, b) => (a.name || a.company).localeCompare(b.name || b.company, "ru"));
}
function renderList() {
  const rows = filteredContacts();
  els.count.textContent = `${rows.length} / ${contacts.length}`;
  if (!rows.length) {
    els.list.innerHTML = `<div class="empty">${contacts.length ? "Ничего не найдено. Измените запрос." : "Пока нет контактов. Нажмите «＋ Контакт», чтобы добавить первый."}</div>`;
    return;
  }
  els.list.innerHTML = rows.map(contact => `<button class="contact-row" type="button" data-id="${escapeHTML(contact.id)}">
    <span class="avatar" aria-hidden="true">${escapeHTML(initials(contact.name || contact.company))}</span>
    <span class="row-copy"><strong>${escapeHTML(contact.name || contact.company || "Без имени")}</strong><span>${escapeHTML([contact.position, contact.company].filter(Boolean).join(" · ") || contact.emails[0] || contact.phones[0] || "")}</span></span>
  </button>`).join("");
  els.list.querySelectorAll("[data-id]").forEach(button => button.addEventListener("click", () => renderDetail(button.dataset.id)));
}
function renderDetail(id) {
  const c = contacts.find(item => item.id === id);
  if (!c) { els.detail.innerHTML = `<div class="empty">Выберите контакт или добавьте новый.</div>`; return; }
  const field = (label, values, scheme = "") => values?.length ? `<div class="detail-field"><h3>${label}</h3>${values.map(value => {
    const href = scheme === "tel" ? `tel:${encodeURIComponent(value)}` : scheme === "mailto" ? `mailto:${encodeURIComponent(value)}` : "";
    return `<p>${href ? `<a href="${escapeHTML(href)}">${escapeHTML(value)}</a>` : escapeHTML(value)}</p>`;
  }).join("")}</div>` : "";
  const links = c.links.map(safeURL).filter(Boolean);
  els.detail.innerHTML = `<div class="detail-head"><span class="avatar large" aria-hidden="true">${escapeHTML(initials(c.name || c.company))}</span><div class="detail-title"><h2>${escapeHTML(c.name || c.company || "Без имени")}</h2><p>${escapeHTML([c.position, c.company].filter(Boolean).join(" · "))}</p></div></div>
    <div class="detail-actions"><button class="button secondary" id="editContact" type="button">Изменить</button><button class="button danger-outline" id="deleteContact" type="button">Удалить</button></div>
    ${field("Телефоны", c.phones, "tel")}${field("Электронная почта", c.emails, "mailto")}
    ${field("Местоположение", [[c.city, c.country].filter(Boolean).join(", ")].filter(Boolean))}
    ${links.length ? `<div class="detail-field"><h3>Ссылки</h3>${links.map(url => `<p><a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(url)}</a></p>`).join("")}</div>` : ""}
    ${field("Теги", c.tags)}${field("Заметки", [c.notes].filter(Boolean))}`;
  $("#editContact").addEventListener("click", () => openEditor(c));
  $("#deleteContact").addEventListener("click", () => deleteSelected(c));
}
function openEditor(contact = {}) {
  const values = { id: contact.id || "", name: contact.name || "", company: contact.company || "", position: contact.position || "", phones: contact.phones || [], emails: contact.emails || [], city: contact.city || "", country: contact.country || "", links: contact.links || [], tags: contact.tags || [], notes: contact.notes || "" };
  $("#formTitle").textContent = values.id ? "Изменить контакт" : "Новый контакт";
  for (const [key, value] of Object.entries(values)) {
    const input = $("#" + key);
    if (input) input.value = Array.isArray(value) ? value.join(key === "tags" ? ", " : "\n") : value;
  }
  $("#formError").textContent = "";
  els.editor.showModal();
  $("#name").focus();
}
async function deleteSelected(contact) {
  const dialog = $("#confirmDelete");
  dialog.showModal();
  const button = $("#confirmDeleteBtn");
  const result = await new Promise(resolve => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue), { once: true });
    button.onclick = () => { dialog.close("delete"); };
  });
  if (result !== "delete") return;
  await removeContact(contact.id);
  contacts = await allContacts();
  renderList();
  renderDetail();
  toast("Контакт удалён");
}
function sanitizeContact(input) {
  const name = String(input.name || "").trim();
  const company = String(input.company || "").trim();
  if (!name && !company) throw new Error("Укажите имя или компанию.");
  return {
    id: input.id || crypto.randomUUID(), name, company,
    position: String(input.position || "").trim(), phones: lines(input.phones), emails: lines(input.emails).map(x => x.toLowerCase()),
    city: String(input.city || "").trim(), country: String(input.country || "").trim(),
    links: lines(input.links).map(x => safeURL(x)).filter(Boolean),
    tags: [...new Set(String(input.tags || "").split(",").map(x => x.trim()).filter(Boolean))],
    notes: String(input.notes || "").trim(), updatedAt: Date.now()
  };
}
els.form.addEventListener("submit", async event => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") { els.editor.close(); return; }
  try {
    const data = Object.fromEntries(new FormData(els.form).entries());
    const contact = sanitizeContact(data);
    await putContact(contact);
    contacts = await allContacts();
    els.editor.close();
    renderList(); renderDetail(contact.id);
    toast("Контакт сохранён на устройстве");
  } catch (error) { $("#formError").textContent = error.message || "Не удалось сохранить контакт."; }
});
function csvCell(value) {
  let text = String(value ?? "");
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
function exportContacts() {
  const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), contacts }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob); link.download = `ai-phonebook-${new Date().toISOString().slice(0, 10)}.json`; link.click();
  URL.revokeObjectURL(link.href); toast("Резервная копия скачана");
}
function parseCSV(text) {
  const delimiter = (text.split(/\r?\n/, 1)[0].match(/[;,\t]/g) || []).reduce((best, char, _, all) => all.filter(item => item === char).length > all.filter(item => item === best).length ? char : best, ";");
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === delimiter) { row.push(cell); cell = ""; }
    else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(value => value.trim()));
}
function importCSV(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error("В CSV не найдены строки контактов.");
  const headers = rows[0].map(value => normalize(value).replace(/^\ufeff/, ""));
  const aliases = { "имя": "name", "имя и фамилия": "name", "name": "name", "full name": "name", "компания": "company", "company": "company", "должность": "position", "position": "position", "телефон": "phones", "телефоны": "phones", "phone": "phones", "почта": "emails", "email": "emails", "страна": "country", "country": "country", "город": "city", "city": "city", "ссылки": "links", "links": "links", "теги": "tags", "tags": "tags", "заметки": "notes", "notes": "notes" };
  return rows.slice(1).map(row => {
    const record = {};
    headers.forEach((header, index) => { const key = aliases[header]; if (key) record[key] = row[index] || ""; });
    return sanitizeContact(record);
  }).filter(contact => contact.name || contact.company);
}
async function importFile(file) {
  const text = await file.text();
  let incoming;
  if (/\.json$/i.test(file.name)) {
    const parsed = JSON.parse(text);
    incoming = Array.isArray(parsed) ? parsed : parsed.contacts;
    if (!Array.isArray(incoming)) throw new Error("В JSON нет списка контактов.");
    incoming = incoming.map(sanitizeContact);
  } else incoming = importCSV(text);
  const existing = new Set(contacts.map(c => normalize(c.name) + "|" + normalize(c.company)));
  let added = 0;
  for (const item of incoming) {
    const key = normalize(item.name) + "|" + normalize(item.company);
    if (!existing.has(key)) { await putContact(item); existing.add(key); added++; }
  }
  contacts = await allContacts(); renderList();
  toast(`Импортировано: ${added}; пропущено дубликатов: ${incoming.length - added}`);
}
$("#addBtn").addEventListener("click", () => openEditor());
$("#exportBtn").addEventListener("click", exportContacts);
$("#importBtn").addEventListener("click", () => els.fileInput.click());
els.fileInput.addEventListener("change", async () => {
  const file = els.fileInput.files?.[0]; if (!file) return;
  try { await importFile(file); } catch (error) { toast(error.message || "Не удалось импортировать файл"); }
  els.fileInput.value = "";
});
els.search.addEventListener("input", renderList);
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault(); installPrompt = event; $("#installBtn").hidden = false;
});
$("#installBtn").addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $("#installBtn").hidden = true;
});
window.addEventListener("appinstalled", () => toast("Приложение установлено"));
(async function start() {
  try {
    db = await openDB(); contacts = await allContacts();
    renderList();
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => toast("Офлайн-кеш недоступен"));
  } catch (error) {
    $("#storageNotice").textContent = "Браузерное хранилище недоступно. Разрешите хранение данных или откройте PWA в современном браузере.";
    toast(error.message || "Не удалось открыть хранилище");
  }
})();

import { KEY, RECOVERY_KEY, LEGACY_KEYS, Repository, emptyState, stockStatus, upsert, removeRecord, parseBackup, backupPayload, InventoryError } from './data.js';
import { t, setLanguage, number, money, date } from './i18n.js';
import { el, text, button, userText, localize, table } from './ui.js';

// Defer the localStorage getter too: privacy settings may throw on access itself.
const repository = new Repository({
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value)
});
const loaded = repository.load();
let state = loaded.data;
let prefs = { lang: document.documentElement.lang, dark: document.documentElement.dataset.theme === 'dark' };
setLanguage(prefs.lang);
const pages = ['dashboard', 'materials', 'categories', 'suppliers', 'reports', 'backup', 'settings'];
let page = pages.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard';
let query = '', categoryFilter = '', statusFilter = '';
let selectedBackupFile = null;
let opener, noticeTimer, pendingConfirmation;
const icon = (value) => el('span', { class: 'icon', 'aria-hidden': 'true' }, value);
const brand = () => el('div', { class: 'brand' }, el('span', { class: 'brand-mark', 'aria-hidden': 'true' }, '▦'), el('div', {}, text('brand', 'strong'), text('university', 'small')));
const nav = el('nav', { 'aria-label': t('workspace'), 'data-label': 'workspace' });
const icons = ['◫', '▣', '▤', '♧', '▥', '⇅', '⚙'];
pages.forEach((key, index) => nav.append(el('button', { type: 'button', 'data-page': key, onclick: () => navigate(key) }, icon(icons[index]), text(key))));
const sidebar = el('aside', { class: 'sidebar', id: 'navigation' }, brand(), text('workspace', 'p', { class: 'eyebrow' }), nav,
  el('div', { class: 'sidebar-note' }, el('span', { class: 'local-dot', 'aria-hidden': true }), text('local'), text('localHint', 'p')));
const pageTitle = el('h1', { tabindex: '-1' });
const pageDescription = el('p', { class: 'muted' });
const menu = el('button', { type: 'button', class: 'button menu-button', 'data-label': 'menu', 'aria-label': t('menu'), 'aria-controls': 'navigation', 'aria-expanded': 'false', onclick: () => toggleMenu() }, icon('☰'));
function languageButton() { return el('button', { type: 'button', class: 'button language-button', 'aria-label': 'English / پښتو', onclick: changeLanguage }, prefs.lang === 'en' ? 'پښتو' : 'English'); }
function themeButton() { return button('theme', changeTheme, 'theme-button', { 'aria-pressed': String(prefs.dark) }); }
const globalActions = el('div', { class: 'header-actions' }, languageButton(), themeButton());
const heading = el('header', { class: 'topbar' }, el('div', { class: 'breadcrumb' }, menu, text('university')), globalActions);
const content = el('div', { id: 'page-content' });
const errorBanner = el('div', { class: 'notice error', role: 'alert', hidden: true });
const main = el('main', { id: 'main', tabindex: '-1' }, heading, el('div', { class: 'content' }, errorBanner,
  el('div', { class: 'page-heading' }, el('div', {}, pageTitle, pageDescription), el('div', { id: 'page-actions' })), content));
const toast = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite', hidden: true });
const dialog = el('dialog', { 'aria-labelledby': 'dialog-title', class: 'record-dialog' });
const confirmDialog = el('dialog', { 'aria-labelledby': 'confirm-title', class: 'confirm-dialog' });
for (const modal of [dialog, confirmDialog]) {
  modal.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')].filter(node => node.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
}
const printArea = el('section', { id: 'print-area' });
document.querySelector('#app').append(el('a', { href: '#main', class: 'skip-link', 'data-i18n': 'skip' }, t('skip')), sidebar, main, dialog, confirmDialog, toast, printArea);

function reportError(error, target = errorBanner) {
  const key = error instanceof InventoryError ? error.code : 'storageFailed';
  target.replaceChildren(text(key));
  target.hidden = false;
  if (target === errorBanner && key === 'staleData') target.append(button('reload', () => location.reload()));
}
function notify(key) {
  clearTimeout(noticeTimer);
  toast.replaceChildren(text(key)); toast.hidden = false;
  noticeTimer = setTimeout(() => { toast.hidden = true; }, 4500);
}
function run(action) { try { action(); } catch (error) { reportError(error); } }
function commit(next, message, options) {
  next.settings = { ...prefs };
  state = repository.save(next, options);
  errorBanner.hidden = true;
  renderPage(); notify(message);
}
function toggleMenu(force) {
  const open = force ?? !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', open);
  menu.setAttribute('aria-expanded', String(open));
}
function navigate(next) {
  page = next; query = ''; categoryFilter = ''; statusFilter = '';
  history.replaceState(null, '', `#${next}`);
  toggleMenu(false); renderPage(); pageTitle.focus();
}
window.addEventListener('hashchange', () => { const next = location.hash.slice(1); if (pages.includes(next)) navigate(next); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && sidebar.classList.contains('open')) { toggleMenu(false); menu.focus(); } });
window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) reportError(new InventoryError('staleData')); });
function savePreferences() {
  const activeSetting = document.activeElement.closest('.setting-row');
  const focusPosition = activeSetting ? [...document.querySelectorAll('.setting-row')].indexOf(activeSetting) : -1;
  const focusButton = activeSetting ? [...activeSetting.querySelectorAll('button')].indexOf(document.activeElement) : -1;
  document.documentElement.lang = prefs.lang;
  document.documentElement.dir = prefs.lang === 'ps' ? 'rtl' : 'ltr';
  document.documentElement.dataset.theme = prefs.dark ? 'dark' : 'light';
  setLanguage(prefs.lang);
  try { localStorage.setItem('university_it_preferences', JSON.stringify(prefs)); } catch { notify('preferenceFailed'); }
  document.querySelectorAll('.language-button').forEach(node => { node.textContent = prefs.lang === 'en' ? 'پښتو' : 'English'; });
  document.querySelectorAll('.theme-button').forEach(node => node.setAttribute('aria-pressed', String(prefs.dark)));
  localize(); renderPage();
  if (focusPosition >= 0) document.querySelectorAll('.setting-row')[focusPosition]?.querySelectorAll('button')[focusButton]?.focus();
  document.title = t('app');
}
function changeLanguage() { prefs.lang = prefs.lang === 'en' ? 'ps' : 'en'; savePreferences(); }
function changeTheme() { prefs.dark = !prefs.dark; savePreferences(); }
function badge(m) { const key = stockStatus(m); return text(key, 'span', { class: `pill ${key}` }); }
function categoryName(id) { return state.categories.find(x => x.id === id)?.name ?? '—'; }
function materialName(m) { return el('div', { class: 'record-name' }, userText(m.name), el('small', { class: 'muted' }, m.serial ? el('bdi', { dir: 'ltr' }, m.serial) : text('noSerial'))); }
function rowActions(collection, record) {
  return el('div', { class: 'row-actions' }, button('edit', () => openRecord(collection, record.id), 'small', { disabled: repository.blocked }),
    button('delete', () => deleteRecord(collection, record), 'small danger-text', { disabled: repository.blocked }));
}
function materialRows(records, actions = false) {
  return records.map(m => [materialName(m), userText(categoryName(m.categoryId)), el('div', {}, number(m.quantity), el('small', { class: 'muted' }, text('reorderLevel'), ': ', number(m.reorderLevel))), userText(m.location),
    ...(actions ? [text(m.condition, 'span', { class: 'condition' }), userText(m.responsible || '—')] : []), badge(m), ...(actions ? [rowActions('materials', m)] : [])]);
}
function card(title, description, body, action = null) {
  return el('section', { class: 'card' }, el('div', { class: 'card-heading' }, el('div', {}, text(title, 'h2'), description ? text(description, 'p', { class: 'muted' }) : null), action), body);
}
function renderDashboard() {
  const ms = state.materials;
  const stats = [ ['totalMaterials', ms.length, 'registered'], ['totalQuantity', ms.reduce((sum, m) => sum + m.quantity, 0), 'combined'], ['low', ms.filter(m => stockStatus(m) === 'low').length, 'reorderHint'], ['out', ms.filter(m => stockStatus(m) === 'out').length, 'restockHint'] ];
  const cards = el('div', { class: 'stats' }, stats.map(([key, value, hint], index) => el('section', { class: `stat stat-${index}` }, text(key, 'h2'), el('strong', { class: 'stat-value' }, number(value)), text(hint, 'p'))));
  const recent = [...ms].sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5);
  const quick = el('div', { class: 'quick-actions' },
    button('addMaterial', () => openRecord('materials'), 'primary', { disabled: repository.blocked }),
    button('viewReports', () => navigate('reports')), button('backupAction', () => run(exportInventory)),
    text('localHint', 'p', { class: 'muted' }));
  content.append(cards, el('div', { class: 'dashboard-grid' }, card('recent', 'recentDesc', table(['material','categoryId','quantity','location','status'], materialRows(recent)), button('viewAll', () => navigate('materials'), 'small')),
    card('quick', null, quick)));
}
function filtered(collection) {
  const needle = query.toLocaleLowerCase().trim();
  return state[collection].filter(record => (!needle || [...Object.values(record), ...(collection === 'materials' ? [categoryName(record.categoryId)] : [])].some(value => String(value).toLocaleLowerCase().includes(needle))) &&
    (collection !== 'materials' || ((!categoryFilter || record.categoryId === categoryFilter) && (!statusFilter || stockStatus(record) === statusFilter))));
}
function renderRecords(collection) {
  const search = el('input', { type: 'search', 'aria-label': t('search'), 'data-label': 'search', 'data-placeholder': 'searchHint', placeholder: t('searchHint'), value: query });
  const filters = el('div', { class: 'filters' }, search);
  const result = el('div');
  const count = el('p', { class: 'result-count', 'aria-live': 'polite' });
  if (collection === 'materials') {
    const category = el('select', { 'aria-label': t('categoryId'), 'data-label': 'categoryId' }, el('option', { value: '' }, t('allCategories')), state.categories.map(c => el('option', { value: c.id }, c.name)));
    category.value = categoryFilter;
    const status = el('select', { 'aria-label': t('status'), 'data-label': 'status' }, ['', 'good', 'low', 'out'].map(key => el('option', { value: key }, t(key || 'allStatuses'))));
    status.value = statusFilter;
    category.addEventListener('change', () => { categoryFilter = category.value; draw(); });
    status.addEventListener('change', () => { statusFilter = status.value; draw(); });
    filters.append(category, status);
  }
  function draw() {
    const rows = filtered(collection);
    count.textContent = t('count', { count: number(rows.length) });
    if (collection === 'materials') result.replaceChildren(table(['material','categoryId','quantity','location','condition','responsible','status','actions'], materialRows(rows, true)));
    else if (collection === 'categories') result.replaceChildren(table(['categoryId','description','materials','actions'], rows.map(c => [userText(c.name), userText(c.description || '—'), number(state.materials.filter(m => m.categoryId === c.id).length), rowActions(collection, c)])));
    else result.replaceChildren(table(['supplierId','contact','phone','email','address','materials','actions'], rows.map(s => [userText(s.name), userText(s.contact || '—'), el('bdi', { dir: 'ltr' }, s.phone || '—'), el('bdi', { dir: 'ltr' }, s.email || '—'), userText(s.address || '—'), number(state.materials.filter(m => m.supplierId === s.id).length), rowActions(collection, s)])));
  }
  search.addEventListener('input', () => { query = search.value; draw(); });
  content.append(el('section', { class: 'card' }, filters, result, count)); draw();
}
function renderReports() {
  const status = el('dl', { class: 'summary-list' }, ['good','low','out'].map(key => [text(key, 'dt'), el('dd', {}, number(state.materials.filter(m => stockStatus(m) === key).length))]));
  const groups = el('dl', { class: 'summary-list' }, state.categories.map(c => [el('dt', {}, userText(c.name)), el('dd', {}, number(state.materials.filter(m => m.categoryId === c.id).length))]));
  if (!state.categories.length) groups.append(text('empty', 'p'));
  const value = state.materials.reduce((sum,m) => sum + m.quantity * m.price, 0);
  content.append(el('div', { class: 'report-grid' }, card('status', null, status), card('categories', null, groups), card('inventoryValue', null, el('div', { class: 'card-body' }, el('bdi', { class: 'value', dir: 'auto' }, money(value)), text('valueHint', 'p', { class: 'muted' })))),
    card('attention', null, table(['material','categoryId','quantity','location','status'], materialRows(state.materials.filter(m => stockStatus(m) !== 'good')), 'healthy', 'healthyHint')));
}
function download(payload, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const link = el('a', { href: url, download: filename }); document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000); notify('downloaded');
}
function exportInventory() { if (repository.blocked) throw new InventoryError('storageUnreadable'); download(backupPayload(state), 'university-it-inventory-backup.json'); }
function renderBackup() {
  const file = el('input', { type: 'file', id: 'restore-file', accept: '.json,application/json', hidden: true });
  const fileName = text('noFile', 'span', { class: 'muted' });
  if (selectedBackupFile) { fileName.removeAttribute('data-i18n'); fileName.replaceChildren(userText(selectedBackupFile.name)); }
  file.addEventListener('change', () => {
    selectedBackupFile = file.files[0] || null;
    if (selectedBackupFile) { fileName.removeAttribute('data-i18n'); fileName.replaceChildren(userText(selectedBackupFile.name)); }
    else { fileName.dataset.i18n = 'noFile'; fileName.textContent = t('noFile'); }
  });
  const restoreError = el('p', { class: 'notice error', role: 'alert', hidden: true });
  const review = button('preview', async () => {
    restoreError.hidden = true;
    if (!selectedBackupFile) { reportError(new InventoryError('chooseFile'), restoreError); return; }
    if (selectedBackupFile.size > 10 * 1024 * 1024) { reportError(new InventoryError('fileTooLarge'), restoreError); return; }
    try { previewRestore(parseBackup(await selectedBackupFile.text())); } catch (error) { reportError(error instanceof InventoryError ? error : new InventoryError('fileFailed'), restoreError); }
  });
  content.append(el('div', { class: 'backup-grid' },
    card('export', 'exportHint', el('div', { class: 'card-body' }, button('backupAction', () => run(exportInventory), 'primary', { disabled: repository.blocked }))),
    card('restore', 'restoreHint', el('div', { class: 'card-body stack' }, text('backupFile', 'label', { for: 'restore-file' }), file, button('chooseBackup', () => file.click()), fileName, review, restoreError)),
    card('rawExport', 'rawHint', el('div', { class: 'card-body' }, button('rawExport', () => run(() => download(repository.archive(), 'university-it-raw-archive.json'))))),
    card('recovery', 'recoveryHint', el('div', { class: 'card-body' }, button('recovery', () => run(() => {
      const raw = localStorage.getItem(RECOVERY_KEY);
      if (!raw) throw new InventoryError('noRecovery');
      let saved; try { saved = JSON.parse(raw); } catch { throw new InventoryError('invalidBackup'); }
      previewRestore(parseBackup(saved.raw));
    }))))),
    card('legacy', 'legacyHint', el('div', { class: 'card-body' }, button('inspectLegacy', inspectLegacy))),
    card('danger', 'dangerHint', el('div', { class: 'card-body' }, button('danger', () => confirmAction('clearConfirm', text('clearDetail', 'p'), 'danger', () => commit(emptyState(), 'cleared')), 'danger-text', { disabled: repository.blocked }))));
}
function previewRestore(data) {
  const summary = el('div', {}, text('replaceHint', 'p'), el('dl', { class: 'summary-list' }, ['materials','categories','suppliers'].map(key => [text(key, 'dt'), el('dd', {}, number(data[key].length))])));
  confirmAction('confirmRestore', summary, 'restoreNow', () => commit(data, 'restored', { recovery: true }));
}
function inspectLegacy() {
  run(() => {
    const archive = repository.archive();
    const body = el('div', { class: 'legacy-records' }, text('legacyHint', 'p'));
    let found = false;
    LEGACY_KEYS.forEach((key, index) => {
      const raw = archive.records[key]; if (raw === null) return; found = true;
      body.append(el('details', {}, text(['categories','suppliers','legacyProducts','orders','adjustments','log'][index], 'summary'), text('legacyRaw', 'p', { class: 'muted' }), el('pre', { dir: 'ltr', tabindex: '0' }, raw)));
    });
    if (!found) body.append(text('noLegacy', 'p'));
    openDialog('legacy', body);
  });
}
function renderSettings() {
  content.append(el('section', { class: 'card settings' },
    el('div', { class: 'setting-row' }, el('div', {}, text('language', 'h2'), text('languageHint', 'p', { class: 'muted' })), languageButton()),
    el('div', { class: 'setting-row' }, el('div', {}, text('theme', 'h2'), text('themeHint', 'p', { class: 'muted' })), el('div', { class: 'segmented' },
      button('light', () => { prefs.dark = false; savePreferences(); }, '', { 'aria-pressed': String(!prefs.dark) }), button('dark', () => { prefs.dark = true; savePreferences(); }, '', { 'aria-pressed': String(prefs.dark) }))),
    el('div', { class: 'setting-row' }, el('div', {}, text('currency', 'h2'), text('currencyHint', 'p', { class: 'muted' })), el('bdi', { dir: 'ltr' }, 'AFN'))),
    text('reviewTranslation', 'p', { class: 'muted translation-note' }));
}
function renderPage() {
  pageTitle.textContent = t(page); pageDescription.textContent = t(`${page}Desc`);
  nav.querySelectorAll('button').forEach(node => { node.classList.toggle('active', node.dataset.page === page); if (node.dataset.page === page) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current'); });
  const actions = document.querySelector('#page-actions'); actions.replaceChildren();
  if (['dashboard','materials','categories','suppliers'].includes(page)) {
    const collection = page === 'dashboard' ? 'materials' : page;
    actions.append(button({materials:'addMaterial',categories:'addCategory',suppliers:'addSupplier'}[collection], () => openRecord(collection), 'primary', { disabled: repository.blocked }));
  } else if (page === 'reports') actions.append(button('print', printReport));
  content.replaceChildren();
  if (page === 'dashboard') renderDashboard();
  else if (['materials','categories','suppliers'].includes(page)) renderRecords(page);
  else if (page === 'reports') renderReports();
  else if (page === 'backup') renderBackup();
  else renderSettings();
}
function closeDialog() { dialog.close(); }
dialog.addEventListener('close', () => { if (opener?.isConnected) opener.focus(); else pageTitle.focus(); });
function openDialog(title, body) {
  opener = document.activeElement;
  dialog.replaceChildren(el('div', { class: 'dialog-heading' }, text(title, 'h2', { id: 'dialog-title' }), el('div', { class: 'dialog-actions' }, languageButton(), themeButton(), button('close', closeDialog, 'small'))), body);
  dialog.showModal();
}
const recordFields = {
  materials: ['name','categoryId','quantity','reorderLevel','location','condition','serial','responsible','supplierId','price','purchaseDate','description'],
  categories: ['name','description'],
  suppliers: ['name','contact','phone','email','address']
};
function openRecord(collection, id) {
  if (repository.blocked) { reportError(new InventoryError('storageUnreadable')); return; }
  if (collection === 'materials' && !state.categories.length) { notify('categoryFirst'); navigate('categories'); return; }
  const old = id ? state[collection].find(x => x.id === id) : null;
  const defaults = { quantity: 0, reorderLevel: 2, price: 0, condition: 'Good', categoryId: state.categories[0]?.id || '' };
  const controls = {};
  const errors = el('div', { class: 'notice error', role: 'alert', hidden: true });
  const form = el('form', { novalidate: true }, text('requiredHint', 'p', { class: 'muted' }), errors);
  const fields = el('div', { class: 'form-grid' });
  for (const key of recordFields[collection]) {
    const required = ['name','categoryId','quantity','location'].includes(key);
    const attrs = { id: `field-${key}`, name: key, required, dir: ['phone','email','serial','purchaseDate'].includes(key) ? 'ltr' : 'auto', 'aria-describedby': 'form-errors' };
    let input;
    if (key === 'description') input = el('textarea', { ...attrs, rows: 3 });
    else if (key === 'categoryId' || key === 'supplierId') {
      const records = key === 'categoryId' ? state.categories : state.suppliers;
      input = el('select', attrs, el('option', { value: '', 'data-i18n': key === 'categoryId' ? 'choose' : 'unspecified' }, t(key === 'categoryId' ? 'choose' : 'unspecified')), records.map(x => el('option', { value: x.id }, x.name)));
    } else if (key === 'condition') input = el('select', attrs, ['Good','Needs Repair','Damaged'].map(value => el('option', { value, 'data-i18n': value }, t(value))));
    else input = el('input', { ...attrs, type: ['quantity','reorderLevel','price'].includes(key) ? 'number' : key === 'purchaseDate' ? 'date' : key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text', ...(['quantity','reorderLevel','price'].includes(key) ? { min: 0, max: Number.MAX_SAFE_INTEGER, step: key === 'price' ? '0.01' : '1' } : {}) });
    input.value = old?.[key] ?? defaults[key] ?? '';
    controls[key] = input;
    fields.append(el('div', { class: `field ${key === 'description' || key === 'address' ? 'full' : ''}` }, el('label', { for: attrs.id }, text(key), required ? el('span', { 'aria-hidden': true }, ' *') : null), input));
  }
  errors.id = 'form-errors';
  form.append(fields, el('div', { class: 'dialog-footer' }, button('cancel', closeDialog), el('button', { type: 'submit', class: 'button primary' }, text('save'))));
  form.addEventListener('submit', event => {
    event.preventDefault(); errors.hidden = true;
    Object.values(controls).forEach(input => input.removeAttribute('aria-invalid'));
    try {
      const invalid = Object.values(controls).find(input => input.required && !input.value.trim());
      if (invalid) { invalid.setAttribute('aria-invalid', 'true'); invalid.focus(); throw new InventoryError('required'); }
      if (controls.email?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(controls.email.value)) { controls.email.setAttribute('aria-invalid', 'true'); controls.email.focus(); throw new InventoryError('invalidEmail'); }
      const record = { ...old, id: old?.id || crypto.randomUUID(), createdAt: old?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
      for (const [key, input] of Object.entries(controls)) {
        if (['quantity','reorderLevel','price'].includes(key)) {
          if (input.validity.badInput || input.validity.rangeUnderflow || input.validity.rangeOverflow || input.validity.stepMismatch) { input.setAttribute('aria-invalid','true'); input.focus(); throw new InventoryError(key === 'price' ? 'invalidNumber' : 'wholeNumber'); }
          record[key] = Number(input.value || 0);
        } else record[key] = input.value; // Preserve entered names and descriptions exactly.
      }
      commit(upsert(state, collection, record), 'saved'); closeDialog();
    } catch (error) { reportError(error, errors); }
  });
  openDialog(({ materials: id ? 'editMaterial' : 'addMaterial', categories: id ? 'editCategory' : 'addCategory', suppliers: id ? 'editSupplier' : 'addSupplier' })[collection], form);
  controls.name.focus();
}
function confirmAction(title, body, actionKey, action) {
  const returnFocus = document.activeElement;
  const errors = el('p', { class: 'notice error', role: 'alert', hidden: true });
  const cancel = button('cancel', () => confirmDialog.close());
  confirmDialog.replaceChildren(text(title, 'h2', { id: 'confirm-title' }), body, errors, el('div', { class: 'dialog-footer' }, cancel, button(actionKey, () => { try { action(); confirmDialog.close(); } catch (error) { reportError(error, errors); } }, 'primary')));
  pendingConfirmation = returnFocus; confirmDialog.showModal(); cancel.focus();
}
confirmDialog.addEventListener('close', () => { if (pendingConfirmation?.isConnected) pendingConfirmation.focus(); else pageTitle.focus(); });
function deleteRecord(collection, record) {
  try { removeRecord(state, collection, record.id); }
  catch (error) { reportError(error); return; }
  confirmAction('confirmDelete', el('div', {}, el('p', { class: 'record-name' }, userText(record.name)), text('deleteHint', 'p')), 'delete', () => commit(removeRecord(state, collection, record.id), 'deleted'));
}
function printReport() {
  printArea.replaceChildren(text('app', 'h1'), el('p', {}, text('generated'), ': ', date(new Date())), el('p', {}, text('inventoryValue'), ': ', money(state.materials.reduce((sum,m) => sum + m.quantity*m.price, 0))), table(['material','categoryId','quantity','location','condition','responsible','status'], state.materials.map(m => [userText(m.name), userText(categoryName(m.categoryId)), number(m.quantity), userText(m.location), text(m.condition), userText(m.responsible || '—'), text(stockStatus(m))])));
  window.print();
}
renderPage(); document.title = t('app');
if (loaded.error) { reportError(new InventoryError('storageUnreadable')); navigate('backup'); }

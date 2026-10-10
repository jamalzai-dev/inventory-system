// Runs synchronously in <head> to apply the existing preference before first paint.
(() => {
  let prefs = { lang: 'en', dark: false };
  try {
    const saved = JSON.parse(localStorage.getItem('university_it_preferences'));
    const old = saved ? null : JSON.parse(localStorage.getItem('university_it_inventory_v2'));
    prefs = saved || old?.settings || prefs;
  } catch { /* The application presents recovery controls after startup. */ }
  document.documentElement.lang = prefs.lang === 'ps' ? 'ps' : 'en';
  document.documentElement.dir = prefs.lang === 'ps' ? 'rtl' : 'ltr';
  document.documentElement.dataset.theme = prefs.dark ? 'dark' : 'light';
})();

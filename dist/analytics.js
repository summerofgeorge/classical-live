// This public measurement ID belongs only to the ClassicalWatch GA4 property.
(() => {
  const measurementId = 'G-CCRKXW68XX';
  const hostname = 'classicalwatch.stringfestanalytics.com';
  const storageKey = 'classicalwatch.analytics-consent.v1';
  const choiceLifetime = 180 * 24 * 60 * 60 * 1000;
  const disabledKey = `ga-disable-${measurementId}`;
  const panel = document.getElementById('analytics-choice');
  const settings = document.getElementById('analytics-settings');
  let started = false;
  let returnFocus = false;

  // Local previews and alternate hosts never send traffic to the live property.
  if (location.hostname !== hostname || !panel || !settings) return;

  const gtag = function () { window.dataLayer.push(arguments); };
  window[disabledKey] = true;

  function readChoice() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey));
      return value && ['granted', 'denied'].includes(value.choice)
        && Number.isFinite(value.savedAt) && value.savedAt <= Date.now()
        && Date.now() - value.savedAt < choiceLifetime ? value.choice : null;
    } catch { return null; }
  }

  function clearAnalyticsCookies() {
    // Use a distinct prefix and host so Stringfest's other GA cookies are untouched.
    for (const item of document.cookie.split(';')) {
      const name = item.trim().split('=')[0];
      if (!name.startsWith('cw_ga')) continue;
      for (const domain of ['', `; domain=${hostname}`, `; domain=.${hostname}`]) {
        document.cookie = `${name}=; Max-Age=0; path=/${domain}; SameSite=Lax; Secure`;
      }
    }
  }

  function startAnalytics() {
    if (started) return;
    started = true;
    window[disabledKey] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = gtag;
    gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    gtag('consent', 'update', { analytics_storage: 'granted' });
    gtag('js', new Date());
    gtag('config', measurementId, {
      cookie_domain: hostname,
      cookie_prefix: 'cw',
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.append(script);
  }

  function choose(choice) {
    try { localStorage.setItem(storageKey, JSON.stringify({choice, savedAt: Date.now()})); } catch { /* Current-page choice still applies. */ }
    panel.hidden = true;
    settings.setAttribute('aria-expanded', 'false');
    if (returnFocus) settings.focus();
    if (choice === 'granted') startAnalytics();
    else {
      window[disabledKey] = true;
      clearAnalyticsCookies();
      // Unload Google's listeners after withdrawal; future pages won't load the tag.
      if (started) location.reload();
    }
  }

  document.getElementById('analytics-accept').addEventListener('click', () => choose('granted'));
  document.getElementById('analytics-decline').addEventListener('click', () => choose('denied'));
  settings.hidden = false;
  settings.addEventListener('click', () => {
    returnFocus = true;
    panel.hidden = false;
    settings.setAttribute('aria-expanded', 'true');
    panel.scrollIntoView({block: 'center'});
    document.getElementById('analytics-accept').focus({preventScroll: true});
  });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    const choice = readChoice();
    if (choice === 'granted') startAnalytics();
    else {
      window[disabledKey] = true;
      clearAnalyticsCookies();
      if (started) location.reload();
    }
    panel.hidden = choice !== null;
    settings.setAttribute('aria-expanded', String(!panel.hidden));
  });
  const choice = readChoice();
  if (choice === 'granted') startAnalytics();
  else {
    clearAnalyticsCookies();
    panel.hidden = choice === 'denied';
  }
  settings.setAttribute('aria-expanded', String(!panel.hidden));
})();

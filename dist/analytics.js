// This public measurement ID belongs only to the ClassicalWatch GA4 property.
(() => {
  const measurementId = 'G-CCRKXW68XX';
  const hostname = 'classicalwatch.stringfestanalytics.com';
  // Keep local previews and alternate hosts out of the live reports.
  if (location.hostname !== hostname || document.getElementById('classicalwatch-google-tag')) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    cookie_domain: hostname,
    cookie_prefix: 'cw',
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });

  const script = document.createElement('script');
  script.id = 'classicalwatch-google-tag';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.append(script);
})();

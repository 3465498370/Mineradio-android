/* ============================================================
   Mineradio Mobile Cookie Manager
   Per-device auth: cookies stored in localStorage, sent via headers.
   Each user logs in independently.
   ============================================================ */
(function () {
  'use strict';

  if (window.desktopWindow && window.desktopWindow.isDesktop) return;

  var STORAGE_NE = 'mcookie_netease';
  var STORAGE_QQ = 'mcookie_qq';
  var STORAGE_KG = 'mcookie_kugou';

  function getCookie(provider) {
    var key = provider === 'qq' ? STORAGE_QQ : (provider === 'kugou' ? STORAGE_KG : STORAGE_NE);
    return localStorage.getItem(key) || '';
  }

  function setCookie(provider, value) {
    var key = provider === 'qq' ? STORAGE_QQ : (provider === 'kugou' ? STORAGE_KG : STORAGE_NE);
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  }

  // Intercept apiJson to inject cookies as headers
  if (typeof apiJson !== 'undefined') {
    var _origApiJson = apiJson;
    window.apiJson = function (url, opts) {
      opts = opts || {};
      opts.headers = opts.headers || {};
      // Inject per-device cookies
      var neCookie = getCookie('netease');
      var qqCookie = getCookie('qq');
      var kgCookie = getCookie('kugou');
      if (neCookie) opts.headers['x-cookie-netease'] = neCookie;
      if (qqCookie) opts.headers['x-cookie-qq'] = qqCookie;
      if (kgCookie) opts.headers['x-cookie-kg'] = kgCookie;

      return _origApiJson(url, opts).then(function (result) {
        // Intercept login responses to save cookies
        if (url.indexOf('/api/qq/login/cookie') >= 0 && result && result.saved && result.loggedIn) {
          // QQ login cookie was set — refresh our stored cookie
          refreshStoredCookie('qq');
        }
        if (url.indexOf('/api/kg/login/cookie') >= 0 && result && result.saved && result.loggedIn) {
          refreshStoredCookie('kugou');
        }
        // After QR check success, refresh stored cookie
        if (url.indexOf('/api/kg/login/qr/check') >= 0 && result && result.code === 803) {
          refreshStoredCookie('kugou');
        }
        if (url.indexOf('/api/login/cookie') >= 0 && result && result.saved && result.loggedIn) {
          refreshStoredCookie('netease');
        }
        return result;
      });
    };
  }

  // Refresh stored cookies by reading current server state
  function refreshStoredCookie(provider) {
    // After login, the server has the cookie in memory for this request.
    // We need to persist it. Use a dedicated endpoint.
    var endpoint = provider === 'qq' ? '/api/qq/login/status' :
      (provider === 'kugou' ? '/api/kg/login/status' : '/api/login/status');

    _origApiJson(endpoint, {}).then(function (info) {
      // Store whatever info we have — the server now has the cookie
      // We can't directly read the cookie, so we use a dedicated cookie-export endpoint
      exportCookieFromServer(provider);
    });
  }

  function exportCookieFromServer(provider) {
    var endpoint = '/api/mobile/cookie-export?provider=' + provider;
    _origApiJson(endpoint, {}).then(function (data) {
      if (data && data.cookie) {
        setCookie(provider, data.cookie);
        console.log('[MobileCookie] Saved ' + provider + ' cookie (' + data.cookie.length + ' chars)');
      }
    }).catch(function (e) {
      console.warn('[MobileCookie] Failed to export ' + provider + ' cookie:', e.message);
    });
  }

  // Expose manual cookie import
  window.saveMobileCookie = function (provider, cookieText) {
    setCookie(provider, cookieText);
    console.log('[MobileCookie] Manually saved ' + provider + ' cookie');
  };

  // Export cookies (called by server)
  // The server reads from localStorage... wait, server can't read localStorage.
  // We need the server to expose the cookies it received via headers.

  console.log('[MobileCookie] Multi-user cookie manager loaded');
})();

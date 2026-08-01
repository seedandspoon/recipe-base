// Tiny hash router: routes are registered as [regex, handler] pairs.
// Handlers receive matched params and render into the #view element.

const routes = [];
let notFoundHandler = () => '<p>Page not found.</p>';

export function route(pattern, handler) {
  // pattern like '/recipe/:id' -> regex with named groups
  const paramNames = [];
  const regexStr = pattern
    .split('/')
    .map((seg) => {
      if (seg.startsWith(':')) {
        paramNames.push(seg.slice(1));
        return '([^/]+)';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  routes.push({ regex: new RegExp(`^${regexStr}$`), paramNames, handler });
}

export function setNotFound(handler) {
  notFoundHandler = handler;
}

function parseHash() {
  let hash = location.hash.slice(1) || '/gallery';
  const [path, queryStr] = hash.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryStr || ''));
  return { path: path.startsWith('/') ? path : `/${path}`, query };
}

const viewEl = () => document.getElementById('view');

export async function render() {
  const { path, query } = parseHash();
  for (const r of routes) {
    const m = path.match(r.regex);
    if (m) {
      const params = {};
      r.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
      viewEl().scrollTop = 0;
      window.scrollTo(0, 0);
      await r.handler({ params, query });
      updateActiveNav(path);
      return;
    }
  }
  viewEl().innerHTML = await notFoundHandler();
  updateActiveNav(path);
}

function updateActiveNav(path) {
  const section = path.split('/')[1] || 'gallery';
  document.querySelectorAll('[data-route]').forEach((el) => {
    el.classList.toggle('active', el.dataset.route === section);
  });
}

export function go(path) {
  location.hash = path;
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  render();
}

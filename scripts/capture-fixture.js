// Paste in the devtools console on claude.ai. Downloads an anonymised HTML snapshot of the page.
// Always review the file for personal data before committing it.
(() => {
  const name = prompt('Fixture name (e.g. project-page, chat-page)', 'project-page');
  if (!name) {
    return;
  }

  const KEEP_TEXT =
    /^(Recents?|Récents?|Projects?|Projets?|Starred|Favoris|Chats?|Discussions?|New chat|Nouvelle discussion|New project|Nouveau projet|View all|Tout afficher|Scheduled|Programmé)$/i;
  const RELATIVE_TIME = /^(\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago|il y a\s+.+)$/i;
  const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  // Opaque ids such as cse_…, trig_…, cblk_…, anywhere inside a value
  const PREFIXED_ID = /\b([a-z]{2,})_(?=[A-Za-z]*\d)[A-Za-z0-9]{6,}\b/g;
  // data-* values kept verbatim: empty, numbers, and lowercase technical words (state, side, orientation…)
  const SAFE_DATA_VALUE = /^(|\d+|[a-z]+(-[a-z]+)*)$/;
  // data-* attributes whose value is user content whatever its shape
  const CONTENT_DATA_ATTR = /label|title|name|text|value|query|search/i;
  const KEEP_ATTRS = new Set([
    'class',
    'role',
    'href',
    'type',
    'draggable',
    'tabindex',
    'hidden',
    'id',
    'aria-expanded',
    'aria-current',
    'aria-selected',
    'aria-hidden',
    'aria-haspopup',
    'aria-controls',
    'aria-labelledby',
    'aria-label',
  ]);
  const DROP_ELEMENTS = 'script, style, link, meta, noscript, iframe, template, .cf-section';
  const CHAT_LINK = 'a[href*="/chat/"]';
  const PROJECT_LINK = 'a[href*="/project/"]';

  const fakeIds = new Map();
  const fakeId = (real) => {
    const key = real.toLowerCase();
    if (!fakeIds.has(key)) {
      const n = fakeIds.size + 1;
      fakeIds.set(key, `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`);
    }
    return fakeIds.get(key);
  };
  const fakeTokens = new Map();
  const fakeToken = (real, prefix) => {
    if (!fakeTokens.has(real)) {
      fakeTokens.set(real, `${prefix}_fake${fakeTokens.size + 1}`);
    }
    return fakeTokens.get(real);
  };
  const anonymiseValue = (value) => value.replace(UUID, fakeId).replace(PREFIXED_ID, fakeToken);
  const anonymiseData = ({ attr, value }) => {
    const replaced = anonymiseValue(value);
    if (replaced !== value) {
      return replaced;
    }
    if (!CONTENT_DATA_ATTR.test(attr) && SAFE_DATA_VALUE.test(value)) {
      return value;
    }
    return 'x';
  };

  const root = document.documentElement.cloneNode(true);
  for (const node of root.querySelectorAll(DROP_ELEMENTS)) {
    node.remove();
  }
  // Other extensions inject custom elements named after a UUID (sometimes prefixed); they are not claude.ai DOM.
  for (const node of [...root.querySelectorAll('*')].filter((el) =>
    /^[a-z]*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(el.localName),
  )) {
    node.remove();
  }
  for (const svg of root.querySelectorAll('svg')) {
    svg.replaceChildren();
  }

  const isUiText = (text) => !text || KEEP_TEXT.test(text) || RELATIVE_TIME.test(text);
  const textNodesOf = (node) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const nodes = [];
    for (let current = walker.nextNode(); current; current = walker.nextNode()) {
      nodes.push(current);
    }
    return nodes;
  };

  // One placeholder title per link, put on the first content text of its label (or of the link).
  const titles = new Map();
  const counters = { Conversation: new Map(), Project: new Map() };
  for (const link of root.querySelectorAll(`${CHAT_LINK}, ${PROJECT_LINK}`)) {
    const kind = link.matches(CHAT_LINK) ? 'Conversation' : 'Project';
    const id = fakeId((link.getAttribute('href') || '').match(UUID)?.[0] || 'none');
    if (!counters[kind].has(id)) {
      counters[kind].set(id, `${kind} ${counters[kind].size + 1}`);
    }
    const labelRoot = link.querySelector('[data-row-label]') || link;
    const target = textNodesOf(labelRoot).find((node) => !isUiText(node.nodeValue.trim()));
    if (target) {
      titles.set(target, counters[kind].get(id));
    }
  }
  for (const node of textNodesOf(root)) {
    if (titles.has(node)) {
      node.nodeValue = titles.get(node);
    } else if (!isUiText(node.nodeValue.trim())) {
      node.nodeValue = 'Text';
    }
  }

  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const { name: attr, value } of [...el.attributes]) {
      if (attr.startsWith('data-')) {
        el.setAttribute(attr, anonymiseData({ attr, value }));
      } else if (!KEEP_ATTRS.has(attr)) {
        el.removeAttribute(attr);
      } else if (attr === 'href') {
        const url = new URL(value, location.origin);
        el.setAttribute(attr, url.origin === location.origin ? anonymiseValue(url.pathname) : '#');
      } else if (attr === 'aria-label') {
        el.setAttribute(attr, KEEP_TEXT.test(value.trim()) ? value : 'label');
      } else {
        el.setAttribute(attr, anonymiseValue(value));
      }
    }
  }

  const html = `<!doctype html>\n<!-- claude.ai snapshot "${name}", captured ${new Date().toISOString().slice(0, 10)} -->\n${root.outerHTML}`;
  const download = document.createElement('a');
  download.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  download.download = `${name}.html`;
  download.click();
  console.log(
    `[nest-for-claude] ${name}.html: ${(html.length / 1024).toFixed(0)} KB, ${fakeIds.size} ids and ${fakeTokens.size} tokens anonymised`,
  );
})();

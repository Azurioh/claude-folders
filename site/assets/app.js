(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Store listings: set each to its store URL once published; null shows "Coming soon".
  const LINKS = {
    chrome: null,
    firefox: null,
  };

  /* ---------- i18n ---------- */
  const STR = {
    en: {
      'nav.folders': 'Folders',
      'nav.drag': 'Drag & drop',
      'nav.appearance': 'Appearance',
      'nav.privacy': 'Privacy',
      'nav.download': 'Download',
      'hero.eyebrow': 'Browser extension for claude.ai',
      'hero.title': 'Nested folders for your Claude projects',
      'hero.lede':
        'Folders inside folders, right in the claude.ai sidebar and project page. Sort months of conversations in a minute. Nothing leaves your browser.',
      'hero.other': 'Other browsers and manual install',
      'trust.oss': 'Open source · MIT',
      'trust.net': '0 network requests',
      'trust.lang': 'English · Français',
      'cta.chrome': 'Add to Chrome',
      'cta.firefox': 'Add to Firefox',
      'cta.edge': 'Add to Edge',
      'cta.brave': 'Add to Brave',
      'cta.opera': 'Add to Opera',
      'cta.any': 'Download',
      'cta.mobile': 'Get it on desktop',
      'cta.soon': 'Coming soon',
      'cl.new': 'New chat',
      'cl.chats': 'Chats',
      'cl.projects': 'Projects',
      'cl.project': 'Product Launch',
      'cl.folders': 'Folders',
      'cl.recents': 'Recents',
      'cl.newIn': 'New session in Product Launch',
      'cl.newFolder': 'New folder',
      'fold.marketing': 'Marketing',
      'fold.launch': 'Launch',
      'fold.research': 'Research',
      'fold.ops': 'Ops',
      'fold.interviews': 'Interviews',
      'fold.legal': 'Legal',
      'conv.terms': 'Terms of service review',
      'conv.synth': 'Interview synthesis',
      'conv.press': 'Press release outline',
      'conv.hero': 'Landing page hero headline',
      'conv.tweet': 'Launch tweet thread',
      'conv.roadmap': 'Q3 roadmap priorities',
      'conv.bugs': 'Bug triage checklist',
      'conv.sync': 'Weekly sync notes',
      'conv.sql': 'SQL query cleanup',
      'conv.comp': 'Competitor teardown',
      'conv.hiring': 'Hiring rubric draft',
      'conv.vendor': 'Vendor contract questions',
      ago: (n) => `${n} minutes ago`,
      'demo.replay': 'Replay',
      'folders.eyebrow': 'Folders, as deep as you need',
      'folders.title': "Your projects grew. Your sidebar didn't",
      'folders.body':
        "claude.ai lists a project's conversations in one flat column. Nest adds folders and sub-folders inside each project, so last March's research thread is three clicks away instead of a long scroll.",
      'f1.t': 'Scoped to each project',
      'f1.b':
        'Every claude.ai project keeps its own tree, shown in the sidebar and on the project page.',
      'f2.t': 'New session in a folder',
      'f2.b':
        'Start a chat from a folder. It is filed there as soon as you send the first message.',
      'drag.eyebrow': 'Drag and drop',
      'drag.title': 'Tidy up in one gesture',
      'drag.body':
        'Drop a conversation onto a folder, move it from one folder to another, or file several chats at once from the “Add conversations” panel. Try it here, with a mouse or a finger.',
      'play.reset': 'Reset',
      'play.hint': 'Drag any conversation, filed or not, onto a folder.',
      'play.done': (c, f) => `Filed “${c}” in ${f}.`,
      'play.all': 'All sorted.',
      'play.back': (c) => `Moved “${c}” back to Recents.`,
      'play.empty': 'Drop a conversation here to unfile it.',
      'play.aria': (c) => `${c}. Press Enter to file it in the next folder.`,
      'look.eyebrow': 'Appearance',
      'look.title': 'Make it yours',
      'look.body':
        'A name, an emoji and a color for every folder, so you tell “Legal” from “Launch” before you read a word.',
      'ed.title': 'Edit folder',
      'ed.name': 'Name',
      'ed.emoji': 'Emoji',
      'ed.color': 'Color',
      'pop.projects': 'projects',
      'pop.folders': 'folders',
      'pop.filed': 'filed chats',
      'pop.hide': 'Hide filed conversations',
      'pop.backup': 'Back up',
      'pop.restore': 'Restore',
      'tb.eyebrow': 'Toolbar menu',
      'tb.title': "Only see what's left to sort",
      'tb.body':
        "Hide or dim conversations you've already filed, check what's stored, and export everything to a JSON file you can restore later. The menu only wakes up on claude.ai tabs.",
      'priv.eyebrow': 'Private by design',
      'priv.title': 'Your folders live in your browser',
      'priv.body':
        'No account, no server, no analytics. Everything is stored locally by your browser, and the extension asks for the smallest set of permissions it can.',
      'l1.t': 'network requests',
      'l1.b': 'The extension never calls out. Not to us, not to anyone.',
      'l2.t': 'accounts',
      'l2.b': 'Install it and it works. Nothing to sign up for.',
      'l3.t': 'permissions',
      'l3.b': "Local storage and access to claude.ai. That's the full list.",
      'l4.t': 'open source',
      'l4.b': 'Every line is on GitHub, ready to read and audit.',
      'fin.title': 'Give your chats a home',
      'fin.body':
        'Free, open source, installed in seconds. Your sidebar will thank you on Monday morning.',
      'fin.all': 'All download options',
      'dl.eyebrow': 'Download · v1.0.0',
      'dl.title': 'Get Nest for Claude',
      'dl.body':
        'Pick your browser. The store version updates itself; the manual build is there if you prefer to install from source.',
      'dl.detected': (b) => `Detected: ${b}`,
      'dl.unknown': 'Browser not detected, pick one below',
      'dl.yours': 'Your browser',
      'dl.chrome.b': 'From the Chrome Web Store. Works in every Chromium browser.',
      'dl.ff.b': 'From Firefox Add-ons. Desktop Firefox 115 and later.',
      'dl.manual.t': 'Manual install',
      'dl.manual.b': 'Download the zip from the latest GitHub release, then load it yourself.',
      'dl.s1': 'Unzip the Chrome or Firefox build.',
      'dl.s2': 'Chrome: open',
      'dl.s2b': 'turn on Developer mode, then “Load unpacked”.',
      'dl.s3': 'Firefox: open',
      'dl.s3b': 'and “Load Temporary Add-on”.',
      'dl.manual.cta': 'Latest release',
      'dl.m1': 'Permissions: storage, claude.ai',
      'dl.m2': 'Size: under 100 KB',
      'dl.m3': 'Languages: English, French',
      'dl.m4': 'Not available on mobile browsers',
      'foot.disclaimer':
        'Nest for Claude is an independent project, not affiliated with or endorsed by Anthropic.',
      'foot.license': 'MIT License',
      'foot.issue': 'Report an issue',
    },
    fr: {
      'nav.folders': 'Dossiers',
      'nav.drag': 'Glisser-déposer',
      'nav.appearance': 'Apparence',
      'nav.privacy': 'Confidentialité',
      'nav.download': 'Télécharger',
      'hero.eyebrow': 'Extension de navigateur pour claude.ai',
      'hero.title': 'Des dossiers imbriqués pour vos projets Claude',
      'hero.lede':
        'Des dossiers dans des dossiers, directement dans la barre latérale et la page projet de claude.ai. Rangez des mois de conversations en une minute. Rien ne quitte votre navigateur.',
      'hero.other': 'Autres navigateurs et installation manuelle',
      'trust.oss': 'Open source · MIT',
      'trust.net': '0 requête réseau',
      'trust.lang': 'English · Français',
      'cta.chrome': 'Ajouter à Chrome',
      'cta.firefox': 'Ajouter à Firefox',
      'cta.edge': 'Ajouter à Edge',
      'cta.brave': 'Ajouter à Brave',
      'cta.opera': 'Ajouter à Opera',
      'cta.any': 'Télécharger',
      'cta.mobile': 'Disponible sur ordinateur',
      'cta.soon': 'Bientôt disponible',
      'cl.new': 'Nouvelle conversation',
      'cl.chats': 'Conversations',
      'cl.projects': 'Projets',
      'cl.project': 'Lancement produit',
      'cl.folders': 'Dossiers',
      'cl.recents': 'Récents',
      'cl.newIn': 'Nouvelle session dans Lancement produit',
      'cl.newFolder': 'Nouveau dossier',
      'fold.marketing': 'Marketing',
      'fold.launch': 'Lancement',
      'fold.research': 'Recherche',
      'fold.ops': 'Ops',
      'fold.interviews': 'Entretiens',
      'fold.legal': 'Juridique',
      'conv.terms': 'Relecture des CGU',
      'conv.synth': 'Synthèse des entretiens',
      'conv.press': 'Plan du communiqué de presse',
      'conv.hero': 'Titre du hero de la landing',
      'conv.tweet': 'Thread de lancement',
      'conv.roadmap': 'Priorités de la roadmap T3',
      'conv.bugs': 'Checklist de tri des bugs',
      'conv.sync': 'Notes du point hebdo',
      'conv.sql': 'Nettoyage des requêtes SQL',
      'conv.comp': 'Analyse des concurrents',
      'conv.hiring': 'Grille de recrutement',
      'conv.vendor': 'Questions contrat fournisseur',
      ago: (n) => `il y a ${n} min`,
      'demo.replay': 'Rejouer',
      'folders.eyebrow': 'Des dossiers, aussi profonds que nécessaire',
      'folders.title': 'Vos projets ont grandi. Pas votre barre latérale',
      'folders.body':
        "claude.ai affiche les conversations d'un projet en une seule colonne. Nest ajoute des dossiers et sous-dossiers dans chaque projet : la recherche de mars dernier est à trois clics, plus au bout d'un long défilement.",
      'f1.t': 'Propre à chaque projet',
      'f1.b':
        'Chaque projet claude.ai a son arborescence, visible dans la barre latérale et sur la page projet.',
      'f2.t': 'Nouvelle session dans un dossier',
      'f2.b':
        "Lancez une conversation depuis un dossier. Elle y est rangée dès l'envoi du premier message.",
      'drag.eyebrow': 'Glisser-déposer',
      'drag.title': 'Rangez d’un seul geste',
      'drag.body':
        'Déposez une conversation sur un dossier, passez-la d’un dossier à l’autre, ou rangez plusieurs conversations d’un coup depuis le panneau « Ajouter des conversations ». Essayez ici, à la souris ou au doigt.',
      'play.reset': 'Réinitialiser',
      'play.hint': 'Glissez une conversation, rangée ou non, sur un dossier.',
      'play.done': (c, f) => `« ${c} » rangée dans ${f}.`,
      'play.all': 'Tout est rangé.',
      'play.back': (c) => `« ${c} » est revenue dans Récents.`,
      'play.empty': 'Déposez une conversation ici pour la sortir de son dossier.',
      'play.aria': (c) => `${c}. Appuyez sur Entrée pour la ranger dans le dossier suivant.`,
      'look.eyebrow': 'Apparence',
      'look.title': 'À votre image',
      'look.body':
        'Un nom, un emoji et une couleur pour chaque dossier : vous distinguez « Juridique » de « Lancement » avant même de lire.',
      'ed.title': 'Modifier le dossier',
      'ed.name': 'Nom',
      'ed.emoji': 'Emoji',
      'ed.color': 'Couleur',
      'pop.projects': 'projets',
      'pop.folders': 'dossiers',
      'pop.filed': 'conv. rangées',
      'pop.hide': 'Masquer les conversations rangées',
      'pop.backup': 'Sauvegarder',
      'pop.restore': 'Restaurer',
      'tb.eyebrow': 'Menu de la barre d’outils',
      'tb.title': 'Ne voyez que ce qui reste à ranger',
      'tb.body':
        'Masquez ou estompez les conversations déjà rangées, consultez ce qui est stocké, et exportez tout dans un fichier JSON à restaurer plus tard. Le menu ne s’active que sur les onglets claude.ai.',
      'priv.eyebrow': 'Privé par conception',
      'priv.title': 'Vos dossiers vivent dans votre navigateur',
      'priv.body':
        'Ni compte, ni serveur, ni statistiques. Tout est stocké localement par votre navigateur, et l’extension demande le strict minimum de permissions.',
      'l1.t': 'requête réseau',
      'l1.b': 'L’extension ne contacte personne. Ni nous, ni qui que ce soit.',
      'l2.t': 'compte',
      'l2.b': 'Installez-la et elle fonctionne. Aucune inscription.',
      'l3.t': 'permissions',
      'l3.b': 'Le stockage local et l’accès à claude.ai. C’est tout.',
      'l4.t': 'open source',
      'l4.b': 'Chaque ligne est sur GitHub, à lire et à auditer.',
      'fin.title': 'Offrez un nid à vos conversations',
      'fin.body':
        'Gratuite, open source, installée en quelques secondes. Votre barre latérale vous dira merci lundi matin.',
      'fin.all': 'Toutes les options de téléchargement',
      'dl.eyebrow': 'Téléchargement · v1.0.0',
      'dl.title': 'Installer Nest for Claude',
      'dl.body':
        'Choisissez votre navigateur. La version des stores se met à jour toute seule ; la version manuelle est là si vous préférez installer depuis les sources.',
      'dl.detected': (b) => `Détecté : ${b}`,
      'dl.unknown': 'Navigateur non détecté, choisissez ci-dessous',
      'dl.yours': 'Votre navigateur',
      'dl.chrome.b': 'Depuis le Chrome Web Store. Fonctionne dans tous les navigateurs Chromium.',
      'dl.ff.b': 'Depuis Firefox Add-ons. Firefox ordinateur 115 et plus.',
      'dl.manual.t': 'Installation manuelle',
      'dl.manual.b': 'Téléchargez le zip de la dernière release GitHub, puis chargez-le vous-même.',
      'dl.s1': 'Décompressez la version Chrome ou Firefox.',
      'dl.s2': 'Chrome : ouvrez',
      'dl.s2b': 'activez le mode développeur, puis « Charger l’extension non empaquetée ».',
      'dl.s3': 'Firefox : ouvrez',
      'dl.s3b': 'puis « Charger un module temporaire ».',
      'dl.manual.cta': 'Dernière release',
      'dl.m1': 'Permissions : stockage, claude.ai',
      'dl.m2': 'Taille : moins de 100 Ko',
      'dl.m3': 'Langues : anglais, français',
      'dl.m4': 'Indisponible sur navigateur mobile',
      'foot.disclaimer':
        'Nest for Claude est un projet indépendant, ni affilié à Anthropic ni approuvé par Anthropic.',
      'foot.license': 'Licence MIT',
      'foot.issue': 'Signaler un problème',
    },
  };
  const store = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* storage unavailable: choice lasts for this visit only */
      }
    },
  };
  const detectLang = () => {
    const saved = store.get('nfc-lang');
    if (saved === 'en' || saved === 'fr') {
      return saved;
    }
    const prefs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
    for (const l of prefs) {
      const base = String(l).toLowerCase().slice(0, 2);
      if (base in STR) {
        return base;
      }
    }
    return 'en';
  };
  let lang = detectLang();
  const t = (key, ...args) => {
    const v = STR[lang][key] ?? STR.en[key];
    return typeof v === 'function' ? v(...args) : v;
  };
  const listeners = [];
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
    document.querySelectorAll('.lang button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });
    listeners.forEach((fn) => {
      fn();
    });
  }
  document.querySelectorAll('.lang button').forEach((b) => {
    b.addEventListener('click', () => {
      lang = b.dataset.lang;
      store.set('nfc-lang', lang);
      applyLang();
    });
  });

  /* ---------- Browser detection ---------- */
  const ua = navigator.userAgent;
  const browser = (() => {
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) {
      return { id: 'mobile', name: 'Mobile' };
    }
    if (/Firefox\//.test(ua)) {
      return { id: 'firefox', name: 'Firefox', family: 'firefox' };
    }
    if (/Edg\//.test(ua)) {
      return { id: 'edge', name: 'Edge', family: 'chromium' };
    }
    if (/OPR\//.test(ua)) {
      return { id: 'opera', name: 'Opera', family: 'chromium' };
    }
    if (navigator.brave) {
      return { id: 'brave', name: 'Brave', family: 'chromium' };
    }
    if (/Chrome\/|Chromium\//.test(ua)) {
      return { id: 'chrome', name: 'Chrome', family: 'chromium' };
    }
    if (/Safari\//.test(ua)) {
      return { id: 'safari', name: 'Safari' };
    }
    return { id: 'unknown', name: '' };
  })();
  function applyBrowser() {
    const known = browser.family === 'chromium' || browser.family === 'firefox';
    const label =
      browser.id === 'mobile' ? t('cta.mobile') : known ? t(`cta.${browser.id}`) : t('cta.any');
    const storeLink =
      browser.family === 'firefox'
        ? LINKS.firefox
        : browser.family === 'chromium'
          ? LINKS.chrome
          : null;
    const href = storeLink ?? '#download';
    const icon =
      browser.family === 'firefox'
        ? '#i-firefox'
        : browser.family === 'chromium'
          ? '#i-chrome'
          : '#i-download';
    document.querySelectorAll('.js-cta').forEach((a) => {
      a.href = href;
      if (storeLink) {
        a.target = '_blank';
        a.rel = 'noopener';
      } else {
        a.removeAttribute('target');
        a.removeAttribute('rel');
      }
      a.querySelector('.js-cta-label').textContent = label;
      a.querySelector('use')?.setAttribute('href', icon);
    });
    document.querySelectorAll('.js-store').forEach((a) => {
      const link = LINKS[a.dataset.store];
      if (link) {
        a.href = link;
        a.target = '_blank';
        a.rel = 'noopener';
        a.removeAttribute('aria-disabled');
      } else {
        a.removeAttribute('href');
        a.removeAttribute('target');
        a.removeAttribute('rel');
        a.setAttribute('aria-disabled', 'true');
      }
      a.querySelector('.js-store-label').textContent = link
        ? t(`cta.${a.dataset.store}`)
        : t('cta.soon');
    });
    const det = document.querySelector('#detected span');
    det.textContent = known ? t('dl.detected', browser.name) : t('dl.unknown');
    document.querySelectorAll('.dl-card').forEach((c) => {
      const match = c.dataset.browser === browser.family;
      c.classList.toggle('match', match);
      c.querySelector('.badge')?.toggleAttribute('hidden', !match);
    });
  }
  listeners.push(applyBrowser);

  /* ---------- Views: landing vs #download ---------- */
  const landing = document.getElementById('landing'),
    dlView = document.getElementById('download-view');
  function route() {
    const onDl = location.hash === '#download';
    landing.hidden = onDl;
    dlView.hidden = !onDl;
    document.querySelectorAll('.nav-links a').forEach((a) => {
      a.toggleAttribute('aria-current', onDl && a.getAttribute('href') === '#download');
    });
    if (onDl) {
      scrollTo({ top: 0 });
      return;
    }
    const target = location.hash && document.querySelector(location.hash);
    if (target) {
      requestAnimationFrame(() => target.scrollIntoView());
    }
  }
  addEventListener('hashchange', route);

  /* ---------- Stage glow follows the pointer ---------- */
  addEventListener(
    'pointermove',
    (e) => {
      document.querySelectorAll('.on-stage').forEach((s) => {
        const r = s.getBoundingClientRect();
        if (e.clientY < r.top || e.clientY > r.bottom) {
          return;
        }
        s.style.setProperty('--gx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
        s.style.setProperty('--gy', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
      });
    },
    { passive: true },
  );

  /* ---------- Boards: folder trees driven by state ---------- */
  const svgUse = (id, cls) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    if (cls) {
      s.setAttribute('class', cls);
    }
    const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    u.setAttribute('href', id);
    s.append(u);
    return s;
  };
  const textSpan = (cls, key) => {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = t(key);
    return s;
  };
  const countOf = (f) => f.items.length + f.children.reduce((n, c) => n + countOf(c), 0);
  const flatFolders = (list) => list.flatMap((f) => [f, ...flatFolders(f.children)]);

  function createBoard({ treeEl, recentsEl, sideEl, statusEl, initial, interactive = true }) {
    let state = initial(),
      lastMoved = null,
      statusMsg = null;

    function folderRow(f, live) {
      const row = document.createElement('div');
      row.className = 'tr folder';
      row.dataset.fid = f.id;
      row.setAttribute('aria-expanded', String(f.open));
      row.append(svgUse('#i-chev', 'chev'));
      if (f.emoji) {
        const e = document.createElement('span');
        e.className = 'emo';
        e.textContent = f.emoji;
        row.append(e);
      } else {
        row.append(svgUse('#i-folder', 'fic'));
      }
      row.append(textSpan('tx', f.key));
      const n = document.createElement('span');
      n.className = 'n';
      n.textContent = String(countOf(f));
      row.append(n);
      if (f.id === lastMoved) {
        row.classList.add('enter');
      }
      if (live) {
        row.setAttribute('role', 'button');
        row.tabIndex = 0;
        row.addEventListener('click', () => toggle(f.id));
        row.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle(f.id);
          }
        });
      }
      return row;
    }
    function convRow(key, from, ago, live) {
      const row = document.createElement('div');
      row.className = 'tr';
      row.dataset.key = key;
      row.append(textSpan('tx', key));
      if (ago !== undefined) {
        const w = document.createElement('span');
        w.className = 'when';
        w.textContent = t('ago', ago);
        row.append(w);
      }
      if (key === lastMoved) {
        row.classList.add('enter');
      }
      if (live) {
        row.classList.add('conv');
        row.tabIndex = 0;
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', t('play.aria', t(key)));
        bindDrag(row, key, from);
      }
      return row;
    }
    function renderTree(container, folders, live, depth) {
      for (const f of folders) {
        const row = folderRow(f, live);
        if (container === sideEl && depth === 0) {
          row.classList.add('top');
        }
        const kids = document.createElement('div');
        kids.className = 'kids';
        kids.hidden = !f.open;
        renderTree(kids, f.children, live, depth + 1);
        f.items.forEach((k) => {
          kids.append(convRow(k, f.id, undefined, live));
        });
        container.append(row, kids);
      }
    }
    function render() {
      treeEl.replaceChildren();
      renderTree(treeEl, state.folders, interactive, 0);
      recentsEl.dataset.empty = t('play.empty');
      recentsEl.replaceChildren();
      state.recents.forEach(({ key, ago }) => {
        recentsEl.append(convRow(key, 'recents', ago, interactive));
      });
      if (sideEl) {
        sideEl.replaceChildren();
        renderTree(sideEl, state.folders, false, 0);
      }
      if (statusEl) {
        statusEl.textContent = statusMsg ? statusMsg() : t('play.hint');
      }
      lastMoved = null;
    }
    function toggle(id) {
      const f = flatFolders(state.folders).find((x) => x.id === id);
      f.open = !f.open;
      render();
    }
    function sourceOf(key) {
      if (state.recents.some((r) => r.key === key)) {
        return 'recents';
      }
      return flatFolders(state.folders).find((f) => f.items.includes(key))?.id;
    }
    function move(key, from, toId) {
      if (from === toId) {
        return;
      }
      const all = flatFolders(state.folders);
      if (from === 'recents') {
        state.recents = state.recents.filter((r) => r.key !== key);
      } else {
        const src = all.find((f) => f.id === from);
        src.items = src.items.filter((k) => k !== key);
      }
      lastMoved = key;
      if (toId === 'recents') {
        state.recents.unshift({ key, ago: 1 });
        statusMsg = () => t('play.back', t(key));
      } else {
        const target = all.find((f) => f.id === toId);
        target.items.push(key);
        target.open = true;
        statusMsg = state.recents.length
          ? () => t('play.done', t(key), t(target.key))
          : () => t('play.all');
      }
      render();
    }
    function bindDrag(row, key, from) {
      let ghost = null,
        over = null,
        sx = 0,
        sy = 0;
      row.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') {
          return;
        }
        e.preventDefault();
        const all = flatFolders(state.folders);
        const i = all.findIndex((f) => f.id === from);
        move(key, from, all[(i + 1) % all.length].id);
        treeEl.querySelector(`.tr[data-key="${key}"]`)?.focus({ preventScroll: true });
      });
      row.addEventListener('pointerdown', (e) => {
        if (e.button > 0) {
          return;
        }
        sx = e.clientX;
        sy = e.clientY;
        row.setPointerCapture(e.pointerId);
      });
      // iOS Safari still pans despite touch-action: none, cancelling the pointer mid-drag.
      row.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
      row.addEventListener('pointermove', (e) => {
        if (!row.hasPointerCapture(e.pointerId)) {
          return;
        }
        if (!ghost && Math.hypot(e.clientX - sx, e.clientY - sy) > 6) {
          ghost = document.createElement('div');
          ghost.className = 'ghost';
          ghost.append(svgUse('#i-chat'), textSpan('', key));
          document.body.append(ghost);
          row.classList.add('leaving');
        }
        if (!ghost) {
          return;
        }
        ghost.style.transform = `translate(${e.clientX + 12}px, ${e.clientY - 18}px) rotate(-2deg)`;
        let hit = null,
          best = Infinity;
        treeEl.querySelectorAll('.tr.folder').forEach((fr) => {
          const kids = fr.nextElementSibling,
            a = fr.getBoundingClientRect();
          const bottom =
            kids && !kids.hidden
              ? Math.max(a.bottom, kids.getBoundingClientRect().bottom)
              : a.bottom;
          const inside =
            e.clientX > a.left && e.clientX < a.right && e.clientY > a.top && e.clientY < bottom;
          if (inside && bottom - a.top < best) {
            best = bottom - a.top;
            hit = fr;
          }
        });
        if (!hit && from !== 'recents') {
          const head = recentsEl.previousElementSibling.getBoundingClientRect(),
            list = recentsEl.getBoundingClientRect();
          if (
            e.clientX > list.left &&
            e.clientX < list.right &&
            e.clientY > head.top &&
            e.clientY < list.bottom
          ) {
            hit = recentsEl;
          }
        }
        if (hit !== over) {
          over?.classList.remove('hl');
          hit?.classList.add('hl');
          over = hit;
        }
      });
      const end = () => {
        if (ghost) {
          ghost.remove();
          ghost = null;
          row.classList.remove('leaving');
        }
        if (over) {
          const id = over === recentsEl ? 'recents' : over.dataset.fid;
          over.classList.remove('hl');
          over = null;
          move(key, from, id);
        }
      };
      row.addEventListener('pointerup', end);
      row.addEventListener('pointercancel', end);
    }
    function addFolder(f) {
      state.folders.push(f);
      lastMoved = f.id;
      render();
    }
    listeners.push(render);
    render();
    return {
      reset() {
        state = initial();
        statusMsg = null;
        render();
      },
      toggle,
      sourceOf,
      addFolder,
      file: (key, toId) => move(key, sourceOf(key), toId),
      convEl: (key) =>
        treeEl.querySelector(`.tr[data-key="${key}"]`) ??
        recentsEl.querySelector(`.tr[data-key="${key}"]`),
      folderEl: (id) => treeEl.querySelector(`.tr.folder[data-fid="${id}"]`),
    };
  }

  /* ---------- Hero: scripted, looping demo of a real filing session ---------- */
  const heroInitial = () => ({
    folders: [
      {
        id: 'mk',
        key: 'fold.marketing',
        emoji: '📣',
        open: true,
        items: [],
        children: [
          {
            id: 'ln',
            key: 'fold.launch',
            open: true,
            items: ['conv.press', 'conv.hero'],
            children: [],
          },
        ],
      },
      {
        id: 'rs',
        key: 'fold.research',
        emoji: '🔭',
        open: true,
        items: ['conv.comp', 'conv.synth'],
        children: [],
      },
    ],
    recents: [
      { key: 'conv.tweet', ago: 2 },
      { key: 'conv.terms', ago: 5 },
      { key: 'conv.roadmap', ago: 8 },
      { key: 'conv.bugs', ago: 11 },
    ],
  });
  const hero = createBoard({
    treeEl: document.getElementById('hero-tree'),
    recentsEl: document.getElementById('hero-recents'),
    sideEl: document.getElementById('side-tree'),
    initial: heroInitial,
    interactive: false,
  });
  const claude = document.getElementById('claude');
  const cursor = document.getElementById('cursor'),
    ghost = document.getElementById('demo-ghost'),
    ripple = document.getElementById('ripple');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let heroVisible = false;
  new IntersectionObserver(
    ([en]) => {
      heroVisible = en.isIntersecting;
    },
    { threshold: 0.2 },
  ).observe(claude);
  const whenWatched = async () => {
    for (; !heroVisible || document.hidden || !landing || landing.hidden; ) {
      await sleep(400);
    }
  };
  const pointAt = (el, dx = 0.35) => {
    const r = el.getBoundingClientRect(),
      c = claude.getBoundingClientRect();
    return { x: r.left - c.left + Math.min(r.width * dx, 220), y: r.top - c.top + r.height / 2 };
  };
  const moveTo = async (p, ms = 850) => {
    cursor.style.transitionDuration = `${ms}ms`;
    ghost.style.transitionDuration = `${ms}ms`;
    cursor.style.transform = `translate(${p.x}px, ${p.y}px)`;
    ghost.style.transform = `translate(${p.x + 16}px, ${p.y + 10}px) rotate(-2deg)`;
    await sleep(ms + 60);
  };
  const click = async () => {
    cursor.classList.add('down');
    ripple.style.transform = cursor.style.transform;
    ripple.classList.remove('go');
    void ripple.offsetWidth;
    ripple.classList.add('go');
    await sleep(160);
    cursor.classList.remove('down');
    await sleep(200);
  };
  async function drag(key, folderId) {
    const row = hero.convEl(key);
    await moveTo(pointAt(row));
    cursor.classList.add('down');
    row.classList.add('leaving');
    ghost.querySelector('span').textContent = t(key);
    ghost.style.transitionDuration = '0ms';
    await moveTo(pointAt(row), 0);
    ghost.classList.add('on');
    await sleep(220);
    const target = hero.folderEl(folderId);
    await moveTo(pointAt(target, 0.5), 1000);
    target.classList.add('hl');
    await sleep(450);
    cursor.classList.remove('down');
    ghost.classList.remove('on');
    hero.file(key, folderId);
    await sleep(700);
  }
  async function typeFolder(id, key, emoji) {
    await moveTo(pointAt(document.getElementById('hero-new'), 0.5));
    await click();
    hero.addFolder({ id, key, emoji, open: true, items: [], children: [] });
    const tx = hero.folderEl(id).querySelector('.tx'),
      full = t(key);
    tx.classList.add('typing');
    for (let i = 0; i <= full.length; i++) {
      tx.textContent = full.slice(0, i);
      await sleep(85);
    }
    await sleep(350);
    tx.classList.remove('typing');
    await sleep(500);
  }
  const demoOn = true;
  async function loop() {
    for (; demoOn; ) {
      await whenWatched();
      cursor.style.opacity = '1';
      await drag('conv.tweet', 'mk');
      await drag('conv.comp', 'ln');
      await moveTo(pointAt(hero.folderEl('rs'), 0.2));
      await click();
      hero.toggle('rs');
      await sleep(600);
      await typeFolder('lg', 'fold.legal', '⚖️');
      await drag('conv.terms', 'lg');
      await moveTo({ x: claude.clientWidth * 0.82, y: claude.clientHeight * 0.88 }, 1100);
      cursor.style.opacity = '0';
      await sleep(2600);
      claude.classList.add('fade');
      await sleep(450);
      hero.reset();
      claude.classList.remove('fade');
      await sleep(900);
    }
  }
  if (reduce) {
    hero.file('conv.tweet', 'mk');
    hero.file('conv.comp', 'ln');
  } else {
    setTimeout(loop, 1100);
  }

  const play = createBoard({
    treeEl: document.getElementById('play-folders'),
    recentsEl: document.getElementById('play-recents'),
    statusEl: document.getElementById('play-status'),
    initial: () => ({
      folders: [
        {
          id: 'p-mk',
          key: 'fold.marketing',
          emoji: '📣',
          open: true,
          items: ['conv.tweet'],
          children: [],
        },
        {
          id: 'p-rs',
          key: 'fold.research',
          emoji: '🔭',
          open: true,
          items: ['conv.comp'],
          children: [
            {
              id: 'p-int',
              key: 'fold.interviews',
              open: true,
              items: ['conv.synth'],
              children: [],
            },
          ],
        },
        { id: 'p-op', key: 'fold.ops', emoji: '🧰', open: true, items: [], children: [] },
      ],
      recents: [
        { key: 'conv.hiring', ago: 9 },
        { key: 'conv.vendor', ago: 12 },
      ],
    }),
  });
  document.getElementById('play-reset').addEventListener('click', () => play.reset());

  /* ---------- Edit folder popover ---------- */
  const edRow = document.getElementById('ed-row'),
    edKids = document.getElementById('ed-kids');
  const edName = document.getElementById('ed-name'),
    edEmo = document.getElementById('ed-emo'),
    edInput = document.getElementById('ed-input');
  const edFlip = () => {
    const open = edRow.getAttribute('aria-expanded') !== 'true';
    edRow.setAttribute('aria-expanded', String(open));
    edKids.hidden = !open;
  };
  edRow.addEventListener('click', edFlip);
  edRow.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      edFlip();
    }
  });
  edRow.setAttribute('role', 'button');
  edRow.tabIndex = 0;
  edRow.setAttribute('aria-expanded', 'true');
  edInput.addEventListener('input', () => {
    edName.textContent = edInput.value.trim() || '…';
  });
  const emojis = [
    '📚',
    '⚖️',
    '📝',
    '💡',
    '🔬',
    '📊',
    '📦',
    '⭐',
    '🎯',
    '🧪',
    '💼',
    '📣',
    '🔥',
    '🪺',
  ];
  const colors = [
    ['none', ''],
    ['terracotta', '#c4623c'],
    ['amber', '#d4a24a'],
    ['olive', '#8c9a5b'],
    ['green', '#4f9a6b'],
    ['teal', '#3f9393'],
    ['blue', '#5b8fd6'],
    ['violet', '#8b7bd8'],
    ['pink', '#c56aa5'],
    ['stone', '#9b9186'],
  ];
  const emWrap = document.getElementById('ed-emojis'),
    cWrap = document.getElementById('ed-colors');
  emojis.forEach((em) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'em';
    b.textContent = em;
    b.setAttribute('aria-pressed', String(em === '📣'));
    b.setAttribute('aria-label', em);
    b.addEventListener('click', () => {
      emWrap.querySelectorAll('.em').forEach((x) => {
        x.setAttribute('aria-pressed', 'false');
      });
      b.setAttribute('aria-pressed', 'true');
      edEmo.textContent = em;
      if (!reduce) {
        edEmo.animate(
          [
            { transform: 'scale(.4) rotate(-20deg)' },
            { transform: 'scale(1.25)' },
            { transform: 'scale(1)' },
          ],
          { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' },
        );
      }
    });
    emWrap.append(b);
  });
  colors.forEach(([name, hex]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `sw${hex ? '' : ' none'}`;
    b.setAttribute('aria-label', name);
    if (hex) {
      b.style.setProperty('--c', hex);
    }
    b.setAttribute('aria-pressed', String(name === 'terracotta'));
    b.addEventListener('click', () => {
      cWrap.querySelectorAll('.sw').forEach((x) => {
        x.setAttribute('aria-pressed', 'false');
      });
      b.setAttribute('aria-pressed', 'true');
      edKids.style.setProperty('--rail', hex || 'var(--cl-line)');
      edRow.style.background = hex ? `color-mix(in srgb, ${hex} 16%, transparent)` : '';
    });
    cWrap.append(b);
  });
  edRow.style.background = 'color-mix(in srgb, #c4623c 16%, transparent)';

  /* ---------- Toolbar popup ---------- */
  const slot = document.getElementById('popup-slot');
  const lockSlot = () => {
    slot.style.minHeight = '';
    slot.style.minHeight = `${slot.offsetHeight}px`;
  };
  listeners.push(() => {
    if (sw.getAttribute('aria-checked') !== 'true') {
      lockSlot();
    }
  });
  addEventListener('resize', () => {
    if (sw.getAttribute('aria-checked') !== 'true') {
      lockSlot();
    }
  });
  const sw = document.getElementById('hide-switch');
  const flip = () => {
    const on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(on));
    document.querySelectorAll('.popup-list .filed').forEach((d) => {
      d.classList.toggle('gone', on);
    });
  };
  sw.addEventListener('click', (e) => {
    e.preventDefault();
    flip();
  });
  document.getElementById('hide-toggle').addEventListener('click', (e) => {
    if (e.target !== sw) {
      e.preventDefault();
      flip();
    }
  });

  /* ---------- Reveal + count-up, from a visible resting state ---------- */
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) {
          continue;
        }
        io.unobserve(en.target);
        en.target.classList.remove('pre');
        en.target.querySelectorAll('[data-count]').forEach((b) => {
          const target = Number(b.dataset.count),
            t1 = performance.now();
          const step = (now) => {
            const p = Math.min(1, (now - t1) / 900);
            b.textContent = String(Math.round(target * (1 - (1 - p) ** 3)));
            if (p < 1) {
              requestAnimationFrame(step);
            }
          };
          requestAnimationFrame(step);
        });
      }
    },
    { threshold: 0.15 },
  );
  if (!reduce) {
    document.querySelectorAll('.reveal').forEach((el) => {
      if (el.getBoundingClientRect().top > innerHeight) {
        el.classList.add('pre');
      }
      io.observe(el);
    });
  }

  applyLang();
  route();
})();

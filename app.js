const tabsEl = document.getElementById('tabs');
const newTabBtn = document.getElementById('newTab');
const backBtn = document.getElementById('back');
const forwardBtn = document.getElementById('forward');
const reloadBtn = document.getElementById('reload');
const addressForm = document.getElementById('addressForm');
const addressInput = document.getElementById('address');
const suggestionsEl = document.getElementById('suggestions');
const newTabPage = document.getElementById('newTabPage');
const webview = document.getElementById('webview');
const newTabSearch = document.getElementById('newTabSearch');
const pageFavicon = document.getElementById('pageFavicon');

const crawlerIndex = [
  { title: 'Google', url: 'https://www.google.com' },
  { title: 'YouTube', url: 'https://www.youtube.com' },
  { title: 'GitHub', url: 'https://github.com' },
  { title: 'Wikipedia', url: 'https://wikipedia.org' },
  { title: 'Bing', url: 'https://www.bing.com' },
  { title: 'MDN Web Docs', url: 'https://developer.mozilla.org' }
];

let tabs = [];
let activeTabId = null;
let nextTabId = 1;

const escapeHtml = (text) =>
  text.replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));

const normalizeToUrl = (value) => {
  const query = value.trim();
  if (!query) return '';
  const isUrl = /^https?:\/\//i.test(query) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(query) || /^localhost:\d+/i.test(query);
  if (isUrl) return /^https?:\/\//i.test(query) ? query : `https://${query}`;
  return `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
};

const getFavicon = (url) => {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?sz=32&domain=${hostname}`;
  } catch {
    return 'assets/wave-favicon.svg';
  }
};

const getUrlTitle = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.hostname;
  } catch {
    return value.trim() || 'New Tab';
  }
};

const setPageIdentity = (url) => {
  const icon = getFavicon(url);
  pageFavicon.href = icon;
  document.title = `Wave Browser - ${getUrlTitle(url)}`;
};

const crawlWeb = (rawQuery) => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];
  return crawlerIndex
    .map((item) => ({
      ...item,
      score: (item.title.toLowerCase().includes(query) ? 2 : 0) + (item.url.toLowerCase().includes(query) ? 1 : 0)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
};

const openNewTab = () => {
  const id = nextTabId++;
  tabs.push({ id, title: 'New Tab', url: '', favicon: 'assets/wave-favicon.svg', history: [], index: -1 });
  activeTabId = id;
  renderTabs();
  showNewTabPage();
};

const closeTab = (id) => {
  tabs = tabs.filter((tab) => tab.id !== id);
  if (!tabs.length) {
    openNewTab();
    return;
  }
  if (activeTabId === id) activeTabId = tabs[tabs.length - 1].id;
  renderTabs();
  syncActiveTabView();
};

const renderTabs = () => {
  tabsEl.innerHTML = tabs
    .map(
      (tab) => `<button class="tab ${tab.id === activeTabId ? 'active' : ''}" data-id="${tab.id}" type="button">
        <img src="${tab.favicon}" alt="" />
        <span>${escapeHtml(tab.title)}</span>
        <span class="close" data-close="${tab.id}">×</span>
      </button>`
    )
    .join('');
};

const showNewTabPage = () => {
  newTabPage.style.display = 'grid';
  webview.classList.remove('visible');
  webview.src = 'about:blank';
  addressInput.value = '';
  document.title = 'Wave Browser';
  pageFavicon.href = 'assets/wave-favicon.svg';
};

const visit = (target) => {
  const active = tabs.find((t) => t.id === activeTabId);
  if (!active) return;

  const url = normalizeToUrl(target);
  if (!url) return;

  if (active.index < active.history.length - 1) active.history = active.history.slice(0, active.index + 1);
  active.history.push(url);
  active.index += 1;
  active.url = url;
  active.title = getUrlTitle(url);
  active.favicon = getFavicon(url);

  webview.src = url;
  addressInput.value = url;
  newTabSearch.value = '';
  newTabPage.style.display = 'none';
  webview.classList.add('visible');
  suggestionsEl.classList.remove('visible');
  setPageIdentity(url);
  renderTabs();
};

const syncActiveTabView = () => {
  const active = tabs.find((t) => t.id === activeTabId);
  if (!active || !active.url) {
    showNewTabPage();
    return;
  }
  webview.src = active.url;
  addressInput.value = active.url;
  newTabPage.style.display = 'none';
  webview.classList.add('visible');
  setPageIdentity(active.url);
};

const handleSuggestions = (raw) => {
  const query = raw.trim();
  if (!query) {
    suggestionsEl.classList.remove('visible');
    suggestionsEl.innerHTML = '';
    return;
  }

  const crawlMatches = crawlWeb(query);
  const defaultSearch = {
    title: `Search Bing for "${query}"`,
    url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`
  };

  const items = [defaultSearch, ...crawlMatches];
  suggestionsEl.innerHTML = items
    .map((item) => `<li data-url="${item.url}"><strong>${escapeHtml(item.title)}</strong><br /><small>${escapeHtml(item.url)}</small></li>`)
    .join('');
  suggestionsEl.classList.add('visible');
};

newTabBtn.addEventListener('click', openNewTab);

tabsEl.addEventListener('click', (event) => {
  const closeId = event.target.getAttribute('data-close');
  if (closeId) {
    closeTab(Number(closeId));
    return;
  }

  const tab = event.target.closest('[data-id]');
  if (!tab) return;
  activeTabId = Number(tab.getAttribute('data-id'));
  renderTabs();
  syncActiveTabView();
});

addressForm.addEventListener('submit', (event) => {
  event.preventDefault();
  visit(addressInput.value);
});

addressInput.addEventListener('input', (event) => handleSuggestions(event.target.value));
newTabSearch.addEventListener('input', (event) => handleSuggestions(event.target.value));
newTabSearch.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    visit(newTabSearch.value);
  }
});

suggestionsEl.addEventListener('click', (event) => {
  const item = event.target.closest('[data-url]');
  if (!item) return;
  visit(item.getAttribute('data-url'));
});

backBtn.addEventListener('click', () => {
  const active = tabs.find((t) => t.id === activeTabId);
  if (!active || active.index <= 0) return;
  active.index -= 1;
  active.url = active.history[active.index];
  active.title = getUrlTitle(active.url);
  active.favicon = getFavicon(active.url);
  webview.src = active.url;
  addressInput.value = active.url;
  setPageIdentity(active.url);
  renderTabs();
});

forwardBtn.addEventListener('click', () => {
  const active = tabs.find((t) => t.id === activeTabId);
  if (!active || active.index >= active.history.length - 1) return;
  active.index += 1;
  active.url = active.history[active.index];
  active.title = getUrlTitle(active.url);
  active.favicon = getFavicon(active.url);
  webview.src = active.url;
  addressInput.value = active.url;
  setPageIdentity(active.url);
  renderTabs();
});

reloadBtn.addEventListener('click', () => {
  if (webview.classList.contains('visible')) webview.src = webview.src;
});

openNewTab();

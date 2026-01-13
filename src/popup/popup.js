import browser from 'webextension-polyfill';

const SETTINGS_KEY = 'settings';
const AUTH_KEY = 'auth';
const accounts = [
  {
    username: 'maahir',
    password: 'maahir123',
    role: 'full'
  },
  {
    username: 'somaliland-waa-gobol',
    password: 'somaliland-waa-gobol',
    role: 'preview'
  }
];
const defaultSettings = {
  autoSelectAnswers: true,
  previewOnly: false,
  autoSkipVideo: true,
  autoAdvanceLesson: true,
  showSkipLectureButton: true,
  showStatusPanel: true,
  debugMode: false,
  paused: false
};

const autoSelectAnswersEl = document.getElementById('autoSelectAnswers');
const previewOnlyEl = document.getElementById('previewOnly');
const autoSkipVideoEl = document.getElementById('autoSkipVideo');
const autoAdvanceLessonEl = document.getElementById('autoAdvanceLesson');
const showSkipLectureButtonEl = document.getElementById('showSkipLectureButton');
const showStatusPanelEl = document.getElementById('showStatusPanel');
const debugModeEl = document.getElementById('debugMode');
const pausedEl = document.getElementById('paused');
const skipLectureNowEl = document.getElementById('skipLectureNow');
const previewOnlyRow = document.querySelector('[data-toggle="previewOnly"]');
const loginView = document.querySelector('[data-view="login"]');
const appView = document.querySelector('[data-view="app"]');
const loginForm = document.getElementById('loginForm');
const loginUsernameEl = document.getElementById('loginUsername');
const loginPasswordEl = document.getElementById('loginPassword');
const loginErrorEl = document.getElementById('loginError');
const loginSuggestEl = document.getElementById('loginSuggest');
const loginUsernamesEl = document.getElementById('loginUsernames');
const logoutEl = document.getElementById('logout');
const logoutLimitedEl = document.getElementById('logoutLimited');
const appFullEl = document.querySelector('.app-full');
const appPreviewEl = document.querySelector('.app-preview');
const previewOnlyLimitedEl = document.getElementById('previewOnlyLimited');
let currentRole = 'none';

const buildUsernameOptions = () => {
  if (!loginUsernamesEl)
    return;
  loginUsernamesEl.textContent = '';
  accounts.forEach(account => {
    const option = document.createElement('option');
    option.value = account.username;
    loginUsernamesEl.appendChild(option);
  });
};

const getUsernameSuggestion = value => {
  const normalized = value.trim().toLowerCase();
  if (!normalized)
    return null;
  const match = accounts.find(account => account.username.toLowerCase().startsWith(normalized));
  if (!match)
    return null;
  if (match.username.toLowerCase() === normalized)
    return null;
  return match.username;
};

const updateUsernameSuggestion = () => {
  if (!loginSuggestEl || !loginUsernameEl)
    return;
  const suggestion = getUsernameSuggestion(loginUsernameEl.value || '');
  if (suggestion) {
    loginSuggestEl.textContent = `Suggestion: ${suggestion} (Tab to complete)`;
  } else {
    loginSuggestEl.textContent = '';
  }
};

const applyUsernameSuggestion = () => {
  if (!loginUsernameEl)
    return false;
  const suggestion = getUsernameSuggestion(loginUsernameEl.value || '');
  if (!suggestion)
    return false;
  loginUsernameEl.value = suggestion;
  updateUsernameSuggestion();
  loginUsernameEl.setSelectionRange(suggestion.length, suggestion.length);
  return true;
};

const loadSettings = async () => {
  try {
    const stored = await browser.storage.local.get(SETTINGS_KEY);
    const settings = {...defaultSettings, ...(stored[SETTINGS_KEY] || {})};

    autoSelectAnswersEl.checked = !!settings.autoSelectAnswers;
    previewOnlyEl.checked = !!settings.previewOnly;
    if (previewOnlyLimitedEl) {
      previewOnlyLimitedEl.checked = !!settings.previewOnly;
    }
    autoSkipVideoEl.checked = !!settings.autoSkipVideo;
    autoAdvanceLessonEl.checked = !!settings.autoAdvanceLesson;
    showSkipLectureButtonEl.checked = !!settings.showSkipLectureButton;
    showStatusPanelEl.checked = !!settings.showStatusPanel;
    debugModeEl.checked = !!settings.debugMode;
    pausedEl.checked = !!settings.paused;
    updatePreviewToggleState();
  } catch (e) {
  }
};

const normalizeSettings = raw => {
  const next = {...raw};
  if (!next.autoSelectAnswers) {
    next.previewOnly = false;
  }
  if (next.previewOnly) {
    next.autoSelectAnswers = true;
  }
  return next;
};

const updatePreviewToggleState = () => {
  if (!autoSelectAnswersEl.checked) {
    previewOnlyEl.checked = false;
    previewOnlyEl.disabled = true;
  } else {
    previewOnlyEl.disabled = false;
  }
  previewOnlyRow?.classList.toggle('is-disabled', previewOnlyEl.disabled);
};

const saveSettings = async () => {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  const current = stored[SETTINGS_KEY] || {};
  let next = normalizeSettings({
    ...current,
    autoSelectAnswers: autoSelectAnswersEl.checked,
    previewOnly: previewOnlyEl.checked,
    autoSkipVideo: autoSkipVideoEl.checked,
    autoAdvanceLesson: autoAdvanceLessonEl.checked,
    showSkipLectureButton: showSkipLectureButtonEl.checked,
    showStatusPanel: showStatusPanelEl.checked,
    debugMode: debugModeEl.checked,
    paused: pausedEl.checked
  });

  if (currentRole === 'preview') {
    next = {
      ...next,
      autoSelectAnswers: true,
      previewOnly: previewOnlyLimitedEl ? previewOnlyLimitedEl.checked : true,
      autoSkipVideo: false,
      autoAdvanceLesson: false,
      showSkipLectureButton: false,
      showStatusPanel: false,
      debugMode: false,
      paused: false
    };
  }

  autoSelectAnswersEl.checked = !!next.autoSelectAnswers;
  previewOnlyEl.checked = !!next.previewOnly;
  if (previewOnlyLimitedEl) {
    previewOnlyLimitedEl.checked = !!next.previewOnly;
  }
  updatePreviewToggleState();

  await browser.storage.local.set({[SETTINGS_KEY]: next});
};

const setAuthView = loggedIn => {
  loginView?.classList.toggle('is-active', !loggedIn);
  appView?.classList.toggle('is-active', loggedIn);
};

const setRoleView = role => {
  currentRole = role;
  appFullEl?.classList.toggle('is-active', role === 'full');
  appPreviewEl?.classList.toggle('is-active', role === 'preview');
};

const loadAuth = async () => {
  const stored = await browser.storage.local.get(AUTH_KEY);
  const auth = stored[AUTH_KEY] || {};
  const loggedIn = !!auth.loggedIn;
  const hasValidRole = auth.role === 'full' || auth.role === 'preview';
  const hasUsername = !!auth.username;
  const isValid = loggedIn && hasValidRole && hasUsername;

  if (!isValid && loggedIn) {
    await browser.storage.local.set({[AUTH_KEY]: {loggedIn: false, username: auth.username || accounts[0].username, role: 'none'}});
  }

  setAuthView(isValid);
  setRoleView(isValid ? auth.role : 'none');
  if (loginUsernameEl) {
    loginUsernameEl.value = auth.username || accounts[0].username;
    updateUsernameSuggestion();
  }
};

const handleLogin = async event => {
  event.preventDefault();
  const username = loginUsernameEl?.value?.trim() || '';
  const password = loginPasswordEl?.value || '';
  const account = accounts.find(item => item.username.toLowerCase() === username.toLowerCase() && item.password === password);

  if (account) {
    await browser.storage.local.set({[AUTH_KEY]: {loggedIn: true, username: account.username, role: account.role}});
    if (loginErrorEl) {
      loginErrorEl.textContent = '';
    }
    setAuthView(true);
    setRoleView(account.role);
    if (account.role === 'preview' && previewOnlyLimitedEl) {
      previewOnlyLimitedEl.checked = true;
      saveSettings();
    }
    return;
  }

  if (loginErrorEl) {
    loginErrorEl.textContent = 'Invalid username or password.';
  }
};

const handleLogout = async () => {
  const stored = await browser.storage.local.get(AUTH_KEY);
  const auth = stored[AUTH_KEY] || {};
  await browser.storage.local.set({[AUTH_KEY]: {loggedIn: false, username: auth.username || accounts[0].username, role: 'none'}});
  setAuthView(false);
  setRoleView('none');
};

const skipLectureNow = async () => {
  const tabs = await browser.tabs.query({active: true, currentWindow: true});
  const tab = tabs[0];
  if (!tab?.id)
    return;
  try {
    await browser.tabs.sendMessage(tab.id, {action: 'skipLecture'});
  } catch (e) {
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const init = async () => {
    await loadAuth();
    await loadSettings();
    if (currentRole === 'preview') {
      saveSettings();
    }
  };
  init();

  buildUsernameOptions();
  if (loginUsernameEl) {
    loginUsernameEl.addEventListener('input', updateUsernameSuggestion);
    loginUsernameEl.addEventListener('keydown', event => {
      if (event.key === 'Tab' && !event.shiftKey) {
        if (applyUsernameSuggestion()) {
          event.preventDefault();
        }
      }
    });
  }

  autoSelectAnswersEl.addEventListener('change', saveSettings);
  previewOnlyEl.addEventListener('change', saveSettings);
  autoSkipVideoEl.addEventListener('change', saveSettings);
  autoAdvanceLessonEl.addEventListener('change', saveSettings);
  showSkipLectureButtonEl.addEventListener('change', saveSettings);
  showStatusPanelEl.addEventListener('change', saveSettings);
  debugModeEl.addEventListener('change', saveSettings);
  pausedEl.addEventListener('change', saveSettings);
  previewOnlyLimitedEl?.addEventListener('change', saveSettings);
  skipLectureNowEl.addEventListener('click', skipLectureNow);
  loginForm?.addEventListener('submit', handleLogin);
  logoutEl?.addEventListener('click', handleLogout);
  logoutLimitedEl?.addEventListener('click', handleLogout);

  document.querySelectorAll('[data-toggle]').forEach(row => {
    row.addEventListener('click', event => {
      if (event.target instanceof HTMLInputElement)
        return;
      if (event.target.closest('.switch'))
        return;
      const id = row.getAttribute('data-toggle');
      if (!id)
        return;
      const input = document.getElementById(id);
      if (!input || input.disabled)
        return;
      input.checked = !input.checked;
      saveSettings();
    });
  });
});

import browser from 'webextension-polyfill';
import {deepHtmlSearch, deepHtmlFindByTextContent} from "./domHelper";

let isSuspendRunning = false;
const components = [];
let questions = [];
const componentUrls = [];

const processedQuestionElements = new WeakSet();
const processedLabels = new WeakSet();
const processedMatchPairs = new WeakSet();
const processedDropdownOptions = new WeakSet();
const processedYesNoContainers = new WeakSet();
const processedOpenTextQuestions = new WeakSet();
const processedFillBlankDivs = new WeakSet();
const processedTableRows = new WeakSet();
const processedOpenTextButtons = new WeakSet();
const processedTableOptions = new WeakSet();
const processedFillBlankOptions = new WeakSet();
let autoSelectedElements = new WeakSet();
let autoSelectedYesNo = new WeakMap();
const observedYesNoElements = new WeakSet();
const processedVideos = new WeakSet();
const SETTINGS_KEY = 'settings';
const AUTH_KEY = 'auth';
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
let settings = {...defaultSettings};
let lastSettings = {...defaultSettings};
let isAuthenticated = false;
let authRole = 'none';
const STATUS_PANEL_ID = 'netacad-solver-status-panel';
const STYLE_ID = 'netacad-solver-style';
const PREVIEW_CLASS = 'netacad-solver-preview';
const REPORT_BUTTON_ID = 'netacad-solver-report-button';
const PREVIEW_BADGE_CLASS = 'netacad-solver-preview-badge';
const diagnostics = [];
const maxDiagnostics = 80;
const statusState = {
  answers: 'idle',
  video: 'idle',
  next: 'idle',
  mode: 'auto',
  course: 'default',
  paused: false
};
const watermarkId = 'netacad-solver-watermark';
const watermarkText = 'maahir';
const skipButtonId = 'netacad-solver-skip-button';
let skipLectureClickTimer = null;
let advanceTimer = null;
let advanceAttempts = 0;

const courseProfiles = [
  {
    name: 'netacad',
    match: url => url.hostname.endsWith('netacad.com'),
    nextButtonSelectors: [
      'button[aria-label*="Next" i]',
      'button[title*="Next" i]',
      '[data-automation*="next" i]',
      '[data-testid*="next" i]',
      'button.next',
      'a.next',
      '[role="button"][aria-label*="Next" i]'
    ],
    completionSelectors: [
      '.is-complete',
      '.is-completed',
      '.completed',
      '[data-status="completed"]',
      '[data-state="completed"]',
      '[aria-label*="completed" i]',
      '[aria-label*="complete" i]'
    ],
    completionButtonText: [
      'mark complete',
      'complete',
      'finish',
      'done'
    ],
    nextButtonText: [
      'next',
      'continue',
      'next lesson',
      'next activity',
      'next item',
      'next topic',
      'next module'
    ]
  },
  {
    name: 'default',
    match: () => true,
    nextButtonSelectors: [
      'button[aria-label*="Next" i]',
      'button[title*="Next" i]',
      '[data-automation*="next" i]',
      '[data-testid*="next" i]',
      'button.next',
      'a.next',
      '[role="button"][aria-label*="Next" i]'
    ],
    completionSelectors: [
      '.is-complete',
      '.is-completed',
      '.completed',
      '[data-status="completed"]',
      '[data-state="completed"]',
      '[aria-label*="completed" i]',
      '[aria-label*="complete" i]'
    ],
    completionButtonText: [
      'mark complete',
      'complete',
      'finish',
      'done'
    ],
    nextButtonText: [
      'next',
      'continue',
      'next lesson',
      'next activity',
      'next item',
      'next topic',
      'next module'
    ]
  }
];

const loadSettings = async () => {
  try {
    const stored = await browser.storage.local.get(SETTINGS_KEY);
    settings = {...defaultSettings, ...(stored[SETTINGS_KEY] || {})};
    lastSettings = {...settings};
  } catch (e) {
  }
};

const loadAuth = async () => {
  try {
    const stored = await browser.storage.local.get(AUTH_KEY);
    const auth = stored[AUTH_KEY] || {};
    isAuthenticated = !!auth.loggedIn;
    authRole = auth.role || 'none';
  } catch (e) {
    isAuthenticated = false;
    authRole = 'none';
  }
};

const applySettings = () => {
  ensureStyles();
  statusState.mode = settings.autoSelectAnswers ? (settings.previewOnly ? 'preview' : 'auto') : 'off';
  statusState.paused = settings.paused;
  statusState.course = getCourseProfile().name;
  if (!settings.autoSelectAnswers) {
    statusState.answers = 'off';
  }
  if (!settings.autoAdvanceLesson) {
    statusState.next = 'idle';
    if (advanceTimer) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
    }
    advanceAttempts = 0;
  }
  if (!isAuthenticated) {
    statusState.mode = 'locked';
    statusState.answers = 'locked';
    statusState.video = 'locked';
    statusState.next = 'locked';
  } else if (authRole !== 'full') {
    statusState.mode = 'preview';
    statusState.video = 'locked';
    statusState.next = 'locked';
  }

  updateStatusUI();

  if (settings.showSkipLectureButton && isAuthenticated && authRole === 'full') {
    ensureSkipButton();
  } else {
    removeSkipButton();
  }

  if (settings.showStatusPanel && authRole === 'full') {
    ensureStatusPanel();
  } else {
    removeStatusPanel();
  }
};

const resetAutoSelectionState = () => {
  autoSelectedElements = new WeakSet();
  autoSelectedYesNo = new WeakMap();
};

const clearPreviewStyles = root => {
  const targets = [...deepQueryAll(root, '[data-netacad-preview]')];
  targets.forEach(target => {
    target.classList?.remove(PREVIEW_CLASS);
    delete target.dataset.netacadPreview;
    delete target.dataset.netacadPreviewPadding;
    delete target.dataset.netacadPreviewRadius;
    target.style.background = '';
    target.style.color = '';
    target.style.border = '';
    target.style.borderRadius = '';
    target.style.padding = '';
    target.style.boxSizing = '';
    target.style.display = '';
    target.style.width = '';
    target.style.position = '';
    target.style.overflow = '';

    const badge = target.querySelector(`.${PREVIEW_BADGE_CLASS}`);
    badge?.remove();

    const controls = target.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    controls.forEach(control => {
      control.style.accentColor = '';
      control.style.border = '';
      control.style.backgroundColor = '';
    });

    const iconCandidates = target.querySelectorAll('[class*="radio"], [class*="check"], [class*="checkbox"]');
    iconCandidates.forEach(icon => {
      icon.style.color = '';
      icon.style.borderColor = '';
      icon.style.backgroundColor = '';
    });

    const svgs = target.querySelectorAll('svg');
    svgs.forEach(svg => {
      svg.style.fill = '';
      svg.style.stroke = '';
    });
  });
};

const previewYesNo = question => {
  const questionElement = deepHtmlSearch(question.questionDiv, '.img_question');
  const yesButton = deepHtmlSearch(question.questionDiv, '.user_selects_yes');
  const noButton = deepHtmlSearch(question.questionDiv, '.user_selects_no');
  autoSelectYesNo(question, questionElement, yesButton, noButton);
};

const previewFillBlanks = question => {
  const questionDivs = [...deepHtmlSearch(question.questionDiv, '.fillblanks__item', true, question.answersLength)];

  questionDivs.forEach(questionDiv => {
    const textContent = questionDiv.textContent.trim();

    for (const item of question.items) {
      if (textContent.startsWith(removeTagsFromString(item.preText)) && textContent.endsWith(removeTagsFromString(item.postText))) {
        for (const option of item._options) {
          if (option._isCorrect) {
            const dropdownItems = [...deepHtmlSearch(questionDiv, '.dropdown__item', true, item._options.length)];
            for (const dropdownItem of dropdownItems) {
              if (dropdownItem.textContent.trim() === option.text.trim()) {
                markPreview(dropdownItem);
                return;
              }
            }
          }
        }
      }
    }
  });
};

const previewTableDropdown = question => {
  const sectionDivs = Array.from(deepHtmlSearch(question.questionDiv, 'tbody tr', true, question.answersLength));

  sectionDivs.forEach((section, i) => {
    const optionElements = Array.from(deepHtmlSearch(section, '[role="option"]', true, question.items[i]._options.length));
    const correctOption = question.items[i]._options.find(option => option._isCorrect);

    for (const optionElement of optionElements) {
      if (optionElement.textContent.trim() === correctOption.text.trim()) {
        markPreview(optionElement);
        return;
      }
    }
  });
};

const previewOpenText = question => {
  question.items.forEach(item => {
    const optionText = item._options?.text?.trim();
    if (!optionText)
      return;
    const optionElement = deepHtmlFindByTextContent(question.questionDiv, optionText);
    if (optionElement) {
      markPreview(optionElement);
    }
  });
};

const refreshAutoSelection = () => {
  if (!isAuthenticated || !settings.autoSelectAnswers || settings.paused || questions.length === 0)
    return;

  questions.forEach(question => {
    if (question.questionType === 'basic') {
      selectBasic(question);
    } else if (question.questionType === 'match') {
      selectMatch(question);
    } else if (question.questionType === 'dropdownSelect') {
      selectDropdown(question);
    } else if (question.questionType === 'yesNo') {
      previewYesNo(question);
    } else if (question.questionType === 'fillBlanks') {
      previewFillBlanks(question);
    } else if (question.questionType === 'tableDropdown') {
      previewTableDropdown(question);
    } else if (question.questionType === 'openTextInput') {
      previewOpenText(question);
    }
  });
};

const handleSettingsUpdate = (prev, next) => {
  if ((prev.previewOnly && !next.previewOnly) || (!next.autoSelectAnswers)) {
    clearPreviewStyles(document);
  }

  if ((prev.previewOnly !== next.previewOnly) || (prev.autoSelectAnswers !== next.autoSelectAnswers)) {
    resetAutoSelectionState();
    refreshAutoSelection();
  }

  if (prev.paused && !next.paused) {
    resetAutoSelectionState();
    refreshAutoSelection();
  }
};

const removeSkipButton = () => {
  const button = document.getElementById(skipButtonId);
  button?.remove();
};

const removeStatusPanel = () => {
  const panel = document.getElementById(STATUS_PANEL_ID);
  panel?.remove();
};

const togglePause = async () => {
  const next = {...settings, paused: !settings.paused};
  await browser.storage.local.set({[SETTINGS_KEY]: next});
};

const getCourseProfile = () => {
  const url = new URL(window.location.href);

  for (const profile of courseProfiles) {
    if (profile.match(url)) {
      return profile;
    }
  }

  return courseProfiles[courseProfiles.length - 1];
};

const recordDiagnostic = (scope, message) => {
  if (!settings.debugMode)
    return;

  const entry = `[${new Date().toISOString()}] ${scope}: ${message}`;
  diagnostics.push(entry);
  if (diagnostics.length > maxDiagnostics) {
    diagnostics.shift();
  }
  console.info(entry);
  updateStatusUI();
};

const copyDiagnostics = async () => {
  const profile = getCourseProfile();
  const header = [
    `course=${profile.name}`,
    `url=${window.location.href}`,
    `mode=${statusState.mode}`,
    `paused=${settings.paused}`
  ].join('\n');
  const body = diagnostics.length ? diagnostics.join('\n') : 'No diagnostics collected.';
  const report = `${header}\n\n${body}`;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(report);
      recordDiagnostic('report', 'Copied diagnostics to clipboard');
    } else {
      throw new Error('Clipboard API unavailable');
    }
  } catch (e) {
    const textarea = document.createElement('textarea');
    textarea.value = report;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    recordDiagnostic('report', 'Copied diagnostics with fallback');
  }
};

const ensureStyles = () => {
  if (document.getElementById(STYLE_ID))
    return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${PREVIEW_CLASS} {
      outline: 2px solid #8ce4ff !important;
      outline-offset: 2px;
      border-radius: 6px;
    }

    #${STATUS_PANEL_ID} {
      position: fixed;
      left: 16px;
      bottom: 16px;
      z-index: 2147483647;
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      color: #0b3a4a;
      background: linear-gradient(135deg, #f7fbfd 0%, #eef9fd 100%);
      border: 1px solid #d7eef6;
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: 0 8px 20px rgba(15, 41, 56, 0.15);
      min-width: 200px;
    }

    #${STATUS_PANEL_ID} .ns-title {
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    #${STATUS_PANEL_ID} .ns-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 11px;
      padding: 2px 0;
    }

    #${STATUS_PANEL_ID} .ns-pill {
      padding: 2px 6px;
      border-radius: 999px;
      background: #ffffff;
      border: 1px solid #d7eef6;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    #${STATUS_PANEL_ID} button {
      margin-top: 6px;
      width: 100%;
      border: 1px solid #8ce4ff;
      border-radius: 8px;
      padding: 6px 8px;
      font-size: 11px;
      background: #ffffff;
      color: #0b3a4a;
      cursor: pointer;
    }

    #${STATUS_PANEL_ID} .ns-hotkey {
      margin-top: 6px;
      font-size: 10px;
      color: #6b7b86;
    }

    #${STATUS_PANEL_ID}[data-paused="true"] {
      opacity: 0.7;
    }
  `;

  document.documentElement.appendChild(style);
};

const ensureStatusPanel = () => {
  if (document.getElementById(STATUS_PANEL_ID))
    return;

  const panel = document.createElement('div');
  panel.id = STATUS_PANEL_ID;
  panel.innerHTML = `
    <div class="ns-title">maahir</div>
    <div class="ns-row"><span>Answers</span><span class="ns-pill" data-status="answers">idle</span></div>
    <div class="ns-row"><span>Video</span><span class="ns-pill" data-status="video">idle</span></div>
    <div class="ns-row"><span>Next</span><span class="ns-pill" data-status="next">idle</span></div>
    <div class="ns-row"><span>Mode</span><span class="ns-pill" data-status="mode">auto</span></div>
    <div class="ns-row"><span>Course</span><span class="ns-pill" data-status="course">default</span></div>
    <button id="${REPORT_BUTTON_ID}" type="button">Copy report</button>
    <div class="ns-hotkey">Hotkey: Alt+Shift+P</div>
  `;

  panel.querySelector(`#${REPORT_BUTTON_ID}`)?.addEventListener('click', () => {
    copyDiagnostics();
  });

  document.documentElement.appendChild(panel);
  updateStatusUI();
};

const updateStatusUI = () => {
  if (!settings.showStatusPanel)
    return;

  const panel = document.getElementById(STATUS_PANEL_ID);
  if (!panel)
    return;

  panel.dataset.paused = settings.paused ? 'true' : 'false';

  const setValue = (key, value) => {
    const el = panel.querySelector(`[data-status="${key}"]`);
    if (el) {
      el.textContent = value;
    }
  };

  setValue('answers', statusState.answers);
  setValue('video', statusState.video);
  setValue('next', statusState.next);
  setValue('mode', statusState.mode);
  setValue('course', statusState.course);
};

const deepQueryAll = (root, selector, results = new Set()) => {
  if (!root || !root.querySelectorAll)
    return results;

  root.querySelectorAll(selector).forEach(element => results.add(element));

  const iframes = root.querySelectorAll('iframe');
  for (const iframe of iframes) {
    let iframeDocument = null;
    try {
      iframeDocument = iframe.contentDocument;
    } catch (e) {
    }
    if (iframeDocument) {
      deepQueryAll(iframeDocument, selector, results);
    }
  }

  const elements = root.querySelectorAll('*');
  for (const element of elements) {
    if (element.shadowRoot) {
      deepQueryAll(element.shadowRoot, selector, results);
    }
  }

  return results;
};

const clickContinueButtons = (root, labels) => {
  if (!root?.querySelectorAll)
    return;

  const candidates = [...root.querySelectorAll('button, [role="button"], a')];
  const labelSet = labels || [];
  let clicked = 0;

  for (const candidate of candidates) {
    if (candidate.disabled)
      continue;
    const text = candidate.textContent?.trim().toLowerCase();
    if (!text)
      continue;
    if (labelSet.some(label => text.includes(label))) {
      candidate.click();
      clicked += 1;
    }
  }

  if (clicked === 0) {
    recordDiagnostic('buttons', 'No matching completion buttons found');
  }
};

const isElementVisible = element => {
  if (!element || !element.getBoundingClientRect)
    return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const findButtonsByText = (root, labels) => {
  if (!root?.querySelectorAll)
    return [];

  const candidates = [...root.querySelectorAll('button, [role="button"], a')];
  const labelSet = labels.map(label => label.toLowerCase());
  return candidates.filter(candidate => {
    if (candidate.disabled || candidate.getAttribute('aria-disabled') === 'true')
      return false;
    const text = candidate.textContent?.trim().toLowerCase();
    if (!text)
      return false;
    return labelSet.some(label => text.includes(label));
  });
};

const findNextButton = (root, profile) => {
  for (const selector of profile.nextButtonSelectors) {
    const matches = [...deepQueryAll(root, selector)];
    for (const match of matches) {
      if (!match.disabled && match.getAttribute('aria-disabled') !== 'true' && isElementVisible(match)) {
        return match;
      }
    }
  }

  const textMatches = findButtonsByText(root, profile.nextButtonText);
  const visible = textMatches.find(match => isElementVisible(match));
  if (visible)
    return visible;

  recordDiagnostic('next', 'Next button not found with selectors');
  return null;
};

const hasCompletionSignal = (root, profile) => {
  for (const selector of profile.completionSelectors) {
    const match = [...deepQueryAll(root, selector)][0];
    if (match)
      return true;
  }

  const videos = [...deepQueryAll(root, 'video')];
  if (videos.length > 0) {
    const allEnded = videos.every(video => {
      if (!isFinite(video.duration) || video.duration === 0)
        return false;
      return video.ended || (video.currentTime / video.duration) > 0.98;
    });
    if (allEnded)
      return true;
  }

  const progressBars = root?.querySelectorAll?.('progress, [role="progressbar"]') || [];
  for (const bar of progressBars) {
    const value = parseFloat(bar.getAttribute('aria-valuenow') || bar.value || '0');
    const max = parseFloat(bar.getAttribute('aria-valuemax') || bar.max || '100');
    if (max && value >= max) {
      return true;
    }
  }

  const textNodes = [...root.querySelectorAll?.('*') || []];
  for (const node of textNodes) {
    const text = node.textContent?.trim().toLowerCase();
    if (!text || text.length > 30)
      continue;
    if (text.includes('completed') || text.includes('complete') || text === '100%') {
      return true;
    }
  }

  return false;
};

const setStatus = (key, value) => {
  if (!isAuthenticated && key !== 'course') {
    if (statusState[key] !== 'locked') {
      statusState[key] = 'locked';
      updateStatusUI();
    }
    return;
  }
  if (statusState[key] === value)
    return;
  statusState[key] = value;
  updateStatusUI();
};

const getPreviewTarget = element => {
  if (!element)
    return null;
  const selector = 'label, .dropdown__item, [role="option"], button, .option, .choice, .answer, .mcq__option, .quiz__option';
  return element.closest?.(selector) || element;
};

const markPreview = element => {
  const target = getPreviewTarget(element);
  if (!target)
    return;
  if (target.dataset?.netacadPreview)
    return;
  target.dataset.netacadPreview = 'true';
  target.classList?.add(PREVIEW_CLASS);
  const computed = window.getComputedStyle(target);
  const computedPadding = `${computed.paddingTop} ${computed.paddingRight} ${computed.paddingBottom} ${computed.paddingLeft}`;
  const computedRadius = computed.borderRadius;
  target.dataset.netacadPreviewPadding = computedPadding;
  target.dataset.netacadPreviewRadius = computedRadius;
  target.style.background = '#2C3E87';
  target.style.color = '#ffffff';
  target.style.border = 'none';
  target.style.borderRadius = computedRadius;
  target.style.padding = computedPadding;
  target.style.boxSizing = 'border-box';
  if (computed.display === 'inline' || computed.display === 'inline-block') {
    target.style.display = 'block';
    target.style.width = '100%';
  }
  if (!target.style.position || target.style.position === 'static') {
    target.style.position = 'relative';
  }
  if (computed.overflow === 'hidden') {
    target.style.overflow = 'visible';
  }

  const controls = target.querySelectorAll('input[type="radio"], input[type="checkbox"]');
  controls.forEach(control => {
    control.style.accentColor = '#ffffff';
    control.style.border = '2px solid #ffffff';
    control.style.backgroundColor = '#2C3E87';
  });

  const iconCandidates = target.querySelectorAll('[class*="radio"], [class*="check"], [class*="checkbox"]');
  iconCandidates.forEach(icon => {
    icon.style.color = '#ffffff';
    icon.style.borderColor = '#ffffff';
    icon.style.backgroundColor = 'transparent';
  });

  const svgs = target.querySelectorAll('svg');
  svgs.forEach(svg => {
    svg.style.fill = '#ffffff';
    svg.style.stroke = '#ffffff';
  });

  if (!target.querySelector(`.${PREVIEW_BADGE_CLASS}`)) {
    const badge = document.createElement('span');
    badge.className = PREVIEW_BADGE_CLASS;
    badge.textContent = 'Correct Answer By Maahir';
    badge.style.position = 'absolute';
    badge.style.top = '6px';
    badge.style.right = '6px';
    badge.style.background = '#4CAF50';
    badge.style.color = '#ffffff';
    badge.style.padding = '4px 12px';
    badge.style.borderRadius = '4px';
    badge.style.fontSize = '12px';
    badge.style.fontFamily = 'Arial, sans-serif';
    badge.style.lineHeight = '1.2';
    badge.style.whiteSpace = 'nowrap';
    badge.style.zIndex = '1';
    target.appendChild(badge);
  }
};

const isQuestionSubmitted = question => {
  const root = question.questionDiv || question.questionElement;
  if (!root)
    return false;

  const selectors = [
    '.is-disabled',
    '.is-submitted',
    '.is-correct',
    '.is-incorrect',
    '[aria-disabled="true"]',
    '[data-status="submitted"]',
    '[data-state="submitted"]'
  ];

  if (root.querySelector?.(selectors.join(', ')))
    return true;

  const inputs = root.querySelectorAll?.('input, button, select, textarea') || [];
  for (const input of inputs) {
    if (input.disabled || input.getAttribute('aria-disabled') === 'true') {
      return true;
    }
  }

  return false;
};

const isEditableTarget = target => {
  if (!target)
    return false;
  const tag = target.tagName?.toLowerCase();
  return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
};

const finishVideo = (video, force = false) => {
  if (!video)
    return;
  if (!force && (!settings.autoSkipVideo || processedVideos.has(video)))
    return;
  if (!processedVideos.has(video)) {
    processedVideos.add(video);
  }

  const tryFinish = () => {
    if (!isFinite(video.duration) || video.duration === 0)
      return;

    try {
      video.playbackRate = 16;
      video.currentTime = Math.max(0, video.duration - 0.1);
      video.dispatchEvent(new Event('timeupdate', {bubbles: true}));
      video.dispatchEvent(new Event('seeking', {bubbles: true}));
      video.dispatchEvent(new Event('seeked', {bubbles: true}));
      video.dispatchEvent(new Event('ended', {bubbles: true}));
      setStatus('video', 'completed');
      if (settings.autoAdvanceLesson && !settings.paused) {
        advanceLessonWithBackoff(document);
      }
    } catch (e) {
    }
  };

  video.addEventListener('loadedmetadata', tryFinish, {once: true});
  video.addEventListener('canplay', tryFinish, {once: true});
  setStatus('video', 'finishing');
  tryFinish();
};

const autoSkipVideos = root => {
  if (!isFullAccess() || !settings.autoSkipVideo || settings.paused)
    return;

  const videos = [...deepQueryAll(root, 'video')];
  videos.forEach(video => finishVideo(video));
  if (videos.length === 0 && statusState.video !== 'completed') {
    setStatus('video', 'idle');
  }
};

const clickContinueSequence = (root, attempts = 4, delay = 800) => {
  if (!root)
    return;

  let count = 0;
  if (skipLectureClickTimer) {
    clearInterval(skipLectureClickTimer);
  }

  const profile = getCourseProfile();
  clickContinueButtons(root, profile.completionButtonText);
  skipLectureClickTimer = setInterval(() => {
    clickContinueButtons(root, profile.completionButtonText);
    count += 1;
    if (count >= attempts) {
      clearInterval(skipLectureClickTimer);
      skipLectureClickTimer = null;
    }
  }, delay);
};

const skipLectureNow = (root, force = false) => {
  if (!root)
    return;
  if (!isFullAccess() && !force)
    return;

  const videos = [...deepQueryAll(root, 'video')];
  videos.forEach(video => finishVideo(video, true));
  clickContinueSequence(root);
  advanceLessonWithBackoff(root, true);
};

const advanceLessonWithBackoff = (root, force = false) => {
  if (!isFullAccess() && !force)
    return;
  if (!force && (!settings.autoAdvanceLesson || settings.paused))
    return;

  if (!root)
    return;

  const profile = getCourseProfile();
  statusState.course = profile.name;
  updateStatusUI();

  const completed = hasCompletionSignal(root, profile);
  if (!completed) {
    setStatus('next', 'waiting');
    if (advanceAttempts === 0) {
      recordDiagnostic('completion', 'Completion indicator not found');
    }
    scheduleAdvance(root);
    return;
  }

  const nextButton = findNextButton(root, profile);
  if (nextButton) {
    nextButton.click();
    setStatus('next', 'clicked');
    advanceAttempts = 0;
    if (advanceTimer) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
    }
    return;
  }

  setStatus('next', 'waiting');
  scheduleAdvance(root);
};

const scheduleAdvance = root => {
  if (advanceAttempts >= 5)
    return;

  const delay = Math.min(5000, 700 * Math.pow(2, advanceAttempts));
  advanceAttempts += 1;

  if (advanceTimer) {
    clearTimeout(advanceTimer);
  }

  advanceTimer = setTimeout(() => {
    advanceLessonWithBackoff(root);
  }, delay);
};

const ensureWatermark = () => {
  if (window.top !== window)
    return;
  if (document.getElementById(watermarkId))
    return;

  const container = document.createElement('div');
  container.id = watermarkId;
  container.setAttribute('aria-hidden', 'true');
  container.style.position = 'fixed';
  container.style.bottom = '24px';
  container.style.left = '50%';
  container.style.transform = 'translateX(-50%)';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '2147483647';
  container.style.userSelect = 'none';
  container.style.paddingBottom = 'env(safe-area-inset-bottom)';

  const text = document.createElement('span');
  text.textContent = watermarkText;
  text.style.display = 'block';
  text.style.fontFamily = 'Arial, sans-serif';
  text.style.fontSize = '22px';
  text.style.letterSpacing = '2px';
  text.style.textTransform = 'uppercase';
  text.style.whiteSpace = 'nowrap';
  text.style.color = '#8CE4FF';

  container.appendChild(text);
  document.documentElement.appendChild(container);
};

const ensureSkipButton = () => {
  if (window.top !== window)
    return;
  if (document.getElementById(skipButtonId))
    return;

  const button = document.createElement('button');
  button.id = skipButtonId;
  button.type = 'button';
  button.textContent = 'Skip Lecture';
  button.setAttribute('aria-label', 'One-click Lecture Skip');
  button.style.position = 'fixed';
  button.style.right = '16px';
  button.style.bottom = '16px';
  button.style.zIndex = '2147483647';
  button.style.padding = '8px 12px';
  button.style.borderRadius = '999px';
  button.style.border = '1px solid #8CE4FF';
  button.style.background = '#ffffff';
  button.style.color = '#0b3a4a';
  button.style.fontFamily = 'Arial, sans-serif';
  button.style.fontSize = '12px';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.12)';

  button.addEventListener('click', () => {
    skipLectureNow(document);
  });

  document.documentElement.appendChild(button);
};

const autoSelectOnce = (element, action) => {
  if (!isAuthenticated || !settings.autoSelectAnswers || settings.paused || !element)
    return;
  if (autoSelectedElements.has(element))
    return;
  autoSelectedElements.add(element);
  action();
};

const shouldAutoAct = () => isFullAccess() && settings.autoSelectAnswers && !settings.paused;

const isFullAccess = () => isAuthenticated && authRole === 'full';

const selectBasic = question => {
  if (!isAuthenticated)
    return;
  if (isQuestionSubmitted(question))
    return;

  setStatus('answers', settings.previewOnly ? 'preview' : 'selected');

  const component = components.find(c => c._id === question.id);

  if (!component)
    return;

  question.inputs.forEach(({input, label}, i) => {
    if (!input || !label)
      return;

    const item = component._items[i];
    if (!item)
      return;

    const shouldSelect = item._shouldBeSelected;

    if (!isFullAccess()) {
      if (settings.previewOnly && shouldSelect) {
        markPreview(label);
      }
      return;
    }

    if (settings.previewOnly) {
      if (shouldSelect) {
        markPreview(label);
      }
      return;
    }

    if (shouldSelect && !input.checked) {
      label.click();
    } else if (!shouldSelect && input.checked) {
      label.click();
    }
  });
};

const selectMatch = question => {
  if (!isAuthenticated)
    return;
  if (isQuestionSubmitted(question))
    return;

  setStatus('answers', settings.previewOnly ? 'preview' : 'selected');

  question.inputs.forEach(input => {
    if (!input?.[0] || !input?.[1])
      return;

    if (!isFullAccess()) {
      if (settings.previewOnly) {
        markPreview(input[0]);
        markPreview(input[1]);
      }
      return;
    }

    if (settings.previewOnly) {
      markPreview(input[0]);
      markPreview(input[1]);
      return;
    }

    input[0].click();
    input[1].click();
  });
};

const selectDropdown = question => {
  if (!isAuthenticated)
    return;
  if (isQuestionSubmitted(question))
    return;

  setStatus('answers', settings.previewOnly ? 'preview' : 'selected');

  const option = question.inputs[0];
  if (!isFullAccess()) {
    if (settings.previewOnly) {
      markPreview(option);
    }
    return;
  }
  if (settings.previewOnly) {
    markPreview(option);
    return;
  }
  option?.click();
};

const autoSelectYesNo = (question, questionElement, yesButton, noButton) => {
  if (!isAuthenticated || !settings.autoSelectAnswers || settings.paused || !questionElement || !yesButton || !noButton)
    return;
  if (isQuestionSubmitted(question))
    return;

  const alt = questionElement.alt;
  if (!alt)
    return;

  const lastAlt = autoSelectedYesNo.get(question.questionDiv);
  if (lastAlt === alt)
    return;
  autoSelectedYesNo.set(question.questionDiv, alt);

  const item = question.items.find(currentItem => currentItem._graphic.alt === alt);
  if (!item)
    return;

  setStatus('answers', settings.previewOnly ? 'preview' : 'selected');

  if (!isFullAccess()) {
    if (settings.previewOnly) {
      if (item._shouldBeSelected) {
        markPreview(yesButton);
      } else {
        markPreview(noButton);
      }
    }
    return;
  }

  if (settings.previewOnly) {
    if (item._shouldBeSelected) {
      markPreview(yesButton);
    } else {
      markPreview(noButton);
    }
    return;
  }

  if (item._shouldBeSelected) {
    yesButton.click();
  } else {
    noButton.click();
  }
};

browser.runtime.onMessage.addListener(async (request) => {
  if (request?.componentsUrl && typeof request.componentsUrl === 'string' && !componentUrls.includes(request.componentsUrl)) {
    componentUrls.push(request.componentsUrl);
    await setComponents(request.componentsUrl);
    suspendMain();
  }

  if (request?.action === 'skipLecture') {
    skipLectureNow(document);
  }

  if (request?.action === 'togglePause') {
    togglePause();
  }
});

const setComponents = async url => {
  const getTextContentOfText = htmlString => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    return doc.body.textContent;
  };

  try {
    const res = await fetch(url);

    if (!res.ok)
      return;

    let json = await res.json();
    json = json
      .filter(component => component._items)
      .filter(component => !components.map(c => c._id).includes(component._id))
      .map(component => {
        component.body = getTextContentOfText(component.body);
        return component;
      });

    components.push(...json);
    if (settings.autoSelectAnswers) {
      setStatus('answers', 'loaded');
    } else {
      setStatus('answers', 'off');
    }
  } catch (e) {
    console.error(e);
    recordDiagnostic('components', `Failed to fetch components: ${e?.message || e}`);
  }
};

const setQuestionSections = async () => {
  let isAtLeaseOneSet = false;

  for (const component of components) {
    const questionDiv = deepHtmlSearch(document, `.${CSS.escape(component._id)}`);

    if (questionDiv) {
      isAtLeaseOneSet = true;
      let questionType = 'basic';

      if (component._items[0].text && component._items[0]._options) {
        questionType = 'dropdownSelect';
      } else if (component._items[0].question && component._items[0].answer) {
        questionType = 'match';
      } else if (component._items[0]._graphic?.alt && component._items[0]._graphic?.src) {
        questionType = 'yesNo';
      } else if (component._items[0].id && component._items[0]._options?.text) {
        questionType = 'openTextInput';
      } else if (component._items[0].preText && component._items[0].postText && component._items[0]._options?.[0]?.text) {
        questionType = 'fillBlanks';
      } else if (component._items[0]._options?.[0].text && typeof component._items[0]._options?.[0]._isCorrect === 'boolean') {
        questionType = 'tableDropdown';
      }

      questions.push({
        questionDiv,
        id: component._id,
        answersLength: component._items.length,
        questionType,
        items: component._items
      });
    }
  }

  if (!isAtLeaseOneSet) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await setQuestionSections();
  }
};

const findQuestionElement = document => {
  for (const component of components) {
    const questionElement = deepHtmlFindByTextContent(document, component.body);

    if (questionElement) {
      return questionElement;
    }
  }
};

const findAnswerInputsBasic = (document, questionId, answersLength, inputs = []) => {
  for (let i = 0; i < answersLength; i++) {
    const input = deepHtmlSearch(document, `#${CSS.escape(questionId)}-${i}-input`);
    const label = deepHtmlSearch(document, `#${CSS.escape(questionId)}-${i}-label`);

    if (input) {
      inputs.push({input, label});

      if (inputs.length === answersLength) {
        return inputs;
      }
    }
  }
};

const findAnswerInputsMatch = (document, answersLength, buttons = []) => {
  for (let i = 0; i < answersLength; i++) {
    const answerInputs = deepHtmlSearch(document, `[data-id="${i}"]`, false, 2);

    if (answerInputs) {
      buttons.push(answerInputs);

      if (buttons.length === answersLength) {
        return buttons;
      }
    }
  }
};

const setQuestionElements = () => {
  questions.map(question => {
    if (question.questionType === 'basic') {
      question.questionElement = findQuestionElement(question.questionDiv);
      question.inputs = findAnswerInputsBasic(question.questionDiv, question.id, question.answersLength) || [];
    } else if (question.questionType === 'match') {
      question.questionElement = findQuestionElement(question.questionDiv);
      question.inputs = findAnswerInputsMatch(question.questionDiv, question.answersLength) || [];
    } else if (question.questionType === 'dropdownSelect') {
      setDropdownSelectQuestions(question);
      question.skip = true;
    } else if (question.questionType === 'yesNo') {
      // yes - no questions are dynamic - they use the same elements but changes attributes
      initYeNoQuestions(question);
      question.skip = true;
    } else if (question.questionType === 'openTextInput') {
      // buttons are static but questions are moving around
      setOpenTextInputQuestions(question);
      question.skip = true;
    } else if (question.questionType === 'fillBlanks') {
      setFillBlanksQuestions(question);
      question.skip = true;
    } else if (question.questionType === 'tableDropdown') {
      // when there is no description in the table down only mouseover works
      setTableDropdownQuestions(question);
      question.skip = true;
    }

    return question;
  });
};

const setDropdownSelectQuestions = question => {
  question.items.forEach((item, i) => {
    const questionDiv = deepHtmlSearch(question.questionDiv, `[index="${i}"]`, true);
    const questionElement = deepHtmlFindByTextContent(questionDiv, item.text.trim());

    for (const [index, option] of item._options.entries()) {
      if (option._isCorrect) {
        const optionElement = deepHtmlSearch(questionDiv, `#dropdown__item-index-${index}`, true);

        questions.push({
          questionDiv,
          questionElement,
          inputs: [optionElement],
          questionType: question.questionType
        });
        return;
      }
    }
  });
};

const initYeNoQuestions = question => {
  if (processedYesNoContainers.has(question.questionDiv))
    return;
  processedYesNoContainers.add(question.questionDiv);

  const questionElement = deepHtmlSearch(question.questionDiv, `.img_question`);

  if (!questionElement)
    return;

  questionElement.parentElement?.addEventListener('click', e => {
    if (!shouldAutoAct())
      return;
    const questionElement = deepHtmlSearch(e.target, `.img_question`);

    for (const item of question.items) {
      if (questionElement.alt === item._graphic.alt) {
        if (item._shouldBeSelected) {
          const yesButton = deepHtmlSearch(question.questionDiv, `.user_selects_yes`);
          yesButton.click();
        } else {
          const noButton = deepHtmlSearch(question.questionDiv, `.user_selects_no`);
          noButton.click();
        }
      }
    }
  });

  const yesButton = deepHtmlSearch(question.questionDiv, `.user_selects_yes`);
  const noButton = deepHtmlSearch(question.questionDiv, `.user_selects_no`);

  autoSelectYesNo(question, questionElement, yesButton, noButton);

  if (questionElement && !observedYesNoElements.has(questionElement)) {
    observedYesNoElements.add(questionElement);
    const observer = new MutationObserver(() => {
      autoSelectYesNo(question, questionElement, yesButton, noButton);
    });
    observer.observe(questionElement, {attributes: true, attributeFilter: ['alt']});
  }

  yesButton?.addEventListener('mouseover', e => {
    if (!shouldAutoAct())
      return;
    if (e.ctrlKey) {
      const questionElement = deepHtmlSearch(question.questionDiv, `.img_question`);

      if (questionElement) {
        for (const item of question.items) {
          if (item._graphic.alt === questionElement.alt) {
            if (item._shouldBeSelected) {
              yesButton.click();
            }
            break;
          }
        }
      }
    }
  });

  noButton?.addEventListener('mouseover', e => {
    if (!shouldAutoAct())
      return;
    if (e.ctrlKey) {
      const questionElement = deepHtmlSearch(question.questionDiv, `.img_question`);

      if (questionElement) {
        for (const item of question.items) {
          if (item._graphic.alt === questionElement.alt) {
            if (!item._shouldBeSelected) {
              noButton.click();
            }
            break;
          }
        }
      }
    }
  });
};

const setOpenTextInputQuestions = question => {
  if (isQuestionSubmitted(question))
    return;

  question.items.forEach((item, i) => {
    const questionElement = deepHtmlSearch(question.questionDiv, '#' + CSS.escape(`${question.id}-option-${i}`));
    const button = deepHtmlSearch(question.questionDiv, `.current-item-${i}`, true);

    if (questionElement && !processedOpenTextQuestions.has(questionElement)) {
      processedOpenTextQuestions.add(questionElement);

      questionElement.addEventListener('click', () => {
        if (!shouldAutoAct())
          return;
        setTimeout(() => {
          button.click();
          const currentQuestion = questionElement.textContent?.trim();
          const position = question.items.find(item => item._options.text.trim() === currentQuestion)?.position?.[0];

          if (position) {
            setTimeout(() => {
              const input = deepHtmlSearch(question.questionDiv, `[data-target="${position}"]`);
              if (input) {
                input?.click();
              } else {
                question.questionDiv.click();
              }
            }, 100);
          }
        }, 100);
      });
    }

    if (questionElement) {
      autoSelectOnce(questionElement, () => {
        setStatus('answers', settings.previewOnly ? 'preview' : 'selected');
        if (!isFullAccess()) {
          if (settings.previewOnly) {
            markPreview(questionElement);
          }
          return;
        }
        if (settings.previewOnly) {
          markPreview(questionElement);
          return;
        }
        questionElement.click();
      });
    }

    if (button && !processedOpenTextButtons.has(button)) {
      processedOpenTextButtons.add(button);

      button.addEventListener('click', () => {
        if (!shouldAutoAct())
          return;
        setTimeout(() => {
          const currentQuestion = questionElement?.textContent?.trim();
          const position = question.items.find(item => item._options.text.trim() === currentQuestion)?.position?.[0];

          if (position) {
            setTimeout(() => {
              const input = deepHtmlSearch(question.questionDiv, `[data-target="${position}"]`);

              if (input && !input.dataset.hoverListenerAdded) {
                input.dataset.hoverListenerAdded = 'true';

                input.addEventListener('mouseover', e => {
                  if (e.ctrlKey) {
                    input.click();
                  }
                });
              }
            }, 100);
          }
        }, 100);
      });
    }
  });
};

const setFillBlanksQuestions = question => {
  if (isQuestionSubmitted(question))
    return;

  const questionDivs = [...deepHtmlSearch(question.questionDiv, '.fillblanks__item', true, question.answersLength)];

  questionDivs.forEach(questionDiv => {
    if (processedFillBlankDivs.has(questionDiv))
      return;
    processedFillBlankDivs.add(questionDiv);

    const textContent = questionDiv.textContent.trim();

    for (const item of question.items) {
      if (textContent.startsWith(removeTagsFromString(item.preText)) && textContent.endsWith(removeTagsFromString(item.postText))) {
        for (const option of item._options) {
          if (option._isCorrect) {
            const dropdownItems = [...deepHtmlSearch(questionDiv, '.dropdown__item', true, item._options.length)];

            for (const dropdownItem of dropdownItems) {
              if (processedFillBlankOptions.has(dropdownItem))
                break;
              processedFillBlankOptions.add(dropdownItem);

              if (dropdownItem.textContent.trim() === option.text.trim()) {
                questionDiv.addEventListener('click', (e) => {
                  if (!shouldAutoAct())
                    return;
                  if (!e.target.textContent?.trim())
                    return;
                  dropdownItem.click();
                });

                dropdownItem.addEventListener('mouseover', e => {
                  if (!shouldAutoAct())
                    return;
                  if (e.ctrlKey)
                    dropdownItem.click();
                });
                autoSelectOnce(questionDiv, () => {
                  setStatus('answers', settings.previewOnly ? 'preview' : 'selected');
                  if (!isFullAccess()) {
                    if (settings.previewOnly) {
                      markPreview(dropdownItem);
                    }
                    return;
                  }
                  if (settings.previewOnly) {
                    markPreview(dropdownItem);
                    return;
                  }
                  dropdownItem.click();
                });
                break;
              }
            }
            break;
          }
        }
        break;
      }
    }
  });
};

const setTableDropdownQuestions = question => {
  if (isQuestionSubmitted(question))
    return;

  const sectionDivs = Array.from(deepHtmlSearch(question.questionDiv, 'tbody tr', true, question.answersLength));

  sectionDivs.forEach((section, i) => {
    if (processedTableRows.has(section))
      return;
    processedTableRows.add(section);

    const optionElements = Array.from(deepHtmlSearch(section, '[role="option"]', true, question.items[i]._options.length));
    const correctOption = question.items[i]._options.find(option => option._isCorrect);

    for (const optionElement of optionElements) {
      if (processedTableOptions.has(optionElement))
        break;
      processedTableOptions.add(optionElement);

      if (optionElement.textContent.trim() === correctOption.text.trim()) {
        section.addEventListener('click', () => {
          if (!shouldAutoAct())
            return;
          optionElement.click();
        });

        optionElement.addEventListener('mouseover', e => {
          if (!shouldAutoAct())
            return;
          if (e.ctrlKey) {
            optionElement.click();
          }
        });
        autoSelectOnce(section, () => {
          setStatus('answers', settings.previewOnly ? 'preview' : 'selected');
          if (!isFullAccess()) {
            if (settings.previewOnly) {
              markPreview(optionElement);
            }
            return;
          }
          if (settings.previewOnly) {
            markPreview(optionElement);
            return;
          }
          optionElement.click();
        });
        break;
      }
    }
  });
};

const initClickListeners = () => {
  questions.forEach((question) => {
    if (question.skip || !question.questionElement)
      return;

    if (processedQuestionElements.has(question.questionElement))
      return;
    processedQuestionElements.add(question.questionElement);

    const applySelection = () => {
      if (!isAuthenticated || settings.paused)
        return;
      if (!settings.autoSelectAnswers)
        return;

      if (question.questionType === 'basic') {
        selectBasic(question);
      } else if (question.questionType === 'match') {
        selectMatch(question);
      } else if (question.questionType === 'dropdownSelect') {
        selectDropdown(question);
      }
    };

    question.questionElement.addEventListener('click', applySelection);
    autoSelectOnce(question.questionElement, applySelection);
  });
};

const initHoverListeners = () => {
  questions.forEach((question) => {
    if (question.skip)
      return;

    const component = components.find(c => c._id === question.id);

    if (question.questionType === 'basic') {
      question.inputs.forEach(({input, label}, i) => {
        if (!label || processedLabels.has(label))
          return;
        processedLabels.add(label);

        label.addEventListener('mouseover', e => {
          if (!isAuthenticated || settings.paused)
            return;
          if (!settings.autoSelectAnswers)
            return;
          if (e.ctrlKey) {
            if (!isFullAccess()) {
              if (settings.previewOnly && component._items[i]._shouldBeSelected) {
                markPreview(label);
              }
              return;
            }
            if (settings.previewOnly) {
              if (component._items[i]._shouldBeSelected) {
                markPreview(label);
              }
              return;
            }
            if (input.checked) {
              label.click();
            }

            if (component._items[i]._shouldBeSelected) {
              setTimeout(() => label.click(), 10);
            }
          }
        });
      });
    } else if (question.questionType === 'match') {
      question.inputs.forEach(input => {
        if (!input[0] || processedMatchPairs.has(input[0]))
          return;
        processedMatchPairs.add(input[0]);

        input[0].addEventListener('mouseover', e => {
          if (!isAuthenticated || settings.paused)
            return;
          if (!settings.autoSelectAnswers)
            return;
          if (e.ctrlKey) {
            if (!isFullAccess()) {
              if (settings.previewOnly) {
                markPreview(input[0]);
                markPreview(input[1]);
              }
              return;
            }
            if (settings.previewOnly) {
              markPreview(input[0]);
              markPreview(input[1]);
              return;
            }
            input[0].click();
            input[1].click();
          }
        });
      });
    } else if (question.questionType === 'dropdownSelect') {
      const optionEl = question.inputs[0];

      if (!optionEl || processedDropdownOptions.has(optionEl))
        return;
      processedDropdownOptions.add(optionEl);

      optionEl.addEventListener('mouseover', e => {
        if (!isAuthenticated || settings.paused)
          return;
        if (!settings.autoSelectAnswers)
          return;
        if (e.ctrlKey) {
          if (!isFullAccess()) {
            if (settings.previewOnly) {
              markPreview(optionEl);
            }
            return;
          }
          if (settings.previewOnly) {
            markPreview(optionEl);
            return;
          }
          optionEl.click();
        }
      });
    }
  });
};

const removeTagsFromString = string => string.replace(/<[^>]*>?/gm, '').trim();

const setIsReady = () => {
  for (const component of components) {
    const questionDiv = deepHtmlSearch(document, `.${CSS.escape(component._id)}`);

    if (questionDiv)
      return true;
  }

  return false;
};

const main = async () => {
  questions = [];
  await setQuestionSections();
  setQuestionElements();
  initClickListeners();
  initHoverListeners();
  refreshAutoSelection();
  if (settings.autoSelectAnswers && (statusState.answers === 'idle' || statusState.answers === 'loaded')) {
    setStatus('answers', 'ready');
  }
};

const suspendMain = () => {
  if (isSuspendRunning) return;

  isSuspendRunning = true;

  const checking = async () => {
    if (setIsReady()) {
      clearInterval(interval);
      main().finally(() => {
        isSuspendRunning = false;
      });
    }
  };

  const interval = setInterval(checking, 1000);
};

if (window) {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local')
      return;

  if (changes[AUTH_KEY]) {
      isAuthenticated = !!changes[AUTH_KEY].newValue?.loggedIn;
      authRole = changes[AUTH_KEY].newValue?.role || 'none';
      applySettings();
      if (!isAuthenticated) {
        clearPreviewStyles(document);
      } else {
        resetAutoSelectionState();
        refreshAutoSelection();
      }
    }

    if (!changes[SETTINGS_KEY])
      return;

    const prev = {...defaultSettings, ...(changes[SETTINGS_KEY].oldValue || lastSettings || {})};
    const next = {...defaultSettings, ...(changes[SETTINGS_KEY].newValue || {})};
    settings = next;
    applySettings();
    handleSettingsUpdate(prev, next);
    lastSettings = {...settings};
  });

  const initUi = async () => {
    await loadAuth();
    await loadSettings();
    ensureWatermark();
    applySettings();
    handleSettingsUpdate(defaultSettings, settings);
    autoSkipVideos(document);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUi, {once: true});
  } else {
    initUi();
  }

  window.addEventListener('keydown', e => {
    if (e.altKey && e.shiftKey && e.code === 'KeyP' && !isEditableTarget(e.target)) {
      togglePause();
    }
  });

  setInterval(() => {
    if (isSuspendRunning || components.length === 0)
      return;

    let visibleContainers = 0;
    for (const component of components) {
      if (deepHtmlSearch(document, `.${CSS.escape(component._id)}`)) {
        visibleContainers++;
      }
    }

    const processedCount = questions.length;

    if (visibleContainers !== processedCount) {
      suspendMain();
    }
  }, 1000);

  setInterval(() => {
    autoSkipVideos(document);
    if (!advanceTimer) {
      advanceLessonWithBackoff(document);
    }
  }, 2000);
}

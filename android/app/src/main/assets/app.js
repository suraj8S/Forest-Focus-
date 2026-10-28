// Forest Mobile App - Core Logic & State Engine
// Hardened with Senior Mobile Developer Exception Handling & Data Integrity

(function () {
  'use strict';

  // Global uncaught error guard
  window.addEventListener('error', function (evt) {
    console.error('Handled uncaught client error:', evt.message, 'at', evt.filename, ':', evt.lineno);
  });
  window.addEventListener('unhandledrejection', function (evt) {
    console.error('Handled unhandled promise rejection:', evt.reason);
  });

  // Safe Storage wrapper preventing QuotaExceededError crashes
  const SafeStorage = {
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (err) {
        console.warn('LocalStorage write failed (Quota or restricted):', err);
        return false;
      }
    },
    get: function (key, defaultValue) {
      try {
        const item = localStorage.getItem(key);
        if (!item) return defaultValue;
        return JSON.parse(item);
      } catch (err) {
        console.warn('LocalStorage read/parse failed, returning default:', err);
        return defaultValue;
      }
    }
  };

  const MOTIVATIONAL_QUOTES = [
    "Put your phone down, stay present.",
    "Your tree is depending on your willpower!",
    "One quiet moment grows a majestic forest.",
    "Deep work today, towering canopy tomorrow.",
    "Stay focused. Do not abandon your tree.",
    "Breathe deeply. Every minute counts.",
    "Great oaks from little acorns grow.",
    "Protect your focus like a sacred grove."
  ];

  const DEFAULT_TAGS = [
    { id: 'study', name: 'Study', color: '#6366F1', icon: '📚' },
    { id: 'work', name: 'Work', color: '#3B82F6', icon: '💻' },
    { id: 'code', name: 'Coding', color: '#10B981', icon: '⌨️' },
    { id: 'read', name: 'Reading', color: '#F59E0B', icon: '📖' },
    { id: 'zen', name: 'Meditation', color: '#14B8A6', icon: '🧘' },
    { id: 'rest', name: 'Rest', color: '#8B5CF6', icon: '☕' }
  ];

  const state = {
    coins: 60,
    selectedSpecies: 'classic_pine',
    unlockedSpecies: ['classic_pine'],
    selectedTag: DEFAULT_TAGS[0],
    tags: DEFAULT_TAGS,
    timerDuration: 25,
    timerState: 'idle',
    activeSession: null,
    remainingSeconds: 25 * 60,
    totalSeconds: 25 * 60,
    currentGrowthStage: 0,
    timerInterval: null,
    quoteInterval: null,
    trees: [],
    quests: [
      { id: 'q1', title: 'First Seed', desc: 'Plant 1 healthy tree today', target: 1, current: 0, reward: 25, claimed: false },
      { id: 'q2', title: 'Deep Work Flow', desc: 'Focus for 45+ total minutes', target: 45, current: 0, reward: 50, claimed: false },
      { id: 'q3', title: 'Botanical Explorer', desc: 'Plant 2 different species today', target: 2, current: 0, reward: 75, claimed: false },
      { id: 'q4', title: 'Iron Resolve', desc: 'Achieve a 100% survival rate today', target: 1, current: 0, reward: 100, claimed: false }
    ],
    settings: {
      sfx: true,
      haptics: true,
      screenAwake: true
    },
    activeTab: 'timer',
    gardenFilter: 'all'
  };

  // Safe Native Android Bridge Helpers
  function triggerHaptic(ms = 40) {
    if (!state.settings.haptics) return;
    try {
      if (window.AndroidNative && typeof window.AndroidNative.vibrate === 'function') {
        window.AndroidNative.vibrate(ms);
      } else if (navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(ms);
      }
    } catch (e) {
      console.warn('Haptic feedback error:', e);
    }
  }

  function setScreenWake(enable) {
    try {
      if (window.AndroidNative && typeof window.AndroidNative.keepScreenOn === 'function') {
        window.AndroidNative.keepScreenOn(Boolean(enable && state.settings.screenAwake));
      }
    } catch (e) {
      console.warn('Screen wake lock error:', e);
    }
  }

  function showToast(msg) {
    try {
      if (!msg) return;
      if (window.AndroidNative && typeof window.AndroidNative.showToast === 'function') {
        window.AndroidNative.showToast(String(msg));
      } else {
        console.log('[Toast Notification]', msg);
      }
    } catch (e) {
      console.warn('Toast display error:', e);
    }
  }

  function loadState() {
    const saved = SafeStorage.get('forest_app_data', null);
    if (saved && typeof saved === 'object') {
      const knownSpecies = new Set((window.TREE_SPECIES || []).map(species => species.id));
      const coins = Number(saved.coins);
      state.coins = Number.isSafeInteger(coins) ? Math.max(0, Math.min(coins, 1000000)) : state.coins;
      state.unlockedSpecies = Array.isArray(saved.unlockedSpecies)
        ? [...new Set(saved.unlockedSpecies.filter(id => knownSpecies.has(id))) ]
        : ['classic_pine'];
      if (!state.unlockedSpecies.includes('classic_pine')) state.unlockedSpecies.unshift('classic_pine');
      state.selectedSpecies = knownSpecies.has(saved.selectedSpecies) && state.unlockedSpecies.includes(saved.selectedSpecies)
        ? saved.selectedSpecies
        : 'classic_pine';
      const validTag = tag => DEFAULT_TAGS.find(defaultTag => defaultTag.id === (tag && tag.id)) || DEFAULT_TAGS[0];
      state.trees = Array.isArray(saved.trees) ? saved.trees.slice(0, 2000).filter(tree =>
        tree && typeof tree === 'object' && Number.isFinite(Number(tree.timestamp))
      ).map(tree => ({
        id: String(tree.id || '' ).slice(0, 80),
        speciesId: knownSpecies.has(tree.speciesId) ? tree.speciesId : 'classic_pine',
        tag: validTag(tree.tag),
        duration: Math.max(1, Math.min(120, Math.floor(Number(tree.duration) || 1))),
        timestamp: Number(tree.timestamp),
        isWithered: Boolean(tree.isWithered)
      })) : [];
      if (Array.isArray(saved.quests)) {
        state.quests = state.quests.map(defaultQuest => {
          const stored = saved.quests.find(quest => quest && quest.id === defaultQuest.id);
          const current = stored && Number.isFinite(Number(stored.current)) ? Number(stored.current) : 0;
          return { ...defaultQuest, current: Math.max(0, Math.min(defaultQuest.target, current)), claimed: Boolean(stored && stored.claimed) };
        });
      }
      const session = saved.activeSession;
      const validDurations = [15, 25, 45, 60, 90, 120];
      if (session && validDurations.includes(session.duration) && Number.isFinite(session.endsAt) &&
          session.endsAt > Date.now() && session.endsAt <= Date.now() + session.duration * 60000 + 5000) {
        state.activeSession = {
          startedAt: Number.isFinite(session.startedAt) ? session.startedAt : Date.now(),
          endsAt: session.endsAt,
          duration: session.duration,
          speciesId: knownSpecies.has(session.speciesId) ? session.speciesId : 'classic_pine',
          tag: validTag(session.tag)
        };
        state.timerState = 'running';
        state.timerDuration = session.duration;
        state.totalSeconds = session.duration * 60;
        state.remainingSeconds = Math.ceil((session.endsAt - Date.now()) / 1000);
        state.selectedSpecies = state.activeSession.speciesId;
        state.selectedTag = state.activeSession.tag;
      }
      if (saved.settings && typeof saved.settings === 'object') {
        state.settings = { ...state.settings, ...saved.settings };
      }
    }
  }

  function saveState() {
    SafeStorage.set('forest_app_data', {
      coins: state.coins,
      selectedSpecies: state.selectedSpecies,
      unlockedSpecies: state.unlockedSpecies,
      trees: state.trees,
      activeSession: state.activeSession,
      quests: state.quests,
      settings: state.settings
    });
  }

  const el = {};

  function cacheElements() {
    el.coinDisplay = document.getElementById('header-coins-val');
    el.treeArtBox = document.getElementById('tree-art-box');
    el.timerCountdown = document.getElementById('timer-countdown');
    el.motivationalQuote = document.getElementById('motivational-quote');
    el.progressRingFill = document.getElementById('progress-ring-fill');
    el.btnPlant = document.getElementById('btn-plant');
    el.btnGiveup = document.getElementById('btn-giveup');
    el.durationSelector = document.getElementById('duration-selector');
    el.currentTagDot = document.getElementById('current-tag-dot');
    el.currentTagName = document.getElementById('current-tag-name');
    el.activeSpeciesName = document.getElementById('active-species-name');

    el.modalGiveup = document.getElementById('modal-giveup');
    el.modalComplete = document.getElementById('modal-complete');
    el.modalTags = document.getElementById('modal-tags');
    el.modalSound = document.getElementById('modal-sound');
    el.modalSettings = document.getElementById('modal-settings');
    el.modalTreeInspect = document.getElementById('modal-tree-inspect');
  }

  function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (targetTab) {
          switchTab(targetTab);
          triggerHaptic(25);
          if (window.soundEngine) window.soundEngine.playSfx('tap');
        }
      });
    });
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.view').forEach(view => {
      view.classList.toggle('active', view.id === `view-${tabId}`);
    });

    try {
      if (tabId === 'forest') renderGardenView();
      if (tabId === 'shop') renderShopView();
      if (tabId === 'stats') renderStatsView();
      if (tabId === 'quests') renderQuestsView();
    } catch (err) {
      console.error('Error rendering tab ' + tabId + ':', err);
    }
  }

  function updateProgressRing(percent) {
    try {
      const radius = 130;
      const circumference = 2 * Math.PI * radius;
      const clamped = Math.max(0, Math.min(1, percent));
      const offset = circumference * (1 - clamped);
      if (el.progressRingFill) {
        el.progressRingFill.style.strokeDashoffset = offset;
      }
    } catch (e) {}
  }

  function formatTime(seconds) {
    const safeSec = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(safeSec / 60);
    const s = safeSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function calculateGrowthStage(progressRatio) {
    if (progressRatio < 0.20) return 0;
    if (progressRatio < 0.55) return 1;
    if (progressRatio < 0.85) return 2;
    return 3;
  }

  function updateTreeArt() {
    try {
      if (!el.treeArtBox || !window.TreeRenderer) return;
      const stage = state.timerState === 'running' ? state.currentGrowthStage : 3;
      el.treeArtBox.innerHTML = window.TreeRenderer.render(state.selectedSpecies, stage, false, 180);
      if (el.activeSpeciesName) {
        const sp = window.TreeRenderer.getSpecies(state.selectedSpecies);
        el.activeSpeciesName.textContent = sp ? sp.name : 'Cedar Pine';
      }
    } catch (err) {
      console.error('Error updating tree art:', err);
    }
  }

  function startFocusSession() {
    try {
      state.timerState = 'running';
      state.totalSeconds = Math.max(60, state.timerDuration * 60);
      state.remainingSeconds = state.totalSeconds;
      state.currentGrowthStage = 0;
      state.activeSession = {
        startedAt: Date.now(),
        endsAt: Date.now() + state.totalSeconds * 1000,
        duration: state.timerDuration,
        speciesId: state.selectedSpecies,
        tag: { ...state.selectedTag }
      };
      saveState();

      if (el.btnPlant) el.btnPlant.style.display = 'none';
      if (el.btnGiveup) el.btnGiveup.style.display = 'inline-block';
      if (el.durationSelector) {
        el.durationSelector.style.opacity = '0.35';
        el.durationSelector.style.pointerEvents = 'none';
      }
      if (el.treeArtBox) el.treeArtBox.classList.add('focusing');

      updateProgressRing(0);
      if (el.timerCountdown) el.timerCountdown.textContent = formatTime(state.remainingSeconds);
      updateTreeArt();

      if (window.soundEngine) window.soundEngine.playSfx('start');
      triggerHaptic(60);
      setScreenWake(true);

      rotateQuote();
      clearInterval(state.quoteInterval);
      state.quoteInterval = setInterval(rotateQuote, 15000);

      clearInterval(state.timerInterval);
      state.timerInterval = setInterval(() => {
        if (!state.activeSession) return;
        state.remainingSeconds = Math.max(0, Math.ceil((state.activeSession.endsAt - Date.now()) / 1000));

        const elapsed = state.totalSeconds - state.remainingSeconds;
        const progressRatio = elapsed / state.totalSeconds;
        updateProgressRing(progressRatio);
        if (el.timerCountdown) el.timerCountdown.textContent = formatTime(state.remainingSeconds);

        const newStage = calculateGrowthStage(progressRatio);
        if (newStage !== state.currentGrowthStage) {
          state.currentGrowthStage = newStage;
          updateTreeArt();
          triggerHaptic(30);
        }

        if (state.remainingSeconds <= 0) {
          completeFocusSession();
        }
      }, 1000);
    } catch (err) {
      console.error('Error initiating focus session:', err);
      resetTimerUI();
    }
  }

  function rotateQuote() {
    if (!el.motivationalQuote) return;
    try {
      const q = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
      el.motivationalQuote.style.opacity = '0';
      setTimeout(() => {
        el.motivationalQuote.textContent = q;
        el.motivationalQuote.style.opacity = '1';
      }, 300);
    } catch (e) {}
  }

  function resetTimerUI() {
    clearInterval(state.timerInterval);
    clearInterval(state.quoteInterval);
    state.timerState = 'idle';
    state.activeSession = null;
    saveState();
    state.remainingSeconds = state.timerDuration * 60;
    state.totalSeconds = state.remainingSeconds;
    state.currentGrowthStage = 0;

    if (el.btnPlant) el.btnPlant.style.display = 'flex';
    if (el.btnGiveup) el.btnGiveup.style.display = 'none';
    if (el.durationSelector) {
      el.durationSelector.style.opacity = '1';
      el.durationSelector.style.pointerEvents = 'auto';
    }
    if (el.treeArtBox) el.treeArtBox.classList.remove('focusing');

    updateProgressRing(1);
    if (el.timerCountdown) el.timerCountdown.textContent = formatTime(state.remainingSeconds);
    if (el.motivationalQuote) el.motivationalQuote.textContent = "Plant a tree to begin deep focus";
    updateTreeArt();
    setScreenWake(false);
  }

  function completeFocusSession() {
    try {
      clearInterval(state.timerInterval);
      clearInterval(state.quoteInterval);
      state.timerState = 'idle';
      state.activeSession = null;
      setScreenWake(false);

      const coinsEarned = Math.max(5, Math.floor(state.timerDuration / 2) + 2);
      state.coins += coinsEarned;
      updateCoinsDisplay();

      const newTree = {
        id: 'tree_' + Date.now(),
        speciesId: state.selectedSpecies,
        tag: { ...state.selectedTag },
        duration: state.timerDuration,
        timestamp: Date.now(),
        isWithered: false
      };
      state.trees.unshift(newTree);

      updateQuestProgressOnComplete(newTree);
      saveState();

      if (window.soundEngine) window.soundEngine.playSfx('complete');
      triggerHaptic(120);

      launchConfetti();
      showCompleteModal(newTree, coinsEarned);
      resetTimerUI();
    } catch (err) {
      console.error('Error during focus session completion:', err);
      resetTimerUI();
    }
  }

  function handleGiveUp() {
    try {
      clearInterval(state.timerInterval);
      clearInterval(state.quoteInterval);
      state.timerState = 'idle';
      state.activeSession = null;
      setScreenWake(false);

      const elapsedMinutes = Math.max(1, Math.floor((state.totalSeconds - state.remainingSeconds) / 60));
      const witheredTree = {
        id: 'tree_' + Date.now(),
        speciesId: state.selectedSpecies,
        tag: { ...state.selectedTag },
        duration: elapsedMinutes,
        timestamp: Date.now(),
        isWithered: true
      };
      state.trees.unshift(witheredTree);
      saveState();

      if (window.soundEngine) window.soundEngine.playSfx('fail');
      triggerHaptic(150);

      if (el.treeArtBox && window.TreeRenderer) {
        el.treeArtBox.innerHTML = window.TreeRenderer.render(state.selectedSpecies, 3, true, 180);
      }
      if (el.motivationalQuote) {
        el.motivationalQuote.textContent = "Your tree has withered away...";
      }

      setTimeout(() => {
        resetTimerUI();
      }, 2500);
    } catch (err) {
      console.error('Error handling give up:', err);
      resetTimerUI();
    }
  }

  function openModal(modal) {
    if (modal) modal.classList.add('show');
  }

  function closeModal(modal) {
    if (modal) modal.classList.remove('show');
  }

  function initModals() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

    if (el.btnGiveup) {
      el.btnGiveup.addEventListener('click', () => {
        triggerHaptic(40);
        const previewBox = document.getElementById('giveup-tree-preview');
        if (previewBox && window.TreeRenderer) {
          previewBox.innerHTML = window.TreeRenderer.render(state.selectedSpecies, 3, true, 130);
        }
        openModal(el.modalGiveup);
      });
    }

    const btnConfirmGiveup = document.getElementById('btn-confirm-giveup');
    if (btnConfirmGiveup) {
      btnConfirmGiveup.addEventListener('click', () => {
        closeModal(el.modalGiveup);
        handleGiveUp();
      });
    }

    const btnCancelGiveup = document.getElementById('btn-cancel-giveup');
    if (btnCancelGiveup) {
      btnCancelGiveup.addEventListener('click', () => {
        closeModal(el.modalGiveup);
      });
    }

    const btnFinishContinue = document.getElementById('btn-finish-continue');
    if (btnFinishContinue) {
      btnFinishContinue.addEventListener('click', () => {
        closeModal(el.modalComplete);
        switchTab('forest');
      });
    }

    const tagSelectorBtn = document.getElementById('tag-selector-btn');
    if (tagSelectorBtn) {
      tagSelectorBtn.addEventListener('click', () => {
        if (state.timerState === 'running') return;
        openTagSelectorModal();
      });
    }

    const btnSoundMenu = document.getElementById('btn-sound-menu');
    if (btnSoundMenu) {
      btnSoundMenu.addEventListener('click', () => {
        openModal(el.modalSound);
      });
    }

    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        openModal(el.modalSettings);
      });
    }

    const btnCloseInspect = document.getElementById('btn-close-inspect');
    if (btnCloseInspect) {
      btnCloseInspect.addEventListener('click', () => {
        closeModal(el.modalTreeInspect);
      });
    }

    const activeSpeciesPill = document.querySelector('.active-species-pill');
    if (activeSpeciesPill) {
      activeSpeciesPill.addEventListener('click', () => {
        if (state.timerState === 'running') return;
        switchTab('shop');
      });
    }
  }

  function showCompleteModal(tree, coins) {
    try {
      const preview = document.getElementById('complete-tree-preview');
      if (preview && window.TreeRenderer) {
        preview.innerHTML = window.TreeRenderer.render(tree.speciesId, 3, false, 140);
      }
      const coinSpan = document.getElementById('complete-coins-amount');
      if (coinSpan) coinSpan.textContent = `+${coins} Coins`;

      const title = document.getElementById('complete-species-title');
      if (title && window.TreeRenderer) {
        const sp = window.TreeRenderer.getSpecies(tree.speciesId);
        title.textContent = `Your ${sp ? sp.name : 'Tree'} is Flourishing!`;
      }

      openModal(el.modalComplete);
    } catch (e) {
      console.warn('Error showing completion modal:', e);
    }
  }

  function launchConfetti() {
    try {
      const container = document.getElementById('confetti-container');
      if (!container) return;
      container.innerHTML = '';
      const colors = ['#52B788', '#74C69D', '#FFD166', '#FF85A1', '#4CC9F0', '#F4A261'];
      for (let i = 0; i < 35; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = (Math.random() * 100) + 'vw';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = (Math.random() * 0.5) + 's';
        piece.style.animationDuration = (1.8 + Math.random() * 1.0) + 's';
        container.appendChild(piece);
      }
      setTimeout(() => { container.innerHTML = ''; }, 3200);
    } catch (e) {}
  }

  function openTagSelectorModal() {
    const grid = document.getElementById('tags-picker-grid');
    if (!grid) return;
    grid.innerHTML = '';

    state.tags.forEach(tag => {
      const item = document.createElement('div');
      item.className = `tag-picker-option ${state.selectedTag.id === tag.id ? 'selected' : ''}`;
      item.innerHTML = `
        <span style="background:${tag.color}; width:12px; height:12px; border-radius:50%;"></span>
        <span style="font-size:1.1rem">${tag.icon}</span>
        <span style="font-weight:600; font-size:0.9rem">${tag.name}</span>
      `;
      item.addEventListener('click', () => {
        state.selectedTag = tag;
        if (el.currentTagDot) el.currentTagDot.style.background = tag.color;
        if (el.currentTagName) el.currentTagName.textContent = `${tag.icon} ${tag.name}`;
        triggerHaptic(20);
        closeModal(el.modalTags);
      });
      grid.appendChild(item);
    });

    openModal(el.modalTags);
  }

  function renderGardenView() {
    const grid = document.getElementById('forest-grid-canvas');
    if (!grid) return;

    let filtered = state.trees;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (state.gardenFilter === 'today') {
      filtered = state.trees.filter(t => now - t.timestamp < oneDay);
    } else if (state.gardenFilter === 'week') {
      filtered = state.trees.filter(t => now - t.timestamp < 7 * oneDay);
    } else if (state.gardenFilter === 'month') {
      filtered = state.trees.filter(t => now - t.timestamp < 30 * oneDay);
    }

    const totalCount = filtered.length;
    const healthyCount = filtered.filter(t => !t.isWithered).length;
    const witheredCount = filtered.filter(t => t.isWithered).length;
    const survivalRate = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 100;

    const elHealthy = document.getElementById('forest-stat-healthy');
    const elWithered = document.getElementById('forest-stat-withered');
    const elRate = document.getElementById('forest-stat-rate');
    if (elHealthy) elHealthy.textContent = healthyCount;
    if (elWithered) elWithered.textContent = witheredCount;
    if (elRate) elRate.textContent = `${survivalRate}%`;

    document.querySelectorAll('.forest-filter-bar .filter-chip').forEach(chip => {
      const f = chip.getAttribute('data-filter');
      chip.classList.toggle('active', f === state.gardenFilter);
      chip.onclick = () => {
        state.gardenFilter = f;
        triggerHaptic(25);
        renderGardenView();
      };
    });

    grid.innerHTML = '';
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-forest-banner">
          <span class="empty-forest-icon">🌱</span>
          <p style="font-size:1rem; font-weight:700; margin-bottom:4px;">No trees planted yet</p>
          <p style="font-size:0.8rem;">Start a focus session on the timer tab to plant your first tree!</p>
        </div>
      `;
      return;
    }

    filtered.forEach(tree => {
      const tile = document.createElement('div');
      tile.className = `forest-tree-tile ${tree.isWithered ? 'withered' : ''}`;
      tile.innerHTML = `
        <span class="tile-tag-pill" style="background:${tree.tag ? tree.tag.color : '#52B788'}"></span>
        ${window.TreeRenderer ? window.TreeRenderer.render(tree.speciesId, 3, tree.isWithered, 65) : ''}
      `;
      tile.addEventListener('click', () => {
        triggerHaptic(30);
        inspectTree(tree);
      });
      grid.appendChild(tile);
    });
  }

  function inspectTree(tree) {
    if (!window.TreeRenderer) return;
    const sp = window.TreeRenderer.getSpecies(tree.speciesId);
    const inspectPreview = document.getElementById('inspect-art-preview');
    if (inspectPreview) inspectPreview.innerHTML = window.TreeRenderer.render(tree.speciesId, 3, tree.isWithered, 130);

    const inspectTitle = document.getElementById('inspect-title');
    if (inspectTitle) inspectTitle.textContent = `${sp ? sp.name : 'Tree'} ${sp ? sp.emoji : '🌲'}`;

    const inspectStatus = document.getElementById('inspect-status');
    if (inspectStatus) {
      inspectStatus.textContent = tree.isWithered ? '🥀 Withered / Abandoned' : '🌿 Thriving & Healthy';
      inspectStatus.style.color = tree.isWithered ? 'var(--accent-withered)' : 'var(--accent-mint)';
    }

    const inspectTag = document.getElementById('inspect-tag');
    if (inspectTag && tree.tag) {
      inspectTag.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${tree.tag.color}; margin-right:4px;"></span> ${tree.tag.icon} ${tree.tag.name}`;
    }

    const inspectDur = document.getElementById('inspect-duration');
    if (inspectDur) inspectDur.textContent = `${tree.duration} Minutes Focused`;

    const inspectDate = document.getElementById('inspect-date');
    if (inspectDate) inspectDate.textContent = new Date(tree.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

    openModal(el.modalTreeInspect);
  }

  function renderShopView() {
    const grid = document.getElementById('species-shop-grid');
    if (!grid || !window.TREE_SPECIES || !window.TreeRenderer) return;
    grid.innerHTML = '';

    window.TREE_SPECIES.forEach(sp => {
      const isUnlocked = state.unlockedSpecies.includes(sp.id);
      const isSelected = state.selectedSpecies === sp.id;

      const card = document.createElement('div');
      card.className = `species-card ${isSelected ? 'active-selected' : ''}`;

      let btnHtml = '';
      if (isSelected) {
        btnHtml = `<button class="btn-species-action selected">Selected ✓</button>`;
      } else if (isUnlocked) {
        btnHtml = `<button class="btn-species-action unlocked" data-action="select" data-id="${sp.id}">Plant Next</button>`;
      } else {
        btnHtml = `<button class="btn-species-action locked" data-action="unlock" data-id="${sp.id}">Unlock 🪙 ${sp.price}</button>`;
      }

      card.innerHTML = `
        <div class="card-tree-preview">
          ${window.TreeRenderer.render(sp.id, 3, false, 88)}
        </div>
        <h3 class="species-card-title">${sp.name} ${sp.emoji}</h3>
        <p class="species-card-desc">${sp.description}</p>
        ${btnHtml}
      `;

      const btn = card.querySelector('.btn-species-action');
      if (btn) {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-action');
          if (action === 'select') {
            state.selectedSpecies = sp.id;
            triggerHaptic(40);
            if (window.soundEngine) window.soundEngine.playSfx('tap');
            saveState();
            updateTreeArt();
            renderShopView();
          } else if (action === 'unlock') {
            if (state.coins >= sp.price) {
              state.coins -= sp.price;
              state.unlockedSpecies.push(sp.id);
              state.selectedSpecies = sp.id;
              updateCoinsDisplay();
              saveState();
              if (window.soundEngine) window.soundEngine.playSfx('coin');
              triggerHaptic(60);
              updateTreeArt();
              renderShopView();
              showToast(`Unlocked ${sp.name}!`);
            } else {
              triggerHaptic(80);
              showToast(`Need ${sp.price - state.coins} more coins!`);
            }
          }
        });
      }

      grid.appendChild(card);
    });
  }

  function renderStatsView() {
    try {
      const totalMinutes = state.trees.reduce((acc, t) => acc + (t.duration || 0), 0);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const elTotal = document.getElementById('stat-total-time');
      if (elTotal) elTotal.textContent = `${hours}h ${mins}m`;

      const totalPlanted = state.trees.length;
      const elPlanted = document.getElementById('stat-total-trees');
      if (elPlanted) elPlanted.textContent = totalPlanted;

      const healthyCount = state.trees.filter(t => !t.isWithered).length;
      const rate = totalPlanted > 0 ? Math.round((healthyCount / totalPlanted) * 100) : 100;
      const elSurv = document.getElementById('stat-survival-rate');
      if (elSurv) elSurv.textContent = `${rate}%`;

      const elStreak = document.getElementById('stat-streak');
      if (elStreak) elStreak.textContent = `${state.trees.length > 0 ? 3 : 0} Days 🔥`;

      renderWeeklyChart();
      renderCategoryBreakdown();
    } catch (err) {
      console.warn('Error rendering stats view:', err);
    }
  }

  function renderWeeklyChart() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const container = document.getElementById('weekly-chart-bars');
    if (!container) return;
    container.innerHTML = '';

    const dayTotals = [25, 45, 30, 60, 25, 50, 20];
    state.trees.forEach(t => {
      const d = new Date(t.timestamp).getDay();
      const idx = d === 0 ? 6 : d - 1;
      dayTotals[idx] += (t.duration || 0);
    });

    const maxVal = Math.max(...dayTotals, 60);

    days.forEach((day, i) => {
      const heightPercent = Math.min(100, Math.round((dayTotals[i] / maxVal) * 100));
      const col = document.createElement('div');
      col.className = 'chart-bar-col';
      col.innerHTML = `
        <div class="bar-pillar" style="height: ${heightPercent}%;"></div>
        <span class="bar-day-label">${day}</span>
      `;
      container.appendChild(col);
    });
  }

  function renderCategoryBreakdown() {
    const container = document.getElementById('tag-breakdown-container');
    if (!container) return;
    container.innerHTML = '';

    const tagDurations = {};
    let totalMins = 0;

    state.trees.forEach(t => {
      if (t.tag && t.tag.id) {
        tagDurations[t.tag.id] = (tagDurations[t.tag.id] || 0) + (t.duration || 0);
        totalMins += (t.duration || 0);
      }
    });

    state.tags.forEach(tag => {
      const mins = tagDurations[tag.id] || 0;
      const pct = totalMins > 0 ? Math.round((mins / totalMins) * 100) : 0;

      const row = document.createElement('div');
      row.className = 'tag-breakdown-row';
      row.innerHTML = `
        <div class="tag-row-header">
          <span>${tag.icon} ${tag.name}</span>
          <span style="color:var(--text-muted)">${mins}m (${pct}%)</span>
        </div>
        <div class="tag-progress-track">
          <div class="tag-progress-bar" style="width:${pct}%; background:${tag.color}"></div>
        </div>
      `;
      container.appendChild(row);
    });
  }

  function updateQuestProgressOnComplete(tree) {
    state.quests.forEach(q => {
      if (q.id === 'q1') q.current = Math.min(q.target, q.current + 1);
      if (q.id === 'q2') q.current = Math.min(q.target, q.current + (tree.duration || 0));
      if (q.id === 'q3') {
        const uniqueSpecies = new Set(state.trees.map(t => t.speciesId)).size;
        q.current = Math.min(q.target, uniqueSpecies);
      }
      if (q.id === 'q4') {
        const todayTrees = state.trees.filter(t => Date.now() - t.timestamp < 24 * 3600 * 1000);
        const allHealthy = todayTrees.length > 0 && todayTrees.every(t => !t.isWithered);
        if (allHealthy) q.current = 1;
      }
    });
  }

  function renderQuestsView() {
    const list = document.getElementById('quests-list-container');
    if (!list) return;
    list.innerHTML = '';

    state.quests.forEach(q => {
      const isComplete = q.current >= q.target;
      const pct = Math.min(100, Math.round((q.current / q.target) * 100));

      const item = document.createElement('div');
      item.className = 'quest-item';

      let claimBtnHtml = '';
      if (q.claimed) {
        claimBtnHtml = `<button class="btn-claim-quest claimed">Claimed ✓</button>`;
      } else if (isComplete) {
        claimBtnHtml = `<button class="btn-claim-quest" data-id="${q.id}">Claim 🪙 ${q.reward}</button>`;
      } else {
        claimBtnHtml = `<span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">${q.current}/${q.target}</span>`;
      }

      item.innerHTML = `
        <div class="quest-info">
          <h4 class="quest-title">${q.title}</h4>
          <p class="quest-desc">${q.desc}</p>
          <div class="quest-progress-track">
            <div class="quest-progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
        ${claimBtnHtml}
      `;

      const btn = item.querySelector('.btn-claim-quest:not(.claimed)');
      if (btn) {
        btn.addEventListener('click', () => {
          q.claimed = true;
          state.coins += q.reward;
          updateCoinsDisplay();
          saveState();
          if (window.soundEngine) window.soundEngine.playSfx('coin');
          triggerHaptic(60);
          launchConfetti();
          renderQuestsView();
        });
      }

      list.appendChild(item);
    });
  }

  function initSoundControls() {
    const soundCards = document.querySelectorAll('.sound-picker-card');
    const toggleHeaderBtn = document.getElementById('btn-sound-menu');

    soundCards.forEach(card => {
      card.addEventListener('click', () => {
        const soundType = card.getAttribute('data-sound');
        soundCards.forEach(c => c.classList.toggle('active', c === card));

        if (window.soundEngine) {
          window.soundEngine.setAmbient(soundType);
        }

        if (toggleHeaderBtn) {
          toggleHeaderBtn.classList.toggle('active', soundType !== 'off');
        }
        triggerHaptic(30);
      });
    });

    const volSlider = document.getElementById('ambient-volume-slider');
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        if (window.soundEngine) window.soundEngine.setVolume(v);
      });
    }
  }

  function initSettings() {
    const sfxToggle = document.getElementById('toggle-sfx');
    const hapticToggle = document.getElementById('toggle-haptic');
    const wakeToggle = document.getElementById('toggle-wake');

    if (sfxToggle) {
      sfxToggle.checked = state.settings.sfx;
      sfxToggle.onchange = () => {
        state.settings.sfx = sfxToggle.checked;
        if (window.soundEngine) window.soundEngine.sfxEnabled = sfxToggle.checked;
        saveState();
      };
    }

    if (hapticToggle) {
      hapticToggle.checked = state.settings.haptics;
      hapticToggle.onchange = () => {
        state.settings.haptics = hapticToggle.checked;
        saveState();
      };
    }

    if (wakeToggle) {
      wakeToggle.checked = state.settings.screenAwake;
      wakeToggle.onchange = () => {
        state.settings.screenAwake = wakeToggle.checked;
        setScreenWake(state.timerState === 'running');
        saveState();
      };
    }

    const btnLoadDemo = document.getElementById('btn-load-demo-data');
    if (btnLoadDemo) {
      btnLoadDemo.addEventListener('click', () => {
        loadDemoData();
        triggerHaptic(50);
        closeModal(el.modalSettings);
        showToast('Sample forest garden loaded!');
        switchTab('forest');
      });
    }

    const btnResetData = document.getElementById('btn-reset-data');
    if (btnResetData) {
      btnResetData.addEventListener('click', () => {
        if (confirm('Reset your forest and progress?')) {
          localStorage.removeItem('forest_app_data');
          location.reload();
        }
      });
    }
  }

  function loadDemoData() {
    const now = Date.now();
    const day = 24 * 3600 * 1000;
    state.coins = 380;
    state.unlockedSpecies = ['classic_pine', 'sakura', 'bonsai'];
    state.trees = [
      { id: 't1', speciesId: 'sakura', tag: DEFAULT_TAGS[0], duration: 45, timestamp: now - 3600000, isWithered: false },
      { id: 't2', speciesId: 'bonsai', tag: DEFAULT_TAGS[1], duration: 25, timestamp: now - 18000000, isWithered: false },
      { id: 't3', speciesId: 'classic_pine', tag: DEFAULT_TAGS[2], duration: 60, timestamp: now - 36000000, isWithered: false },
      { id: 't4', speciesId: 'classic_pine', tag: DEFAULT_TAGS[0], duration: 15, timestamp: now - 50000000, isWithered: true },
      { id: 't5', speciesId: 'sakura', tag: DEFAULT_TAGS[3], duration: 30, timestamp: now - 1.5 * day, isWithered: false },
      { id: 't6', speciesId: 'bonsai', tag: DEFAULT_TAGS[2], duration: 50, timestamp: now - 2 * day, isWithered: false },
      { id: 't7', speciesId: 'classic_pine', tag: DEFAULT_TAGS[1], duration: 25, timestamp: now - 2.8 * day, isWithered: false },
      { id: 't8', speciesId: 'sakura', tag: DEFAULT_TAGS[0], duration: 45, timestamp: now - 3.5 * day, isWithered: false },
      { id: 't9', speciesId: 'classic_pine', tag: DEFAULT_TAGS[4], duration: 20, timestamp: now - 4.2 * day, isWithered: false },
      { id: 't10', speciesId: 'bonsai', tag: DEFAULT_TAGS[1], duration: 35, timestamp: now - 5 * day, isWithered: false },
      { id: 't11', speciesId: 'classic_pine', tag: DEFAULT_TAGS[2], duration: 60, timestamp: now - 6 * day, isWithered: false }
    ];
    updateCoinsDisplay();
    saveState();
  }

  function updateCoinsDisplay() {
    if (el.coinDisplay) {
      el.coinDisplay.textContent = state.coins;
    }
  }

  function initDurationSelector() {
    const chips = document.querySelectorAll('.duration-chip');
    chips.forEach(chip => {
      chip.classList.toggle('selected', parseInt(chip.getAttribute('data-mins'), 10) === state.timerDuration);
      chip.addEventListener('click', () => {
        if (state.timerState === 'running') return;
        chips.forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');

        const dur = parseInt(chip.getAttribute('data-mins'), 10) || 25;
        state.timerDuration = dur;
        state.remainingSeconds = dur * 60;
        state.totalSeconds = dur * 60;

        if (el.timerCountdown) el.timerCountdown.textContent = formatTime(state.remainingSeconds);
        triggerHaptic(20);
        if (window.soundEngine) window.soundEngine.playSfx('tap');
      });
    });
  }

  window.handleAndroidBack = function () {
    try {
      const openModalEl = document.querySelector('.modal-backdrop.show');
      if (openModalEl) {
        closeModal(openModalEl);
        return true;
      }
      if (state.activeTab !== 'timer') {
        switchTab('timer');
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  function initApp() {
    try {
      loadState();
      cacheElements();
      initNavigation();
      initDurationSelector();
      initModals();
      initSoundControls();
      initSettings();

      if (el.btnPlant) {
        el.btnPlant.addEventListener('click', () => {
          startFocusSession();
        });
      }

      updateCoinsDisplay();
      updateTreeArt();
      if (state.timerState === 'running' && state.activeSession) {
        if (el.btnPlant) el.btnPlant.style.display = 'none';
        if (el.btnGiveup) el.btnGiveup.style.display = 'inline-block';
        if (el.durationSelector) {
          el.durationSelector.style.opacity = '0.35';
          el.durationSelector.style.pointerEvents = 'none';
        }
        if (el.treeArtBox) el.treeArtBox.classList.add('focusing');
        if (el.timerCountdown) el.timerCountdown.textContent = formatTime(state.remainingSeconds);
        setScreenWake(true);
        updateProgressRing(1 - state.remainingSeconds / state.totalSeconds);
        if (state.remainingSeconds <= 0) completeFocusSession();
        else {
          state.currentGrowthStage = calculateGrowthStage(1 - state.remainingSeconds / state.totalSeconds);
          updateTreeArt();
          rotateQuote();
          state.quoteInterval = setInterval(rotateQuote, 15000);
          state.timerInterval = setInterval(() => {
            if (!state.activeSession) return;
            state.remainingSeconds = Math.max(0, Math.ceil((state.activeSession.endsAt - Date.now()) / 1000));
            const progressRatio = 1 - state.remainingSeconds / state.totalSeconds;
            updateProgressRing(progressRatio);
            if (el.timerCountdown) el.timerCountdown.textContent = formatTime(state.remainingSeconds);
            const newStage = calculateGrowthStage(progressRatio);
            if (newStage !== state.currentGrowthStage) {
              state.currentGrowthStage = newStage;
              updateTreeArt();
              triggerHaptic(30);
            }
            if (state.remainingSeconds <= 0) completeFocusSession();
          }, 1000);
        }
      } else if (el.timerCountdown) el.timerCountdown.textContent = formatTime(state.remainingSeconds);
    } catch (err) {
      console.error('Fatal initialization error:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();

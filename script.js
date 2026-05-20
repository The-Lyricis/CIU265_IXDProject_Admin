import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config.js';

const $ = (id) => document.getElementById(id);

const els = {
    statusChip: $('status-chip'),
    loginPanel: $('login-panel'),
    appShell: $('app-shell'),
    loginForm: $('login-form'),
    passwordInput: $('password-input'),
    rememberInput: $('remember-input'),
    loginError: $('login-error'),
    logoutBtn: $('logout-btn'),
    sessionTitle: $('session-title'),
    sessionSubtitle: $('session-subtitle'),
    activeSessionId: $('active-session-id'),
    activeSessionState: $('active-session-state'),
    photoCount: $('photo-count'),
    articleCount: $('article-count'),
    interviewCount: $('interview-count'),
    unlockCount: $('unlock-count'),
    activityList: $('activity-list'),
    photoSpotlight: $('photo-spotlight'),
    photoList: $('photo-list'),
    articleList: $('article-list'),
    articleSummary: $('article-summary'),
    articleForm: $('article-form'),
    articleId: $('article-id-input'),
    articleTitle: $('article-title-input'),
    articleSubtitle: $('article-subtitle-input'),
    articleImage: $('article-image-input'),
    articleLayout: $('article-layout-input'),
    articleBody: $('article-body-input'),
    deleteArticleBtn: $('delete-article-btn'),
    unlockList: $('unlock-list'),
    npcList: $('npc-list'),
    npcSummary: $('npc-summary'),
    npcForm: $('npc-form'),
    npcId: $('npc-id-input'),
    npcHeadline: $('npc-headline-input'),
    npcSubtitle: $('npc-subtitle-input'),
    npcPortrait: $('npc-portrait-input'),
    npcBody: $('npc-body-input'),
    refreshBtn: $('refresh-btn'),
    reloadActivityBtn: $('reload-activity-btn'),
    reloadPhotosBtn: $('reload-photos-btn'),
    reloadArticlesBtn: $('reload-articles-btn'),
    reloadUnlocksBtn: $('reload-unlocks-btn'),
    deleteSessionPhotosBtn: $('delete-session-photos-btn'),
    deleteAllPhotosBtn: $('delete-all-photos-btn'),
    newSessionBtn: $('new-session-btn'),
    endSessionBtn: $('end-session-btn'),
    photoSummary: $('photo-summary'),
    unlockSummary: $('unlock-summary'),
    lockSummary: $('lock-summary'),
    liveIndicator: $('live-indicator'),
    statsStrip: $('stats-strip'),
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentSessionId = null;
let dashboard = null;
let selectedPhotoId = null;
let selectedArticleId = null;
let selectedNpcId = null;

function setStatus(text) {
    els.statusChip.textContent = text;
}

function shortId(value) {
    return value ? String(value).slice(0, 8) : '--';
}

function formatTime(value) {
    if (!value) return 'just now';
    return new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function setAppVisible(isVisible) {
    els.loginPanel.hidden = isVisible;
    els.appShell.hidden = !isVisible;
}

async function jsonRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    return result;
}

async function checkAuth() {
    const result = await jsonRequest('/api/auth/me');
    return !!result.authenticated;
}

async function login(password, remember) {
    await jsonRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password, remember }),
    });
}

async function logout() {
    await jsonRequest('/api/auth/logout', { method: 'POST' });
}

async function loadDashboard() {
    dashboard = await jsonRequest('/api/dashboard');
    return dashboard;
}

async function loadCurrentSession() {
    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw new Error(error.message);
    currentSessionId = data?.id || null;
    return data || null;
}

function renderSession(session) {
    if (!session) {
        els.sessionTitle.textContent = 'No active session';
        els.sessionSubtitle.textContent = 'Create a new session to start the experience.';
        els.activeSessionId.textContent = '--';
        els.activeSessionState.textContent = 'Inactive';
        return;
    }

    els.sessionTitle.textContent = `Session ${shortId(session.id)} active`;
    els.sessionSubtitle.textContent = `Started ${formatTime(session.started_at)}`;
    els.activeSessionId.textContent = session.id;
    els.activeSessionState.textContent = `${session.status || 'active'} · ${formatTime(session.started_at)}`;
}

function renderActivity(rows) {
    if (!rows.length) {
        els.activityList.innerHTML = '<div class="activity-empty">No records found.</div>';
        return;
    }

    els.activityList.innerHTML = rows.map((row) => `
        <article class="activity-row">
            <div>
                <strong>${row.type || 'record'}</strong>
                <small>${shortId(row.id)}</small>
            </div>
            <div>${row.summary || ''}</div>
            <div><small>${formatTime(row.created_at)}</small></div>
        </article>
    `).join('');
}

function renderSpotlight(photo) {
    if (!photo) {
        els.photoSpotlight.innerHTML = '<div class="activity-empty">Select a photo to inspect it.</div>';
        return;
    }

    const sourceLabel = photo.source ? `Source ${photo.source}` : 'Local capture';
    const sessionLabel = photo.session_id ? `Session ${shortId(photo.session_id)}` : 'No session';

    els.photoSpotlight.innerHTML = `
        <div class="spotlight-image-wrap">
            <img src="${photo.image_data}" alt="Citizen photo">
        </div>
        <div class="spotlight-meta">
            <div>
                <p class="section-label">Spotlight</p>
                <h3>${shortId(photo.id)} · ${photo.votes ?? 0} votes</h3>
                <p class="panel-summary">${sourceLabel} · ${sessionLabel}</p>
            </div>
            <div class="spotlight-tags">
                <span>${sessionLabel}</span>
                <span>${sourceLabel}</span>
                <span>${formatTime(photo.created_at)}</span>
            </div>
        </div>
    `;
}

function renderPhotoList(rows) {
    if (!rows.length) {
        els.photoList.innerHTML = '<div class="activity-empty">No photos found.</div>';
        renderSpotlight(null);
        els.photoSummary.textContent = 'No photos yet';
        return;
    }

    const sorted = [...rows].sort((a, b) => {
        if ((b.votes || 0) !== (a.votes || 0)) return (b.votes || 0) - (a.votes || 0);
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const nextPhoto = sorted.find((row) => row.id === selectedPhotoId) || sorted[0];
    selectedPhotoId = nextPhoto?.id || null;
    renderSpotlight(nextPhoto);
    els.photoSummary.textContent = `${sorted.length} photos · top ${sorted[0].votes ?? 0} votes`;

    els.photoList.innerHTML = sorted.map((row, index) => `
        <article class="photo-row ${index === 0 ? 'is-top' : ''}">
            <div>
                <strong>${shortId(row.id)} · ${row.votes ?? 0} votes</strong>
                <small>${row.session_id ? `Session ${shortId(row.session_id)}` : 'No session'} · ${formatTime(row.created_at)}</small>
            </div>
            <div class="photo-actions">
                <button class="btn btn-secondary" type="button" data-photo-id="${row.id}">Focus</button>
                <button class="btn btn-danger" type="button" data-photo-delete-id="${row.id}">Delete</button>
            </div>
        </article>
    `).join('');

    els.photoList.querySelectorAll('[data-photo-id]').forEach((button) => {
        button.addEventListener('click', () => {
            const target = sorted.find((row) => row.id === button.dataset.photoId);
            selectedPhotoId = target?.id || null;
            renderSpotlight(target);
        });
    });

    els.photoList.querySelectorAll('[data-photo-delete-id]').forEach((button) => {
        button.addEventListener('click', async () => {
            if (!window.confirm('Delete this photo permanently?')) return;
            await deletePhotoById(button.dataset.photoDeleteId);
        });
    });
}

function selectArticle(id) {
    const article = (dashboard?.articles || []).find((row) => row.id === id);
    if (!article) return;
    selectedArticleId = id;
    els.articleId.value = article.id;
    els.articleTitle.value = article.title || '';
    els.articleSubtitle.value = article.subtitle || '';
    els.articleImage.value = article.image_url || '';
    els.articleLayout.value = article.layout_position ?? '';
    els.articleBody.value = article.body || '';
    renderArticles(dashboard.articles || []);
}

function renderArticles(rows) {
    if (!rows.length) {
        els.articleList.innerHTML = '<div class="activity-empty">No articles found.</div>';
        els.articleSummary.textContent = 'No articles loaded';
        els.articleForm.reset();
        selectedArticleId = null;
        return;
    }

    if (!selectedArticleId || !rows.some((row) => row.id === selectedArticleId)) {
        selectedArticleId = rows[0].id;
    }

    els.articleSummary.textContent = `${rows.length} articles · selected ${shortId(selectedArticleId)}`;
    els.articleList.innerHTML = rows.map((row) => `
        <button class="list-pick ${row.id === selectedArticleId ? 'is-selected' : ''}" type="button" data-article-id="${row.id}">
            <strong>${row.title || 'Untitled article'}</strong>
            <small>${row.npc?.name || row.npc_id || 'No NPC'} · ${formatTime(row.created_at)}</small>
        </button>
    `).join('');

    els.articleList.querySelectorAll('[data-article-id]').forEach((button) => {
        button.addEventListener('click', () => selectArticle(button.dataset.articleId));
    });

    const selected = rows.find((row) => row.id === selectedArticleId);
    if (selected) {
        els.articleId.value = selected.id;
        els.articleTitle.value = selected.title || '';
        els.articleSubtitle.value = selected.subtitle || '';
        els.articleImage.value = selected.image_url || '';
        els.articleLayout.value = selected.layout_position ?? '';
        els.articleBody.value = selected.body || '';
    }
}

function renderUnlocks(rows) {
    if (!rows.length) {
        els.unlockList.innerHTML = '<div class="activity-empty">No unlocks found.</div>';
        els.unlockCount.textContent = '0';
        els.unlockSummary.textContent = 'No unlocks yet';
        return;
    }

    els.unlockCount.textContent = String(rows.length);
    els.unlockSummary.textContent = `${rows.length} unlocks · latest ${rows[0].npc?.name || rows[0].npc_id || 'Unknown NPC'}`;

    els.unlockList.innerHTML = rows.map((row) => `
        <article class="unlock-row">
            <div>
                <strong>${row.npc?.name || row.npc_id || '--'}</strong>
                <small>${row.npc?.role || 'Unknown role'} · ${row.npc?.era || 'No era'} · ${formatTime(row.completed_at)}</small>
                <span class="unlock-detail">${row.quote || row.notes || 'Interview unlocked successfully.'}</span>
            </div>
            <div class="photo-actions">
                <button class="btn btn-secondary" type="button" data-unlock-copy-id="${row.npc_id || ''}">Copy ID</button>
                <button class="btn btn-danger" type="button" data-unlock-delete-id="${row.id}">Remove</button>
            </div>
        </article>
    `).join('');

    els.unlockList.querySelectorAll('[data-unlock-copy-id]').forEach((button) => {
        button.addEventListener('click', async () => {
            await navigator.clipboard.writeText(button.dataset.unlockCopyId || '');
            button.textContent = 'Copied';
            setTimeout(() => { button.textContent = 'Copy ID'; }, 900);
        });
    });

    els.unlockList.querySelectorAll('[data-unlock-delete-id]').forEach((button) => {
        button.addEventListener('click', async () => {
            if (!window.confirm('Remove this unlock and its linked article?')) return;
            await deleteUnlock(button.dataset.unlockDeleteId);
        });
    });
}

function selectNpc(id) {
    const npc = (dashboard?.npc_profiles || []).find((row) => row.id === id);
    if (!npc) return;
    selectedNpcId = id;
    els.npcId.value = npc.id;
    els.npcHeadline.value = npc.default_headline || '';
    els.npcSubtitle.value = npc.default_subtitle || '';
    els.npcPortrait.value = npc.portrait_url || '';
    els.npcBody.value = npc.default_body || '';
    els.npcSummary.textContent = `${npc.name || npc.id} · ${npc.role || 'No role'}`;
    renderNpcs(dashboard.npc_profiles || []);
}

function renderNpcs(rows) {
    if (!rows.length) {
        els.npcList.innerHTML = '<div class="activity-empty">No NPC profiles found.</div>';
        els.npcForm.reset();
        selectedNpcId = null;
        return;
    }

    if (!selectedNpcId || !rows.some((row) => row.id === selectedNpcId)) {
        selectedNpcId = rows[0].id;
    }

    els.npcList.innerHTML = rows.map((row) => `
        <button class="list-pick ${row.id === selectedNpcId ? 'is-selected' : ''}" type="button" data-npc-id="${row.id}">
            <strong>${row.name || row.id}</strong>
            <small>${row.role || 'No role'} · ${row.era || 'No era'}</small>
        </button>
    `).join('');

    els.npcList.querySelectorAll('[data-npc-id]').forEach((button) => {
        button.addEventListener('click', () => selectNpc(button.dataset.npcId));
    });

    const selected = rows.find((row) => row.id === selectedNpcId);
    if (selected) {
        els.npcId.value = selected.id;
        els.npcHeadline.value = selected.default_headline || '';
        els.npcSubtitle.value = selected.default_subtitle || '';
        els.npcPortrait.value = selected.portrait_url || '';
        els.npcBody.value = selected.default_body || '';
        els.npcSummary.textContent = `${selected.name || selected.id} · ${selected.role || 'No role'}`;
    }
}

function renderSummaryStrip(data) {
    const counts = data?.counts || {};
    els.photoCount.textContent = String(counts.photos ?? 0);
    els.articleCount.textContent = String(counts.articles ?? 0);
    els.interviewCount.textContent = String(counts.unlocks ?? 0);
    els.unlockCount.textContent = String(counts.unlocks ?? 0);
    els.lockSummary.textContent = `${counts.npc_profiles ?? 0} npc profiles loaded`;
    els.liveIndicator.textContent = data?.session?.status === 'active' ? 'Live session' : 'Idle';
    els.statsStrip?.setAttribute('data-state', data?.session?.status || 'unknown');
}

function renderDashboard(data) {
    dashboard = data;
    renderSummaryStrip(data);
    renderSession(data?.session || null);
    renderPhotoList(data?.photos || []);
    renderArticles(data?.articles || []);
    renderUnlocks(data?.unlocks || []);
    renderNpcs(data?.npc_profiles || []);
    renderActivity(data?.recent_notes || []);
}

async function refreshAll() {
    setStatus('Refreshing');
    const [session, data] = await Promise.all([loadCurrentSession(), loadDashboard()]);
    renderSession(session);
    renderDashboard(data);
    setStatus('Live');
}

async function deletePhotoById(id) {
    await jsonRequest('/api/photos', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
    });
    if (selectedPhotoId === id) selectedPhotoId = null;
    await refreshAll();
}

async function deletePhotosByAction(action) {
    await jsonRequest('/api/photos', {
        method: 'POST',
        body: JSON.stringify({ action }),
    });
    selectedPhotoId = null;
    await refreshAll();
}

async function saveArticle() {
    await jsonRequest('/api/articles', {
        method: 'PATCH',
        body: JSON.stringify({
            id: els.articleId.value,
            title: els.articleTitle.value,
            subtitle: els.articleSubtitle.value,
            image_url: els.articleImage.value,
            layout_position: els.articleLayout.value,
            body: els.articleBody.value,
        }),
    });
    await refreshAll();
}

async function deleteArticle() {
    await jsonRequest('/api/articles', {
        method: 'DELETE',
        body: JSON.stringify({ id: els.articleId.value }),
    });
    selectedArticleId = null;
    await refreshAll();
}

async function deleteUnlock(id) {
    await jsonRequest('/api/unlocks', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
    });
    await refreshAll();
}

async function saveNpc() {
    await jsonRequest('/api/npcs', {
        method: 'PATCH',
        body: JSON.stringify({
            id: els.npcId.value,
            default_headline: els.npcHeadline.value,
            default_subtitle: els.npcSubtitle.value,
            portrait_url: els.npcPortrait.value,
            default_body: els.npcBody.value,
        }),
    });
    await refreshAll();
}

async function createNewSession() {
    const result = await jsonRequest('/api/sessions', { method: 'POST' });
    currentSessionId = result.session?.id || currentSessionId;
    await refreshAll();
}

async function endCurrentSession() {
    if (!currentSessionId) return;
    await jsonRequest(`/api/sessions/${encodeURIComponent(currentSessionId)}/end`, { method: 'POST' });
    await refreshAll();
}

function switchView(view) {
    document.querySelectorAll('[data-view]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.view === view);
    });
    document.querySelectorAll('[data-view-panel]').forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.viewPanel === view);
    });
}

async function bootApp() {
    const authenticated = await checkAuth();
    if (!authenticated) {
        setAppVisible(false);
        setStatus('Locked');
        return;
    }

    setAppVisible(true);
    try {
        await refreshAll();
    } catch (error) {
        console.error(error);
        setStatus('Offline');
        els.sessionTitle.textContent = 'Dashboard unavailable';
        els.sessionSubtitle.textContent = String(error.message || error);
        els.activityList.innerHTML = '<div class="activity-empty">Check Supabase keys, auth cookie, and API routes.</div>';
    }
}

els.loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    els.loginError.textContent = '';
    try {
        await login(els.passwordInput.value.trim(), els.rememberInput.checked);
        els.passwordInput.value = '';
        await bootApp();
    } catch (error) {
        console.error(error);
        els.loginError.textContent = 'Incorrect password or login failed.';
    }
});

els.logoutBtn?.addEventListener('click', async () => {
    await logout();
    setAppVisible(false);
    setStatus('Locked');
});

document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
});

els.refreshBtn?.addEventListener('click', () => refreshAll().catch(console.error));
els.reloadActivityBtn?.addEventListener('click', () => refreshAll().catch(console.error));
els.reloadPhotosBtn?.addEventListener('click', () => refreshAll().catch(console.error));
els.reloadArticlesBtn?.addEventListener('click', () => refreshAll().catch(console.error));
els.reloadUnlocksBtn?.addEventListener('click', () => refreshAll().catch(console.error));

els.deleteSessionPhotosBtn?.addEventListener('click', async () => {
    if (!window.confirm('Delete all photos in the current session?')) return;
    await deletePhotosByAction('delete-session');
});

els.deleteAllPhotosBtn?.addEventListener('click', async () => {
    if (!window.confirm('Delete every photo in the database? This cannot be undone.')) return;
    await deletePhotosByAction('delete-all');
});

els.articleForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await saveArticle();
});

els.deleteArticleBtn?.addEventListener('click', async () => {
    if (!els.articleId.value || !window.confirm('Delete this article?')) return;
    await deleteArticle();
});

els.npcForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await saveNpc();
});

els.newSessionBtn?.addEventListener('click', () => createNewSession().catch(console.error));
els.endSessionBtn?.addEventListener('click', () => endCurrentSession().catch(console.error));

await bootApp();

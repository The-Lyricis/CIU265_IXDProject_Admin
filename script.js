import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config.js';

const statusChip = document.getElementById('status-chip');
const loginPanel = document.getElementById('login-panel');
const appShell = document.getElementById('app-shell');
const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password-input');
const rememberInput = document.getElementById('remember-input');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const sessionTitle = document.getElementById('session-title');
const sessionSubtitle = document.getElementById('session-subtitle');
const activeSessionId = document.getElementById('active-session-id');
const activeSessionState = document.getElementById('active-session-state');
const photoCount = document.getElementById('photo-count');
const articleCount = document.getElementById('article-count');
const interviewCount = document.getElementById('interview-count');
const unlockCount = document.getElementById('unlock-count');
const activityList = document.getElementById('activity-list');
const photoSpotlight = document.getElementById('photo-spotlight');
const photoList = document.getElementById('photo-list');
const unlockList = document.getElementById('unlock-list');
const refreshBtn = document.getElementById('refresh-btn');
const reloadActivityBtn = document.getElementById('reload-activity-btn');
const reloadPhotosBtn = document.getElementById('reload-photos-btn');
const reloadUnlocksBtn = document.getElementById('reload-unlocks-btn');
const deleteSessionPhotosBtn = document.getElementById('delete-session-photos-btn');
const deleteAllPhotosBtn = document.getElementById('delete-all-photos-btn');
const newSessionBtn = document.getElementById('new-session-btn');
const endSessionBtn = document.getElementById('end-session-btn');
const photoSummary = document.getElementById('photo-summary');
const unlockSummary = document.getElementById('unlock-summary');
const lockSummary = document.getElementById('lock-summary');
const liveIndicator = document.getElementById('live-indicator');
const statsStrip = document.getElementById('stats-strip');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentSessionId = null;
let selectedPhotoId = null;

function setStatus(text) {
    statusChip.textContent = text;
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
    loginPanel.hidden = isVisible;
    appShell.hidden = !isVisible;
}

async function checkAuth() {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    const result = await response.json().catch(() => ({}));
    return !!result.authenticated;
}

async function login(password, remember) {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password, remember }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    return true;
}

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
}

async function loadDashboard() {
    const response = await fetch('/api/dashboard', { credentials: 'include' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    return result;
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
        sessionTitle.textContent = 'No active session';
        sessionSubtitle.textContent = 'Create a new session to start the experience.';
        activeSessionId.textContent = '--';
        activeSessionState.textContent = 'Inactive';
        return;
    }

    sessionTitle.textContent = `Session ${shortId(session.id)} active`;
    sessionSubtitle.textContent = `Started ${formatTime(session.started_at)}`;
    activeSessionId.textContent = session.id;
    activeSessionState.textContent = `${session.status || 'active'} • ${formatTime(session.started_at)}`;
}

function renderActivity(rows) {
    if (!rows.length) {
        activityList.innerHTML = '<div class="activity-empty">No records found.</div>';
        return;
    }

    activityList.innerHTML = rows.map((row) => {
        const type = row._type || 'record';
        const id = row.id || '--';
        const meta = row._meta || '';
        return `
            <article class="activity-row">
                <div>
                    <strong>${type}</strong>
                    <small>${id}</small>
                </div>
                <div>${meta}</div>
                <div><small>${formatTime(row.created_at || row.started_at || row.completed_at)}</small></div>
            </article>
        `;
    }).join('');
}

function renderSpotlight(photo) {
    if (!photo) {
        photoSpotlight.innerHTML = '<div class="activity-empty">Select a photo to inspect it.</div>';
        return;
    }

    const sourceLabel = photo.source ? `Source: ${photo.source}` : 'Source: local capture';
    const sessionLabel = photo.session_id ? `Session ${shortId(photo.session_id)}` : 'No session';

    photoSpotlight.innerHTML = `
        <div class="spotlight-image-wrap">
            <img src="${photo.image_data}" alt="Citizen photo">
        </div>
        <div class="spotlight-meta">
            <div>
                <p class="section-label">Spotlight</p>
                <h3>${shortId(photo.id)} · ${photo.votes ?? 0} votes</h3>
                <p class="panel-summary">${photo.source ? `Source ${photo.source}` : 'Local capture'} · ${photo.session_id ? `Session ${shortId(photo.session_id)}` : 'No session'}</p>
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
        photoList.innerHTML = '<div class="activity-empty">No photos found.</div>';
        renderSpotlight(null);
        if (photoSummary) photoSummary.textContent = 'No photos yet';
        return;
    }

    const sorted = [...rows].sort((a, b) => {
        if ((b.votes || 0) !== (a.votes || 0)) return (b.votes || 0) - (a.votes || 0);
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const nextPhoto = sorted.find((row) => row.id === selectedPhotoId) || sorted[0];
    selectedPhotoId = nextPhoto?.id || null;
    renderSpotlight(nextPhoto);

    if (photoSummary) {
        photoSummary.textContent = `${sorted.length} photos · top ${sorted[0].votes ?? 0} votes`;
    }

    photoList.innerHTML = sorted.map((row, index) => `
        <article class="photo-row ${index === 0 ? 'is-top' : ''}">
            <div>
                <strong>${shortId(row.id)} · ${row.votes ?? 0} votes</strong>
                <small>${row.session_id ? `Session ${shortId(row.session_id)}` : 'No session'} · ${formatTime(row.created_at)}</small>
            </div>
            <div class="photo-actions">
                <button class="btn btn-secondary" type="button" data-photo-id="${row.id}">Focus</button>
                <button class="btn btn-ghost" type="button" data-photo-delete-id="${row.id}">Delete</button>
            </div>
        </article>
    `).join('');

    photoList.querySelectorAll('[data-photo-id]').forEach((button) => {
        button.addEventListener('click', () => {
            const target = sorted.find((row) => row.id === button.dataset.photoId);
            selectedPhotoId = target?.id || null;
            renderSpotlight(target);
        });
    });

    photoList.querySelectorAll('[data-photo-delete-id]').forEach((button) => {
        button.addEventListener('click', async () => {
            const targetId = button.dataset.photoDeleteId || '';
            if (!targetId) return;
            if (!window.confirm('Delete this photo permanently?')) return;
            await deletePhotoById(targetId);
        });
    });
}

function renderUnlocks(rows) {
    if (!rows.length) {
        unlockList.innerHTML = '<div class="activity-empty">No unlocks found.</div>';
        unlockCount.textContent = '0';
        if (unlockSummary) unlockSummary.textContent = 'No unlocks yet';
        return;
    }

    unlockCount.textContent = String(rows.length);
    if (unlockSummary) {
        unlockSummary.textContent = `${rows.length} unlocks · latest ${rows[0].npc?.name || rows[0].npc_id || 'Unknown NPC'}`;
    }

    unlockList.innerHTML = rows.map((row) => `
        <article class="unlock-row">
            <div>
                <strong>${row.npc?.name || row.npc_id || '--'}</strong>
                <small>${row.npc?.role || 'Unknown role'} · ${row.npc?.era || 'No era'} · ${formatTime(row.completed_at)}</small>
                <span class="unlock-detail">${row.quote || row.notes || 'Interview unlocked successfully.'}</span>
            </div>
            <button class="btn btn-secondary" type="button" data-unlock-id="${row.npc_id || ''}">Copy ID</button>
        </article>
    `).join('');

    unlockList.querySelectorAll('[data-unlock-id]').forEach((button) => {
        button.addEventListener('click', async () => {
            const value = button.dataset.unlockId || '';
            try {
                await navigator.clipboard.writeText(value);
                button.textContent = 'Copied';
                setTimeout(() => {
                    button.textContent = 'Copy ID';
                }, 900);
            } catch {
                button.textContent = value;
            }
        });
    });
}

function renderSummaryStrip(data) {
    const counts = data?.counts || {};
    photoCount.textContent = String(counts.photos ?? 0);
    articleCount.textContent = String(counts.articles ?? 0);
    interviewCount.textContent = String(counts.unlocks ?? 0);
    unlockCount.textContent = String(counts.unlocks ?? 0);
    if (lockSummary) lockSummary.textContent = `${counts.npc_profiles ?? 0} npc profiles loaded`;
    if (liveIndicator) liveIndicator.textContent = data?.session?.status === 'active' ? 'Live session' : 'Idle';
    if (statsStrip) statsStrip.setAttribute('data-state', data?.session?.status || 'unknown');
}

function renderDashboard(data) {
    renderSummaryStrip(data);
    renderSession(data?.session || null);
    renderPhotoList(data?.photos || []);
    renderUnlocks(data?.unlocks || []);
    renderActivity(data?.recent_notes || []);
}

async function refreshAll() {
    setStatus('Refreshing');
    const [session, dashboard] = await Promise.all([
        loadCurrentSession(),
        loadDashboard(),
    ]);
    renderSession(session);
    renderDashboard(dashboard);
    setStatus('Live');
}

async function deletePhotoById(id) {
    const response = await fetch('/api/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    if (selectedPhotoId === id) selectedPhotoId = null;
    await refreshAll();
}

async function deletePhotosByAction(action) {
    const response = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    selectedPhotoId = null;
    await refreshAll();
}

async function createNewSession() {
    const response = await fetch('/api/sessions', { method: 'POST', credentials: 'include' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    currentSessionId = result.session?.id || currentSessionId;
    await refreshAll();
}

async function endCurrentSession() {
    if (!currentSessionId) return;
    const response = await fetch(`/api/sessions/${encodeURIComponent(currentSessionId)}/end`, {
        method: 'POST',
        credentials: 'include',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    await refreshAll();
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
        sessionTitle.textContent = 'Dashboard unavailable';
        sessionSubtitle.textContent = String(error.message || error);
        activityList.innerHTML = '<div class="activity-empty">Check your Supabase keys, auth cookie, and API routes.</div>';
    }
}

loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';
    const password = passwordInput.value.trim();
    const remember = rememberInput.checked;

    if (!password) {
        loginError.textContent = 'Please enter the admin password.';
        return;
    }

    try {
        await login(password, remember);
        passwordInput.value = '';
        await bootApp();
    } catch (error) {
        console.error(error);
        loginError.textContent = 'Incorrect password or login failed.';
    }
});

logoutBtn?.addEventListener('click', async () => {
    await logout();
    setAppVisible(false);
    setStatus('Locked');
    loginError.textContent = '';
});

refreshBtn?.addEventListener('click', () => refreshAll().catch((err) => {
    console.error(err);
    setStatus('Error');
}));

reloadActivityBtn?.addEventListener('click', () => loadDashboard().then(renderDashboard).catch(console.error));
reloadPhotosBtn?.addEventListener('click', () => loadDashboard().then(renderDashboard).catch(console.error));
reloadUnlocksBtn?.addEventListener('click', () => loadDashboard().then(renderDashboard).catch(console.error));

deleteSessionPhotosBtn?.addEventListener('click', async () => {
    if (!window.confirm('Delete all photos in the current session?')) return;
    try {
        await deletePhotosByAction('delete-session');
    } catch (err) {
        console.error(err);
        setStatus('Error');
    }
});

deleteAllPhotosBtn?.addEventListener('click', async () => {
    if (!window.confirm('Delete every photo in the database? This cannot be undone.')) return;
    try {
        await deletePhotosByAction('delete-all');
    } catch (err) {
        console.error(err);
        setStatus('Error');
    }
});

newSessionBtn?.addEventListener('click', () => createNewSession().catch((err) => {
    console.error(err);
    setStatus('Error');
}));

endSessionBtn?.addEventListener('click', () => endCurrentSession().catch((err) => {
    console.error(err);
    setStatus('Error');
}));

await bootApp();

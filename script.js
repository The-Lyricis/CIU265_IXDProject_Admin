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
const activityList = document.getElementById('activity-list');
const refreshBtn = document.getElementById('refresh-btn');
const reloadActivityBtn = document.getElementById('reload-activity-btn');
const newSessionBtn = document.getElementById('new-session-btn');
const endSessionBtn = document.getElementById('end-session-btn');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentSessionId = null;

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

async function loadCounts() {
    const [photos, articles, interviews] = await Promise.all([
        supabase.from('citizen_photos').select('id', { count: 'exact', head: true }),
        supabase.from('frontpage_articles').select('id', { count: 'exact', head: true }),
        supabase.from('interviews').select('id', { count: 'exact', head: true }),
    ]);

    photoCount.textContent = String(photos.count || 0);
    articleCount.textContent = String(articles.count || 0);
    interviewCount.textContent = String(interviews.count || 0);
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
                    <strong>${type}</strong><br>
                    <small>${id}</small>
                </div>
                <div>${meta}</div>
                <div><small>${formatTime(row.created_at || row.started_at || row.completed_at)}</small></div>
            </article>
        `;
    }).join('');
}

async function loadActivity() {
    const [photos, articles, interviews] = await Promise.all([
        supabase.from('citizen_photos').select('id, created_at, session_id, votes').order('created_at', { ascending: false }).limit(5),
        supabase.from('frontpage_articles').select('id, created_at, session_id, title').order('created_at', { ascending: false }).limit(5),
        supabase.from('interviews').select('id, completed_at, session_id, npc_id').order('completed_at', { ascending: false }).limit(5),
    ]);

    const rows = [
        ...(photos.data || []).map((row) => ({
            ...row,
            _type: 'photo',
            _meta: `session ${shortId(row.session_id)} • votes ${row.votes ?? 0}`,
        })),
        ...(articles.data || []).map((row) => ({
            ...row,
            _type: 'article',
            _meta: row.title || `session ${shortId(row.session_id)}`,
        })),
        ...(interviews.data || []).map((row) => ({
            ...row,
            _type: 'interview',
            _meta: row.npc_id || `session ${shortId(row.session_id)}`,
        })),
    ].sort((a, b) => new Date(b.created_at || b.completed_at || 0) - new Date(a.created_at || a.completed_at || 0))
     .slice(0, 10);

    renderActivity(rows);
}

async function refreshAll() {
    setStatus('Refreshing');
    const session = await loadCurrentSession();
    renderSession(session);
    await loadCounts();
    await loadActivity();
    setStatus('Live');
}

async function createNewSession() {
    const response = await fetch('/api/sessions', { method: 'POST', credentials: 'include' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    currentSessionId = result.session?.id || currentSessionId;
    renderSession(result.session);
    await loadActivity();
    await loadCounts();
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
        sessionTitle.textContent = 'Supabase unavailable';
        sessionSubtitle.textContent = String(error.message || error);
        activityList.innerHTML = '<div class="activity-empty">Check your Supabase keys and table permissions.</div>';
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

reloadActivityBtn?.addEventListener('click', () => loadActivity().catch(console.error));

newSessionBtn?.addEventListener('click', () => createNewSession().catch((err) => {
    console.error(err);
    setStatus('Error');
}));

endSessionBtn?.addEventListener('click', () => endCurrentSession().catch((err) => {
    console.error(err);
    setStatus('Error');
}));

await bootApp();

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config.js';

const statusChip = document.getElementById('status-chip');
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
    const { data, error } = await supabase
        .from('sessions')
        .insert({ status: 'active' })
        .select('*')
        .single();

    if (error) throw new Error(error.message);

    if (currentSessionId) {
        await supabase.from('sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', currentSessionId);
    }

    currentSessionId = data.id;
    renderSession(data);
    await loadActivity();
    await loadCounts();
}

async function endCurrentSession() {
    if (!currentSessionId) return;
    const { error } = await supabase
        .from('sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', currentSessionId);
    if (error) throw new Error(error.message);
    await refreshAll();
}

refreshBtn.addEventListener('click', () => refreshAll().catch((err) => {
    console.error(err);
    setStatus('Error');
}));

reloadActivityBtn.addEventListener('click', () => loadActivity().catch(console.error));

newSessionBtn.addEventListener('click', () => createNewSession().catch((err) => {
    console.error(err);
    setStatus('Error');
}));

endSessionBtn.addEventListener('click', () => endCurrentSession().catch((err) => {
    console.error(err);
    setStatus('Error');
}));

try {
    await refreshAll();
} catch (error) {
    console.error(error);
    setStatus('Offline');
    sessionTitle.textContent = 'Supabase unavailable';
    sessionSubtitle.textContent = String(error.message || error);
    activityList.innerHTML = '<div class="activity-empty">Check your Supabase keys and table permissions.</div>';
}

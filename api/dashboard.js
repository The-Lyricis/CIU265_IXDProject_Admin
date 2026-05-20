import { hasAdminCookie } from './_auth.js';
import { getSupabaseAdmin } from './_supabase.js';

function shortId(value) {
    return value ? String(value).slice(0, 8) : '--';
}

function toPublicPhoto(row) {
    return {
        id: row.id,
        session_id: row.session_id,
        votes: row.votes ?? 0,
        source: row.source || null,
        created_at: row.created_at,
        image_data: row.image_data,
        preview_url: row.image_data,
        label: `Photo ${shortId(row.id)}`,
    };
}

function toPublicUnlock(row, npc) {
    return {
        id: row.id,
        session_id: row.session_id,
        npc_id: row.npc_id,
        completed_at: row.completed_at,
        quote: row.quote || null,
        notes: row.notes || null,
        screenshot_url: row.screenshot_url || null,
        npc: npc || null,
    };
}

export default async function handler(req, res) {
    if (!hasAdminCookie(req)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
        res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing' });
        return;
    }

    try {
        const [
            sessionResult,
            photosResult,
            articlesResult,
            interviewsResult,
            npcResult,
        ] = await Promise.all([
            supabase
                .from('sessions')
                .select('*')
                .order('started_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
            supabase
                .from('citizen_photos')
                .select('id, created_at, session_id, votes, image_data, source')
                .order('created_at', { ascending: false })
                .limit(50),
            supabase
                .from('frontpage_articles')
                .select('id, created_at, session_id, npc_id, interview_id, title, subtitle, body, image_url, layout_position')
                .order('created_at', { ascending: false })
                .limit(20),
            supabase
                .from('interviews')
                .select('id, completed_at, session_id, npc_id, status, quote, notes, screenshot_url')
                .order('completed_at', { ascending: false })
                .limit(50),
            supabase
                .from('npc_profiles')
                .select('id, name, role, era, bio, portrait_url, default_headline, default_subtitle, default_body'),
        ]);

        if (sessionResult.error) throw sessionResult.error;
        if (photosResult.error) throw photosResult.error;
        if (articlesResult.error) throw articlesResult.error;
        if (interviewsResult.error) throw interviewsResult.error;
        if (npcResult.error) throw npcResult.error;

        const npcMap = new Map((npcResult.data || []).map((row) => [row.id, row]));
        const unlocks = (interviewsResult.data || []).map((row) => toPublicUnlock(row, npcMap.get(row.npc_id)));
        const photos = (photosResult.data || []).map(toPublicPhoto);
        const articles = (articlesResult.data || []).map((row) => ({
            ...row,
            npc: row.npc_id ? npcMap.get(row.npc_id) || null : null,
        }));
        const session = sessionResult.data || null;

        const topPhoto = [...photos].sort((a, b) => {
            if ((b.votes || 0) !== (a.votes || 0)) return (b.votes || 0) - (a.votes || 0);
            return new Date(b.created_at) - new Date(a.created_at);
        })[0] || null;

        const recentNotes = [
            ...photos.slice(0, 5).map((row) => ({
                type: 'photo',
                id: row.id,
                created_at: row.created_at,
                summary: `${row.votes ?? 0} votes`,
            })),
            ...unlocks.slice(0, 5).map((row) => ({
                type: 'unlock',
                id: row.id,
                created_at: row.completed_at,
                summary: row.npc?.name || row.npc_id || 'Unknown NPC',
            })),
            ...articles.slice(0, 5).map((row) => ({
                type: 'article',
                id: row.id,
                created_at: row.created_at,
                summary: row.title || row.npc_id || 'Frontpage article',
            })),
        ]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 12);

        res.json({
            session,
            counts: {
                photos: photos.length,
                articles: articles.length,
                unlocks: unlocks.length,
                npc_profiles: npcMap.size,
            },
            photos,
            top_photo: topPhoto,
            unlocks,
            articles,
            npc_profiles: Array.from(npcMap.values()),
            recent_notes: recentNotes,
        });
    } catch (error) {
        res.status(500).json({ error: String(error?.message || error), details: error });
    }
}

import { hasAdminCookie } from './_auth.js';
import { getSupabaseAdmin } from './_supabase.js';

async function deletePhoto(supabase, id) {
    const { error } = await supabase.from('citizen_photos').delete().eq('id', id);
    if (error) throw error;
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
        if (req.method === 'DELETE') {
            const body = req.body || {};
            const id = req.query.id || body.id;
            const session_id = req.query.session_id || body.session_id;
            const scope = req.query.scope || body.scope;

            if (id) {
                await deletePhoto(supabase, id);
                res.json({ ok: true, deleted: 1, scope: 'single' });
                return;
            }

            if (scope === 'session' || session_id) {
                let query = supabase.from('citizen_photos').delete();
                if (session_id) {
                    query = query.eq('session_id', session_id);
                } else {
                    const { data: currentSession } = await supabase
                        .from('sessions')
                        .select('id')
                        .eq('status', 'active')
                        .order('started_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (!currentSession?.id) {
                        res.status(400).json({ error: 'No active session found' });
                        return;
                    }

                    query = query.eq('session_id', currentSession.id);
                }

                const { error } = await query;
                if (error) throw error;
                res.json({ ok: true, deleted: 'session' });
                return;
            }

            if (scope === 'all') {
                const { data: allRows, error: fetchError } = await supabase
                    .from('citizen_photos')
                    .select('id');

                if (fetchError) throw fetchError;

                const ids = (allRows || []).map((row) => row.id).filter(Boolean);
                if (!ids.length) {
                    res.json({ ok: true, deleted: 0 });
                    return;
                }

                const { error } = await supabase.from('citizen_photos').delete().in('id', ids);
                if (error) throw error;
                res.json({ ok: true, deleted: ids.length, scope: 'all' });
                return;
            }

            res.status(400).json({ error: 'Missing delete target' });
            return;
        }

        if (req.method === 'POST') {
            const body = req.body || {};
            const { action, id, session_id } = body;

            if (action === 'delete-one' && id) {
                await deletePhoto(supabase, id);
                res.json({ ok: true, deleted: 1 });
                return;
            }

            if (action === 'delete-session') {
                const targetSessionId = session_id || null;
                let query = supabase.from('citizen_photos').delete();

                if (targetSessionId) {
                    query = query.eq('session_id', targetSessionId);
                } else {
                    const { data: currentSession } = await supabase
                        .from('sessions')
                        .select('id')
                        .eq('status', 'active')
                        .order('started_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (!currentSession?.id) {
                        res.status(400).json({ error: 'No active session found' });
                        return;
                    }

                    query = query.eq('session_id', currentSession.id);
                }

                const { error } = await query;
                if (error) throw error;
                res.json({ ok: true, deleted: 'session' });
                return;
            }

            if (action === 'delete-all') {
                const { data: allRows, error: fetchError } = await supabase
                    .from('citizen_photos')
                    .select('id');

                if (fetchError) throw fetchError;

                const ids = (allRows || []).map((row) => row.id).filter(Boolean);
                if (!ids.length) {
                    res.json({ ok: true, deleted: 0 });
                    return;
                }

                const { error } = await supabase.from('citizen_photos').delete().in('id', ids);
                if (error) throw error;
                res.json({ ok: true, deleted: ids.length });
                return;
            }

            res.status(400).json({ error: 'Unknown action' });
            return;
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        res.status(500).json({ error: String(error?.message || error), details: error });
    }
}

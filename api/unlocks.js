import { hasAdminCookie } from './_auth.js';
import { getSupabaseAdmin } from './_supabase.js';

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
            const id = req.query.id || req.body?.id;
            if (!id) {
                res.status(400).json({ error: 'id is required' });
                return;
            }

            await supabase.from('frontpage_articles').delete().eq('interview_id', id);
            const { error } = await supabase.from('interviews').delete().eq('id', id);
            if (error) throw error;

            res.json({ ok: true, deleted: 1 });
            return;
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        res.status(500).json({ error: String(error?.message || error), details: error });
    }
}

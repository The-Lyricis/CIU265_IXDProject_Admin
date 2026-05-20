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
        if (req.method !== 'PATCH') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const { id, default_headline, default_subtitle, default_body, portrait_url } = req.body || {};
        if (!id) {
            res.status(400).json({ error: 'id is required' });
            return;
        }

        const patch = {
            default_headline: default_headline ? String(default_headline).trim() : null,
            default_subtitle: default_subtitle ? String(default_subtitle).trim() : null,
            default_body: default_body ? String(default_body).trim() : null,
            portrait_url: portrait_url ? String(portrait_url).trim() : null,
        };

        const { data, error } = await supabase
            .from('npc_profiles')
            .update(patch)
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;
        res.json({ ok: true, npc: data });
    } catch (error) {
        res.status(500).json({ error: String(error?.message || error), details: error });
    }
}

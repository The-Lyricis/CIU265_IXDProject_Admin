import { hasAdminCookie } from './_auth.js';
import { getSupabaseAdmin } from './_supabase.js';

function normalizeArticle(body = {}) {
    return {
        title: String(body.title || '').trim(),
        subtitle: body.subtitle ? String(body.subtitle).trim() : null,
        body: body.body ? String(body.body).trim() : null,
        image_url: body.image_url ? String(body.image_url).trim() : null,
        layout_position: body.layout_position === '' || body.layout_position == null
            ? null
            : Number(body.layout_position),
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
        if (req.method === 'PATCH') {
            const { id, ...body } = req.body || {};
            if (!id) {
                res.status(400).json({ error: 'id is required' });
                return;
            }

            const patch = normalizeArticle(body);
            if (!patch.title) {
                res.status(400).json({ error: 'title is required' });
                return;
            }

            const { data, error } = await supabase
                .from('frontpage_articles')
                .update(patch)
                .eq('id', id)
                .select('*')
                .single();

            if (error) throw error;
            res.json({ ok: true, article: data });
            return;
        }

        if (req.method === 'DELETE') {
            const id = req.query.id || req.body?.id;
            if (!id) {
                res.status(400).json({ error: 'id is required' });
                return;
            }

            const { error } = await supabase.from('frontpage_articles').delete().eq('id', id);
            if (error) throw error;
            res.json({ ok: true, deleted: 1 });
            return;
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        res.status(500).json({ error: String(error?.message || error), details: error });
    }
}

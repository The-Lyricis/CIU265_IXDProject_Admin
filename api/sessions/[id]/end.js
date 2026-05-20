import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
        res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing' });
        return;
    }

    try {
        const { id } = req.query;
        if (!id) {
            res.status(400).json({ error: 'missing id' });
            return;
        }

        const { data, error } = await supabase
            .from('sessions')
            .update({ status: 'ended', ended_at: new Date().toISOString() })
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            res.status(500).json({ error: error.message, details: error });
            return;
        }

        res.json({ ok: true, session: data });
    } catch (error) {
        res.status(500).json({ error: String(error) });
    }
}

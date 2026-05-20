import { hasAdminCookie } from '../_auth.js';

export default async function handler(req, res) {
    if (hasAdminCookie(req)) {
        res.json({ authenticated: true });
        return;
    }
    res.json({ authenticated: false });
}

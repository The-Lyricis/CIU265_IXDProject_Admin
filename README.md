# CIU265 IXD Project Admin

Minimal admin console for the CIU265 project.

Live project:

```text
https://ciu-265-ixd-project-admin.vercel.app/
```

## Features

```text
Current active session
Start a new session
End the current session
Basic counts for photos, articles, and interviews
Recent activity list
Photo browser
Legend unlock feed
NPC-linked unlock details
Top-voted photo spotlight
Session-aware photo activity
Admin login with remember me
Single photo delete
Clear current session photos
Delete all photos
Frontpage article edit/delete
Unlock remove with linked article cleanup
NPC default headline/subtitle/body edit
Separated oversight and material desk views
```

## Data sources

```text
sessions
citizen_photos
frontpage_articles
interviews
npc_profiles
```

## Supabase

Set these environment variables in Vercel:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_PASSWORD
```

This admin console uses the public key for reads and Vercel API routes for writes.
`SUPABASE_SERVICE_ROLE_KEY` stays server-side only.
`ADMIN_PASSWORD` is the shared password for the login page.

## API routes

```text
/api/auth/login
/api/auth/logout
/api/auth/me
/api/sessions
/api/sessions/:id/end
/api/dashboard
/api/photos
/api/articles
/api/unlocks
/api/npcs
```

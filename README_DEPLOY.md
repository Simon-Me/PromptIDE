# Deploying Prompt IDE (Web)

This app is a Vite + React SPA that can be deployed as static site. Supabase remains the backend (Auth/DB/Storage).

## One‑time setup (Vercel)

1. Install Vercel CLI

```bash
npm i -g vercel
```

2. Login

```bash
vercel login
```

3. From the repo root, link the project and set the subdirectory

```bash
cd /Users/simonmeyer/Documents/CursorAI/PromptIDE
vercel link --cwd ./prompt-ide
```

4. First deploy (preview)

```bash
cd prompt-ide
vercel --prod
```

Vercel will run `npm run build` and host `dist/`. It returns a public URL you can share.

## Notes
- CORS: In Supabase Auth settings add your Vercel domain to Allowed Origins.
- SPA routing: `vercel.json` is configured to rewrite all routes to `index.html`.
- Environment: The current `src/lib/supabase.ts` uses a fixed URL + anon key. 
export default function SetupPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Almost there</h1>
      <p className="mt-2 text-slate-600">
        Supabase isn&apos;t configured yet. Add these to <code className="rounded bg-slate-200 px-1">.env.local</code> (or
        your Vercel project settings) and restart:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-900 p-4 text-sm text-slate-100">
        {`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...`}
      </pre>
      <p className="mt-4 text-sm text-slate-500">See README.md for the full setup.</p>
    </div>
  );
}

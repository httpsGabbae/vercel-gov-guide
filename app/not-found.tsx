import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs max-w-md w-full">
        <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600">
          404 · Page Not Found
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Hindi Nahanap ang Pahina
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Ang hinahanap mong serbisyo o pahina ay wala o nailipat na. Mangyaring bumalik sa KaagapAI Chat o Services Directory.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition"
          >
            Bumalik sa Citizen Chat
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Tingnan ang Lahat ng Serbisyo
          </Link>
        </div>
      </div>
    </div>
  );
}

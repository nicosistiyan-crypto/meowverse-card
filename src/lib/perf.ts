import "server-only";

// Pencatat waktu untuk mengukur sebelum / sesudah optimasi. MATI secara default (tidak ada overhead);
// nyalakan dengan PERF_LOG=1 di .env.local atau di Environment Variables Vercel, lalu lihat log server: "[perf] label 123ms".
const ON = process.env.PERF_LOG === "1";

export async function timed<T>(label: string, fn: () => PromiseLike<T>): Promise<T> {
  if (!ON) return fn();
  const t = performance.now();
  try { return await fn(); }
  finally { console.log(`[perf] ${label} ${Math.round(performance.now() - t)}ms`); }
}

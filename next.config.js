/** @type {import('next').NextConfig} */
module.exports = {
  // Strict Mode mounts every component twice in dev (extra fetches, extra canvas work). Off = snappier dev.
  reactStrictMode: false,
  poweredByHeader: false,
  // Keep compiled pages in memory for an hour so going back to a page does not recompile it.
  onDemandEntries: { maxInactiveAge: 60 * 60 * 1000, pagesBufferLength: 20 },
  // Menus switch without a page reload (so the music never stops); do not keep a cached copy of dynamic pages, data stays as fresh as before.
  experimental: { staleTimes: { dynamic: 0 } },
};

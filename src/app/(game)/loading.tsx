// Tampil seketika saat pindah menu, selama server menyiapkan halaman tujuan (header, menu bawah, dan musik tetap di tempat).
// Hanya memakai gaya yang sudah ada (judul, bar, warna tema) + satu bar berjalan kecil; tidak mengubah desain halaman.
export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <h2>MEMUAT...</h2>
      <div className="bar ldg"><i /></div>
    </div>
  );
}

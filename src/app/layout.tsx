import "./globals.css";
import FontLoader from "@/components/FontLoader";
export const metadata = { title: "Meowverse Card" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}<FontLoader /></body>
    </html>
  );
}

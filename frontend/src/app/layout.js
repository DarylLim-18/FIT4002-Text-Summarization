'use client'

import "./globals.css";
import Header from "../../components/Header";
import Enhanced_Header from "../../components/Enhanced_Header";
import { usePathname } from "next/navigation";

// export const metadata = {
//   title: "Document Manager",
//   description: "An application to upload text-readable files",
// };

export default function RootLayout({ children }) {
  const path = usePathname();
  return (
    <html lang="en">
      <body className="text-slate-100">
        <Header/>
        <div
          aria-hidden
          className="fixed inset-0 -z-10"
          style={{
            backgroundColor: '#0f172a',
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(58,123,213,.15) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, rgba(0,210,255,.15) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(131,58,180,.10) 0%, transparent 50%)
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}

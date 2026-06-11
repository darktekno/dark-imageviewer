import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DARKVIEW - Image Viewer",
  description: "Next-gen image viewer with RGB gaming aesthetic",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-dark text-white antialiased min-h-screen bg-hex scanline">
        {children}
      </body>
    </html>
  );
}

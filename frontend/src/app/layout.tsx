import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/shared/lib/convex-provider";
import { AuthProvider } from "@/shared/context/AuthContext";
import { ThemeProvider } from "@/shared/context/ThemeContext";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Project SaaS Manager",
  description: "Manage your projects and tasks efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <ConvexClientProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ConvexClientProvider>
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}

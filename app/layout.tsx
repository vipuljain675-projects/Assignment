import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { UserSyncProvider } from "@/components/UserSyncProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TarsChat - Real-time Messaging",
  description: "Full-stack real-time chat application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <ConvexClientProvider>
            <UserSyncProvider>{children}</UserSyncProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
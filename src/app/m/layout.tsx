"use client";

import { BlockProvider } from "@/contexts/BlockContext";

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BlockProvider>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </BlockProvider>
  );
}

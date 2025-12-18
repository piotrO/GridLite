"use client";

import { Suspense } from "react";
import ScanPage from "./_components/ScanPage";

function ScanPageLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

export default function Scan() {
  return (
    <Suspense fallback={<ScanPageLoading />}>
      <ScanPage />
    </Suspense>
  );
}

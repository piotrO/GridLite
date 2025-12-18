"use client";

import { Suspense } from "react";
import ExportPage from "./_components/ExportPage";

function ExportPageLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

export default function Export() {
  return (
    <Suspense fallback={<ExportPageLoading />}>
      <ExportPage />
    </Suspense>
  );
}

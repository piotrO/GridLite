"use client";

import { Suspense } from "react";
import StudioPage from "./_components/StudioPage";

export default function Studio() {
  return (
    <Suspense>
      <StudioPage />
    </Suspense>
  );
}

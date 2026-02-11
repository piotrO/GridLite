"use client";

import { Suspense } from "react";
import StrategyPage from "./_components/StrategyPage";

export default function Strategy() {
  // Rendering StrategyPage component with new WorkflowProgress
  return (
    <Suspense>
      <StrategyPage />
    </Suspense>
  );
}

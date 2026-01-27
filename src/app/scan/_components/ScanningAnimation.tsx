"use client";

import { ScanProgress, ScanStep } from "./ScanProgress";

interface ScanningAnimationProps {
  steps: ScanStep[];
  url?: string;
}

export function ScanningAnimation({ steps, url }: ScanningAnimationProps) {
  return <ScanProgress steps={steps} url={url} />;
}

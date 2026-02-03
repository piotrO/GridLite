import { Typography } from "@/lib/shared/types";

export interface AdSize {
  id: string;
  label: string;
  width: number;
  height: number;
}

export interface AdCanvasData {
  headline?: string;
  bodyCopy?: string;
  ctaText?: string;
  imageUrl?: string;
  colors?: string[];
  logoUrl?: string;
  layerModifications?: Array<{
    layerName: string;
    positionDelta?: { x?: number; y?: number };
    scaleFactor?: number;
    sizes?: string[]; // Specific sizes to apply to (e.g., ["300x600"] or ["all"])
  }>;
  typography?: Typography | null;
}

export interface AdPreviewCanvasProps {
  selectedTemplate: string;
  adName?: string;
  data?: Partial<AdCanvasData>;
}

export interface AdPreviewItemProps {
  size: AdSize;
  templatePath: string;
  data: Partial<AdCanvasData>;
  reloadKey: number;
  onIframeRef: (sizeId: string, el: HTMLIFrameElement | null) => void;
}

/** Timeline layer with extracted animation data */
export interface TimelineLayer {
  name: string;
  guid: string;
  delay: number;
  duration: number;
  endTime: number;
  animationType: "from" | "to";
  trigger: string;
  properties: {
    x?: number;
    y?: number;
    scale?: number;
    opacity?: number;
    rotation?: number;
  };
}

/** Raw manifest layer structure (subset of full manifest) */
export interface ManifestLayer {
  name: string;
  guid: string;
  shots: Array<{
    timelines: Array<{
      id: string;
      trigger: string;
      steps: Array<{
        settings: {
          animationType: "from" | "to";
          duration: string;
          delay: string;
          x?: number;
          y?: number;
          scale?: number;
          opacity?: number;
          rotation?: number;
        };
      }>;
    }>;
  }>;
}

export interface ManifestAnimationGroup {
  id: string;
  name: string;
  delay: number | string;
  duration: string;
}

export interface ManifestShot {
  index: number;
  duration: number;
}

export type TimelineViewMode = "simple" | "detailed";

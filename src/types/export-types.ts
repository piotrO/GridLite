/**
 * Export feature types
 */

import { DynamicValueData } from "@/lib/manifest-utils";

export interface LayerModification {
  layerName: string;
  positionDelta?: { x?: number; y?: number };
  scaleFactor?: number;
  sizes?: string[];
}

/**
 * Request body for the export API
 */
export interface ExportRequest {
  templatePath: string;
  sizes: string[];
  dynamicValues: DynamicValueData;
  layerModifications?: LayerModification[];
}

/**
 * Session data for export flow, stored in context
 */
export interface ExportSession {
  templatePath: string;
  selectedSizes: string[];
  dynamicValues: DynamicValueData;
  layerModifications: LayerModification[];
  exportedAt?: Date;
}

/**
 * Available ad sizes for export
 */
export interface AdSize {
  id: string;
  name: string;
  dimensions: string;
  available: boolean;
}

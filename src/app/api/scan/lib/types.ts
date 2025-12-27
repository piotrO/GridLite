export interface TargetAudience {
  name: string;
  description: string;
}

export interface ScanResult {
  logo: string;
  colors: string[];
  businessName?: string;
  shortName?: string;
  tagline: string;
  voice: string[];
  tone: string;
  industry?: string;
  brandSummary?: string;
  targetAudiences?: TargetAudience[];
  rawWebsiteText?: string; // For Strategy phase passthrough
}

export interface AIAnalysisResult {
  colors: string[];
  businessName?: string;
  shortName?: string;
  tagline: string;
  voice: string[];
  tone: string;
  industry?: string;
  brandSummary?: string;
  targetAudiences?: TargetAudience[];
}

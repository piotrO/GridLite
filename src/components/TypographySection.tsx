import { Type } from "lucide-react";
import { Typography, FontDetail } from "@/lib/shared/types";
import { useEffect, useState } from "react";

interface TypographySectionProps {
  typography?: Typography | null;
  font: string; // Keep for backward compat/fallback
  onFontClick: () => void;
}

function FontDisplay({
  label,
  fontDetail,
  fallbackFont,
}: {
  label: string;
  fontDetail?: FontDetail;
  fallbackFont?: string;
}) {
  const fontFamily = fontDetail?.fontFamily || fallbackFont || "System UI";
  const customFontName = `CustomBrandFont-${label}-${fontFamily.replace(/\s+/g, "")}`;
  const displayFont =
    (fontDetail?.fontUrl || fontDetail?.fontFileBase64) &&
    fontDetail?.fontFormat
      ? `'${customFontName}', ${fontFamily}, sans-serif`
      : fontFamily;

  useEffect(() => {
    // Prefer URL if available, fallback to base64
    const hasSource = fontDetail?.fontUrl || fontDetail?.fontFileBase64;

    if (hasSource && fontDetail?.fontFormat) {
      const styleId = `font-style-${customFontName}`;
      if (!document.getElementById(styleId)) {
        const formatMap: Record<string, string> = {
          ttf: "truetype",
          otf: "opentype",
          woff: "woff",
          woff2: "woff2",
        };

        const cssFormat =
          formatMap[fontDetail.fontFormat] || fontDetail.fontFormat;

        // Construct src rule based on available source
        let srcRule = "";
        if (fontDetail.fontUrl) {
          srcRule = `url('${fontDetail.fontUrl}') format('${cssFormat}')`;
        } else if (fontDetail.fontFileBase64) {
          const mimeType = `font/${fontDetail.fontFormat === "ttf" ? "ttf" : fontDetail.fontFormat === "otf" ? "otf" : fontDetail.fontFormat}`;
          srcRule = `url(data:${mimeType};base64,${fontDetail.fontFileBase64}) format('${cssFormat}')`;
        }

        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          @font-face {
            font-family: '${customFontName}';
            src: ${srcRule};
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, [fontDetail, customFontName]);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </span>
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span
            className="text-xl text-foreground"
            style={{ fontFamily: displayFont }}
          >
            {fontFamily}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {fontDetail?.isSystemFont === false
                ? "Custom Brand Font"
                : "System Font"}
            </span>
            {fontDetail?.fontFormat && !fontDetail.isSystemFont && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground uppercase">
                {fontDetail.fontFormat}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TypographySection({
  typography,
  font,
  onFontClick,
}: TypographySectionProps) {
  // Inject CSS link if available
  useEffect(() => {
    if (typography?.fontCssUrl) {
      const linkId = `font-css-${typography.fontCssUrl}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = typography.fontCssUrl;
        document.head.appendChild(link);
      }
    }
  }, [typography?.fontCssUrl]);

  return (
    <div
      className="flex flex-col gap-3 p-3 -m-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
      onClick={onFontClick}
    >
      <div className="flex items-center gap-2 mb-1">
        <Type className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Typography
        </span>
      </div>

      {typography?.headerFont ? (
        <div className="flex flex-col gap-4">
          <FontDisplay label="Header Font" fontDetail={typography.headerFont} />
          <div className="h-px bg-border/50 w-full" />
          <FontDisplay label="Body Font" fontDetail={typography.bodyFont} />
        </div>
      ) : (
        <FontDisplay label="Primary Font" fallbackFont={font} />
      )}

      <div className="flex justify-end mt-1">
        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          Edit
        </span>
      </div>
    </div>
  );
}

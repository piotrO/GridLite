import { Type, Info } from "lucide-react";
import { Typography } from "@/lib/shared/types";
import { useEffect, useState } from "react";

interface TypographySectionProps {
  typography?: Typography | null;
  font: string; // Keep for backward compat/fallback
  onFontClick: () => void;
}

export function TypographySection({
  typography,
  font,
  onFontClick,
}: TypographySectionProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const fontFamily = typography?.primaryFontFamily || font;
  const customFontName = `CustomBrandFont-${fontFamily.replace(/\s+/g, "")}`;

  useEffect(() => {
    if (typography?.fontFileBase64 && typography.fontFormat) {
      const styleId = `font-style-${customFontName}`;
      if (!document.getElementById(styleId)) {
        // Map common extensions to standard @font-face format strings
        const formatMap: Record<string, string> = {
          ttf: "truetype",
          otf: "opentype",
          woff: "woff",
          woff2: "woff2",
        };

        const cssFormat =
          formatMap[typography.fontFormat] || typography.fontFormat;
        const mimeType = `font/${typography.fontFormat === "ttf" ? "ttf" : typography.fontFormat === "otf" ? "otf" : typography.fontFormat}`;

        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          @font-face {
            font-family: '${customFontName}';
            src: url(data:${mimeType};base64,${typography.fontFileBase64}) format('${cssFormat}');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
        `;
        document.head.appendChild(style);
      }
      setIsLoaded(true);
    }
  }, [typography, customFontName]);

  const displayFont =
    typography?.fontFileBase64 && typography?.fontFormat
      ? `'${customFontName}', ${fontFamily}, sans-serif`
      : fontFamily;

  return (
    <div
      className="flex flex-col gap-2 p-3 -m-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
      onClick={onFontClick}
    >
      <div className="flex items-center gap-2 mb-1">
        <Type className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Typography
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span
            className="text-2xl text-foreground transition-colors group-hover:text-primary"
            style={{ fontFamily: displayFont }}
          >
            {fontFamily}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {typography?.isSystemFont ? "System Font" : "Custom Brand Font"}
            </span>
            {typography?.fontFormat && !typography.isSystemFont && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground uppercase">
                {typography.fontFormat}
              </span>
            )}
          </div>
        </div>

        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mb-1">
          Edit
        </span>
      </div>
    </div>
  );
}

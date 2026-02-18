import { useState, useCallback } from "react";
import { Globe, Languages, Eye, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/CampaignContext";
import { useBrand } from "@/contexts/BrandContext";
import { useProducts } from "@/contexts/ProductContext";
import { useWorkflowStream } from "@/hooks/useWorkflowStream";
import { WorkflowProgress } from "@/components/WorkflowProgress";
import { CollapsiblePanel } from "./CollapsiblePanel";
import { LanguagePicker } from "./LanguagePicker";
import {
  SUPPORTED_LANGUAGES,
  LocalizedCopy,
  LocalizedProductCopy,
} from "@/types/localization";

interface LocalizationPanelProps {
  content: { headline: string; bodyCopy: string; ctaText: string };
  isDPA: boolean;
  selectedProductIds: string[];
}

export function LocalizationPanel({
  content,
  isDPA,
  selectedProductIds,
}: LocalizationPanelProps) {
  const {
    localization,
    setSelectedLanguages,
    setTranslation,
    setPreviewLanguage,
    setLocalizationTranslating,
  } = useCampaign();
  const { activeBrandKit } = useBrand();
  const { products } = useProducts();
  const [showPicker, setShowPicker] = useState(false);

  const displayProducts = isDPA
    ? products.filter((p) => selectedProductIds.includes(p.id))
    : [];

  const {
    start: startLocalization,
    steps,
    isLoading,
  } = useWorkflowStream("/api/localize", {
    onComplete: (data: { translations: Record<string, any> }) => {
      Object.entries(data.translations).forEach(([code, result]) => {
        if (result.error) {
          setTranslation(code, {
            languageCode: code,
            status: "error",
          });
        } else if (isDPA && result.products) {
          setTranslation(code, {
            languageCode: code,
            copy: result.copy || result,
            productCopies: result.products,
            status: "done",
          });
        } else {
          setTranslation(code, {
            languageCode: code,
            copy: result,
            status: "done",
          });
        }
      });
      setLocalizationTranslating(false);
    },
    onError: () => {
      setLocalizationTranslating(false);
    },
  });

  const handleTranslate = useCallback(() => {
    const targetLangs = localization.selectedLanguages.filter(
      (l) => l !== "en",
    );
    if (targetLangs.length === 0) return;

    targetLangs.forEach((code) => {
      setTranslation(code, { languageCode: code, status: "pending" });
    });

    setLocalizationTranslating(true);

    const payload: any = {
      copy: content,
      targetLanguages: localization.selectedLanguages,
      brandProfile: {
        name: activeBrandKit?.name || "Brand",
        industry: activeBrandKit?.industry,
        tone: activeBrandKit?.tone,
        personality: activeBrandKit?.personality,
      },
    };

    if (isDPA && displayProducts.length > 0) {
      payload.products = displayProducts.map((p) => ({
        productId: p.id,
        title: p.title,
        vendor: p.vendor || "",
        ctaText: "SHOP NOW",
      }));
    }

    startLocalization(payload);
  }, [
    localization.selectedLanguages,
    content,
    activeBrandKit,
    isDPA,
    displayProducts,
    startLocalization,
    setTranslation,
    setLocalizationTranslating,
  ]);

  const handleApplyLanguages = (codes: string[]) => {
    setSelectedLanguages(codes);
    setShowPicker(false);
  };

  const handleCopyEdit = (
    langCode: string,
    field: keyof LocalizedCopy,
    value: string,
  ) => {
    const existing = localization.translations[langCode];
    if (!existing) return;
    setTranslation(langCode, {
      ...existing,
      copy: {
        headline: existing.copy?.headline || "",
        bodyCopy: existing.copy?.bodyCopy || "",
        ctaText: existing.copy?.ctaText || "",
        [field]: value,
      },
    });
  };

  const handleProductCopyEdit = (
    langCode: string,
    productId: string,
    field: keyof LocalizedProductCopy,
    value: string,
  ) => {
    const existing = localization.translations[langCode];
    if (!existing?.productCopies) return;
    setTranslation(langCode, {
      ...existing,
      productCopies: existing.productCopies.map((pc) =>
        pc.productId === productId ? { ...pc, [field]: value } : pc,
      ),
    });
  };

  const nonEnglishLangs = localization.selectedLanguages.filter(
    (l) => l !== "en",
  );
  const hasTranslations = Object.keys(localization.translations).some(
    (k) => k !== "en" && localization.translations[k]?.status === "done",
  );

  if (isLoading) {
    return (
      <div className="p-4">
        <WorkflowProgress
          steps={steps}
          title="Localizing Copy"
          subtitle="Marco is adapting your copy for each market"
          colorVar="strategist"
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <CollapsiblePanel title="Languages" icon={Globe} defaultOpen>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {localization.selectedLanguages.map((code) => {
              const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
              if (!lang) return null;
              const isPreview = localization.previewLanguage === code;
              return (
                <span
                  key={code}
                  className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                    isPreview
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {lang.flag} {lang.name}
                </span>
              );
            })}
          </div>

          {showPicker ? (
            <LanguagePicker
              selected={localization.selectedLanguages}
              onApply={handleApplyLanguages}
              onCancel={() => setShowPicker(false)}
            />
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPicker(true)}
                className="flex-1 gap-1.5"
              >
                <Languages className="w-3.5 h-3.5" />
                Manage Languages
              </Button>
              {nonEnglishLangs.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleTranslate}
                  disabled={isLoading}
                  className="flex-1 gap-1.5"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Globe className="w-3.5 h-3.5" />
                  )}
                  Translate
                </Button>
              )}
            </div>
          )}
        </div>
      </CollapsiblePanel>

      {/* Translated copy per language */}
      {hasTranslations &&
        nonEnglishLangs.map((code) => {
          const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
          const translation = localization.translations[code];
          if (!lang || !translation || translation.status !== "done")
            return null;

          const isPreview = localization.previewLanguage === code;

          return (
            <CollapsiblePanel
              key={code}
              title={`${lang.flag} ${lang.name}`}
              icon={Globe}
              defaultOpen={false}
            >
              <div className="space-y-3">
                {/* Campaign-level copy */}
                {translation.copy && (
                  <div className="space-y-2">
                    <EditableField
                      label="Headline"
                      value={translation.copy.headline}
                      onChange={(v) => handleCopyEdit(code, "headline", v)}
                    />
                    <EditableField
                      label="Body Copy"
                      value={translation.copy.bodyCopy}
                      onChange={(v) => handleCopyEdit(code, "bodyCopy", v)}
                    />
                    <EditableField
                      label="CTA"
                      value={translation.copy.ctaText}
                      onChange={(v) => handleCopyEdit(code, "ctaText", v)}
                    />
                  </div>
                )}

                {/* Product-level copy for DPA */}
                {isDPA && translation.productCopies && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground font-medium">
                      Products
                    </span>
                    {translation.productCopies.map((pc) => (
                      <div
                        key={pc.productId}
                        className="bg-muted/50 rounded-lg p-2 space-y-1"
                      >
                        <EditableField
                          label="Title"
                          value={pc.title}
                          onChange={(v) =>
                            handleProductCopyEdit(
                              code,
                              pc.productId,
                              "title",
                              v,
                            )
                          }
                        />
                        <EditableField
                          label="CTA"
                          value={pc.ctaText}
                          onChange={(v) =>
                            handleProductCopyEdit(
                              code,
                              pc.productId,
                              "ctaText",
                              v,
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  size="sm"
                  variant={isPreview ? "default" : "outline"}
                  onClick={() => setPreviewLanguage(isPreview ? null : code)}
                  className="w-full gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {isPreview ? "Previewing" : "Preview"}
                </Button>
              </div>
            </CollapsiblePanel>
          );
        })}

      {/* Default language (English) card */}
      {localization.previewLanguage && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPreviewLanguage(null)}
          className="w-full text-xs text-muted-foreground"
        >
          🇬🇧 Back to English (default)
        </Button>
      )}
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleBlur = () => {
    setEditing(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  if (editing) {
    return (
      <div className="space-y-0.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && handleBlur()}
          autoFocus
          className="w-full text-sm bg-background border border-primary/30 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <button
        onClick={() => {
          setLocalValue(value);
          setEditing(true);
        }}
        className="w-full text-left text-sm text-foreground bg-muted/30 hover:bg-muted rounded px-2 py-1 flex items-center gap-1 group transition-colors"
      >
        <span className="flex-1 truncate">{value}</span>
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </button>
    </div>
  );
}

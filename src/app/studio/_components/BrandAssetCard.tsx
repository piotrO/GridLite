import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  Image,
  Type,
  Globe,
  Upload,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { ColorPicker } from "@/components/ColorPicker";
import { EditableText } from "@/components/EditableText";
import { FontPickerModal } from "@/components/FontPickerModal";
import { BrandPalette } from "@/lib/shared/types";

interface BrandData {
  name: string;
  palette: BrandPalette;
  logo?: string;
  tagline?: string;
  font?: string;
}

interface BrandAssetCardProps {
  brand: BrandData;
  editable?: boolean;
  onBrandChange?: (brand: BrandData) => void;
}

export function BrandAssetCard({
  brand,
  editable = false,
  onBrandChange,
}: BrandAssetCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [localBrand, setLocalBrand] = useState(brand);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePrimaryChange = (color: string) => {
    const updated = {
      ...localBrand,
      palette: { ...localBrand.palette, primary: color },
    };
    setLocalBrand(updated);
    onBrandChange?.(updated);
  };

  const handleSecondaryChange = (color: string) => {
    const updated = {
      ...localBrand,
      palette: { ...localBrand.palette, secondary: color },
    };
    setLocalBrand(updated);
    onBrandChange?.(updated);
  };

  const handleAccentChange = (color: string) => {
    const updated = {
      ...localBrand,
      palette: { ...localBrand.palette, accent: color },
    };
    setLocalBrand(updated);
    onBrandChange?.(updated);
  };

  const handleExtraColorChange = (index: number, color: string) => {
    const extraColors = [...(localBrand.palette.extraColors || [])];
    extraColors[index] = color;
    const updated = {
      ...localBrand,
      palette: { ...localBrand.palette, extraColors },
    };
    setLocalBrand(updated);
    onBrandChange?.(updated);
  };

  const handleLogoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Mock: just create a placeholder URL
      const updated = { ...localBrand, logo: URL.createObjectURL(file) };
      setLocalBrand(updated);
      onBrandChange?.(updated);
    }
  };

  const handleNameChange = (name: string) => {
    const updated = { ...localBrand, name };
    setLocalBrand(updated);
    onBrandChange?.(updated);
  };

  const handleTaglineChange = (tagline: string) => {
    const updated = { ...localBrand, tagline };
    setLocalBrand(updated);
    onBrandChange?.(updated);
  };

  const handleFontChange = (font: string) => {
    const updated = { ...localBrand, font };
    setLocalBrand(updated);
    onBrandChange?.(updated);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl bg-card border-2 border-border shadow-md overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">{localBrand.name}</h3>
            <p className="text-xs text-muted-foreground">Brand Assets</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4">
              {/* Editable Name & Tagline */}
              {editable && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Business Name
                    </label>
                    <EditableText
                      value={localBrand.name}
                      onChange={handleNameChange}
                      className="text-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Tagline
                    </label>
                    <EditableText
                      value={localBrand.tagline || ""}
                      onChange={handleTaglineChange}
                      placeholder="Your brand tagline..."
                      className="text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Color Palette */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Palette className="w-4 h-4" />
                  <span>Color Palette</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground text-center">
                      Primary
                    </p>
                    <ColorPicker
                      color={localBrand.palette.primary}
                      onChange={handlePrimaryChange}
                      disabled={!editable}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground text-center">
                      Secondary
                    </p>
                    <ColorPicker
                      color={localBrand.palette.secondary}
                      onChange={handleSecondaryChange}
                      disabled={!editable}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground text-center">
                      Accent
                    </p>
                    <ColorPicker
                      color={localBrand.palette.accent}
                      onChange={handleAccentChange}
                      disabled={!editable}
                    />
                  </div>
                </div>

                {localBrand.palette.extraColors &&
                  localBrand.palette.extraColors.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Extra Colors
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {localBrand.palette.extraColors.map((color, index) => (
                          <ColorPicker
                            key={index}
                            color={color}
                            onChange={(newColor) =>
                              handleExtraColorChange(index, newColor)
                            }
                            disabled={!editable}
                          />
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* Typography */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Type className="w-4 h-4" />
                  <span>Typography</span>
                </div>
                <button
                  onClick={() => setShowFontPicker(true)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 hover:bg-muted transition-all group"
                >
                  <span
                    className="text-sm font-medium text-foreground"
                    style={{ fontFamily: localBrand.font || "Inter" }}
                  >
                    {localBrand.font || "Inter (Detected)"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              </div>

              {/* Font Picker Modal */}
              <FontPickerModal
                open={showFontPicker}
                onOpenChange={setShowFontPicker}
                currentFont={localBrand.font || "Inter"}
                onFontChange={handleFontChange}
                brandFonts={[]}
              />

              {/* Logo */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Image className="w-4 h-4" />
                  <span>Logo</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {editable ? (
                  <button
                    onClick={handleLogoUpload}
                    className="w-full h-16 rounded-lg bg-muted border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    {localBrand.logo ? (
                      <img
                        src={localBrand.logo}
                        alt="Logo"
                        className="h-12 w-auto object-contain"
                      />
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Upload Logo</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="h-12 rounded-lg bg-muted flex items-center justify-center">
                    {localBrand.logo ? (
                      <img
                        src={localBrand.logo}
                        alt="Logo"
                        className="h-10 w-auto object-contain"
                      />
                    ) : (
                      <span className="text-xl font-bold gradient-text">
                        {localBrand.name.charAt(0)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

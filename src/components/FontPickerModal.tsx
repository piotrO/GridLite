import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Check,
  Upload,
  ExternalLink,
  Type,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FontPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFont: string;
  onFontChange: (font: string) => void;
  brandFonts?: string[];
}

const googleFonts = [
  { name: "Inter", category: "Sans-serif", popular: true },
  { name: "Roboto", category: "Sans-serif", popular: true },
  { name: "Open Sans", category: "Sans-serif", popular: true },
  { name: "Poppins", category: "Sans-serif", popular: true },
  { name: "Montserrat", category: "Sans-serif", popular: true },
  { name: "Lato", category: "Sans-serif", popular: true },
  { name: "Playfair Display", category: "Serif", popular: true },
  { name: "Merriweather", category: "Serif", popular: false },
  { name: "Oswald", category: "Sans-serif", popular: false },
  { name: "Raleway", category: "Sans-serif", popular: false },
  { name: "Ubuntu", category: "Sans-serif", popular: false },
  { name: "Nunito", category: "Sans-serif", popular: false },
  { name: "Work Sans", category: "Sans-serif", popular: false },
  { name: "Quicksand", category: "Sans-serif", popular: false },
  { name: "Source Sans Pro", category: "Sans-serif", popular: false },
  { name: "DM Sans", category: "Sans-serif", popular: true },
  { name: "Space Grotesk", category: "Sans-serif", popular: true },
  { name: "Plus Jakarta Sans", category: "Sans-serif", popular: true },
  { name: "Outfit", category: "Sans-serif", popular: false },
  { name: "Sora", category: "Sans-serif", popular: false },
  { name: "Libre Baskerville", category: "Serif", popular: false },
  { name: "Lora", category: "Serif", popular: false },
  { name: "Crimson Pro", category: "Serif", popular: false },
  { name: "Space Mono", category: "Monospace", popular: false },
  { name: "JetBrains Mono", category: "Monospace", popular: false },
  { name: "Fira Code", category: "Monospace", popular: false },
];

export function FontPickerModal({
  open,
  onOpenChange,
  currentFont,
  onFontChange,
  brandFonts = [],
}: FontPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFont, setSelectedFont] = useState(currentFont);
  const [customFontUrl, setCustomFontUrl] = useState("");

  const filteredFonts = googleFonts.filter(
    (font) =>
      font.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      font.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const popularFonts = filteredFonts.filter((f) => f.popular);
  const allFonts = filteredFonts;

  const handleSelectFont = (fontName: string) => {
    setSelectedFont(fontName);
  };

  const handleConfirm = () => {
    onFontChange(selectedFont);
    onOpenChange(false);
  };

  const handleImportCustom = () => {
    if (customFontUrl.trim()) {
      // Extract font name from URL or use generic name
      const fontName = customFontUrl.includes("family=")
        ? customFontUrl.split("family=")[1].split("&")[0].replace(/\+/g, " ")
        : "Custom Font";
      setSelectedFont(fontName);
      setCustomFontUrl("");
    }
  };

  const FontItem = ({
    font,
    isSelected,
  }: {
    font: { name: string; category: string };
    isSelected: boolean;
  }) => (
    <motion.button
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => handleSelectFont(font.name)}
      className={`w-full p-3 rounded-xl text-left transition-colors ${
        isSelected
          ? "bg-primary/10 border-2 border-primary"
          : "bg-muted/50 border-2 border-transparent hover:border-border hover:bg-muted"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className="font-medium text-foreground text-lg"
            style={{ fontFamily: font.name }}
          >
            {font.name}
          </p>
          <p className="text-xs text-muted-foreground">{font.category}</p>
        </div>
        {isSelected && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>
      <p
        className="text-sm text-muted-foreground mt-2"
        style={{ fontFamily: font.name }}
      >
        The quick brown fox jumps over the lazy dog
      </p>
    </motion.button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type className="w-5 h-5 text-primary" />
            Choose Font
          </DialogTitle>
          <DialogDescription>
            Select a font from Google Fonts, your brand assets, or import a
            custom font
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="google" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="google">Google Fonts</TabsTrigger>
            <TabsTrigger value="brand">Brand Assets</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent
            value="google"
            className="flex-1 flex flex-col min-h-0 space-y-4 mt-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search fonts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea
              className="flex-1 -mx-1 px-1"
              style={{ maxHeight: "300px" }}
            >
              <div className="space-y-4">
                {!searchQuery && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Popular
                    </p>
                    <div className="space-y-2">
                      {popularFonts.map((font) => (
                        <FontItem
                          key={font.name}
                          font={font}
                          isSelected={selectedFont === font.name}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {searchQuery && (
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Results ({allFonts.length})
                    </p>
                  )}
                  {!searchQuery && (
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      All Fonts
                    </p>
                  )}
                  <div className="space-y-2">
                    {(searchQuery
                      ? allFonts
                      : allFonts.filter((f) => !f.popular)
                    ).map((font) => (
                      <FontItem
                        key={font.name}
                        font={font}
                        isSelected={selectedFont === font.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="brand" className="flex-1 space-y-4 mt-4">
            {brandFonts.length > 0 ? (
              <ScrollArea className="flex-1" style={{ maxHeight: "350px" }}>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Your Brand Fonts ({brandFonts.length})
                  </p>
                  {brandFonts.map((fontName) => (
                    <FontItem
                      key={fontName}
                      font={{ name: fontName, category: "Brand Font" }}
                      isSelected={selectedFont === fontName}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Type className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No brand fonts yet
                </h3>
                <p className="text-muted-foreground mb-4 text-sm max-w-xs mx-auto">
                  Import fonts from Google Fonts or upload custom fonts to add
                  them to your brand assets.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="import" className="flex-1 space-y-4 mt-4">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Import from Google Fonts
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Paste a Google Fonts URL to import a custom font
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://fonts.googleapis.com/css2?family=..."
                    value={customFontUrl}
                    onChange={(e) => setCustomFontUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleImportCustom}
                    disabled={!customFontUrl.trim()}
                  >
                    Import
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Font File
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload TTF, OTF, or WOFF font files
                </p>
                <Button variant="outline" className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Selected: </span>
            <span
              className="font-medium text-foreground"
              style={{ fontFamily: selectedFont }}
            >
              {selectedFont}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="hero" onClick={handleConfirm}>
              Apply Font
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

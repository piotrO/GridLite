"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReanalyzeUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
  brandName: string;
}

export function ReanalyzeUrlModal({
  isOpen,
  onClose,
  onSubmit,
  brandName,
}: ReanalyzeUrlModalProps) {
  const [urlInput, setUrlInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onSubmit(urlInput.trim());
      setUrlInput("");
    }
  };

  const handleClose = () => {
    setUrlInput("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-card rounded-2xl border-2 border-border p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-researcher/20 flex items-center justify-center">
                  <Search className="w-6 h-6 text-researcher" />
                </div>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={handleClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <h2 className="text-xl font-semibold text-foreground mb-2">
                Enter Website URL
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                To reanalyze{" "}
                <span className="font-medium text-foreground">{brandName}</span>
                , please enter the brand's website URL.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="yourbrand.com"
                  className="w-full h-12 rounded-xl border-2 border-border bg-background px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-researcher focus:ring-4 focus:ring-researcher/10 transition-all"
                  autoFocus
                  required
                />
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="hero"
                    className="flex-1"
                    disabled={!urlInput.trim()}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Scan
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

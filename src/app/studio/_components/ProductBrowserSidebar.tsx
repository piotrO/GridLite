"use client";

import { motion } from "framer-motion";
import { Search, Filter, ShoppingBag } from "lucide-react";
import { Product } from "@/types/shopify";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface ProductBrowserSidebarProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
}

export function ProductBrowserSidebar({
  products,
  selectedProduct,
  onSelectProduct,
}: ProductBrowserSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="h-full flex flex-col bg-background relative z-10 w-full">
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center gap-2 font-semibold">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <h2>Product Catalog</h2>
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full ml-auto">
            {products.length}
          </span>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => onSelectProduct(product)}
            className={cn(
              "w-full text-left p-2 rounded-lg border transition-all hover:bg-muted/50 flex gap-3 group relative overflow-hidden",
              selectedProduct?.id === product.id
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-transparent hover:border-border",
            )}
          >
            {/* Product Image */}
            <div className="w-12 h-12 rounded bg-muted shrink-0 overflow-hidden border border-border">
              {product.images[0] ? (
                <img
                  src={product.images[0].src}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-tight mb-1">
                {product.title}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{product.vendor}</span>
                <span className="font-medium text-foreground">
                  {product.currency}
                  {product.price}
                </span>
              </div>
            </div>

            {/* Active Indicator */}
            {selectedProduct?.id === product.id && (
              <motion.div
                layoutId="activeProduct"
                className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none"
                initial={false}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

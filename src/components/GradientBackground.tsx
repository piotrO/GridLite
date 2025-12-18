interface GradientBackgroundProps {
  colorVar?: "researcher" | "strategist" | "designer" | "primary" | "accent";
}

export function GradientBackground({
  colorVar = "primary",
}: GradientBackgroundProps) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `linear-gradient(to bottom, hsl(var(--${colorVar}) / 0.1), transparent, hsl(var(--${colorVar}) / 0.03))`,
      }}
    />
  );
}

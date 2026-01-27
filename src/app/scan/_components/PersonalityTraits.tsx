"use client";

interface PersonalityTraitsProps {
  personality?: string[];
}

export function PersonalityTraits({
  personality = [],
}: PersonalityTraitsProps) {
  if (!personality || personality.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Personality Traits
      </h4>
      <div className="flex flex-wrap gap-2">
        {personality.map((trait, i) => (
          <span
            key={i}
            className="px-2.5 py-1 rounded-lg bg-researcher/5 text-researcher text-xs font-medium border border-researcher/20"
          >
            {trait}
          </span>
        ))}
      </div>
    </div>
  );
}

"use client";

interface VoiceToneSectionProps {
  voiceLabel: string;
  voiceInstructions: string;
}

export function VoiceToneSection({
  voiceLabel,
  voiceInstructions,
}: VoiceToneSectionProps) {
  return (
    <div>
      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
        Linguistic Tone: <span className="text-foreground">{voiceLabel}</span>
      </h4>
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
        <p className="text-sm text-foreground leading-relaxed">
          {voiceInstructions}
        </p>
      </div>
    </div>
  );
}

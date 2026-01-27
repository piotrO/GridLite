"use client";

interface ThePlaybookProps {
  dos: string[];
  donts: string[];
}

export function ThePlaybook({ dos, donts }: ThePlaybookProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
        The Playbook
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest pl-1">
            Dos
          </p>
          <ul className="space-y-1.5">
            {dos.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[11px] text-foreground leading-tight"
              >
                <div className="mt-0.5 w-3 h-3 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <div className="w-1 h-1 rounded-full bg-green-500" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest pl-1">
            Dont's
          </p>
          <ul className="space-y-1.5">
            {donts.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[11px] text-foreground leading-tight opacity-80"
              >
                <div className="mt-0.5 w-3 h-3 rounded-full bg-red-400/10 flex items-center justify-center flex-shrink-0">
                  <div className="w-1 h-1 rounded-full bg-red-400" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

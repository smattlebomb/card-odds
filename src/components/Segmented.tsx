interface Option<T> {
  value: T;
  label: string;
}

interface Props<T> {
  label: string;
  hint?: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (v: T) => void;
}

/** A row of big toggle buttons; exactly one is pressed. */
export function Segmented<T extends string | number | boolean>({ label, hint, options, value, onChange }: Props<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <div>
        <h3 className="text-lg font-bold">{label}</h3>
        {hint && <p className="text-sm text-chalk/60">{hint}</p>}
      </div>
      <div className="flex gap-2 rounded-2xl bg-felt-950/50 p-1.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
            className={`min-h-14 flex-1 rounded-xl px-2 text-lg font-bold ${
              o.value === value ? 'bg-gold text-felt-950' : 'text-chalk/80 active:bg-felt-800'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

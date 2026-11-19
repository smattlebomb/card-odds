export const DISCLAIMER =
  'For training and home use. Using a phone or other device at a casino table is illegal in many places.';

export function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <p role="note" className={`text-sm leading-snug text-chalk/70 ${className}`}>
      {DISCLAIMER}
    </p>
  );
}

import { useEffect, useRef, useState } from 'react';

export function parseLocalizedDecimal(value: string): number | null {
  const compact = value.trim().replace(/\s/g, '');
  if (!compact) return null;
  const normalized = compact.includes(',')
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function editableValue(value: number | null): string {
  return value == null || !Number.isFinite(value) ? '' : String(value).replace('.', ',');
}

export function LocalizedDecimalInput({ value, onValueChange, ariaLabel, placeholder = '0', min = 0, className = 'input' }: {
  value: number | null;
  onValueChange: (value: number | null) => void;
  ariaLabel?: string;
  placeholder?: string;
  min?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState(() => editableValue(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(editableValue(value)); }, [value]);
  return <input
    className={className}
    type="text"
    inputMode="decimal"
    aria-label={ariaLabel}
    placeholder={placeholder}
    value={draft}
    onFocus={() => { focused.current = true; }}
    onBlur={() => {
      focused.current = false;
      const parsed = parseLocalizedDecimal(draft);
      setDraft(editableValue(parsed));
      onValueChange(parsed != null && parsed >= min ? parsed : null);
    }}
    onChange={(event) => {
      const next = event.target.value;
      setDraft(next);
      const parsed = parseLocalizedDecimal(next);
      onValueChange(parsed != null && parsed >= min ? parsed : null);
    }}
  />;
}

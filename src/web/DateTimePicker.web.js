// Substituto web do @react-native-community/datetimepicker (modo "date").
// Usa o seletor de data nativo do navegador (<input type="date">).
import React from 'react';

function toIso(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

export default function DateTimePicker({ value, onChange, minimumDate, maximumDate }) {
  return React.createElement('input', {
    type: 'date',
    value: toIso(value),
    min: minimumDate ? toIso(minimumDate) : undefined,
    max: maximumDate ? toIso(maximumDate) : undefined,
    onChange: (e) => {
      if (!e.target.value) return;
      const [y, m, d] = e.target.value.split('-').map(Number);
      const date = new Date(y, m - 1, d, 12, 0, 0);
      onChange && onChange({ type: 'set', nativeEvent: { timestamp: date.getTime() } }, date);
    },
    style: {
      width: '100%',
      boxSizing: 'border-box',
      padding: 12,
      fontSize: 16,
      borderRadius: 10,
      border: '1px solid #374151',
      background: '#111827',
      color: '#F9FAFB',
      colorScheme: 'dark',
    },
  });
}

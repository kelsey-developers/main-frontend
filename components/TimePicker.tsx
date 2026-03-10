'use client';

import React, { useState, useRef, useEffect } from 'react';
import Dropdown from '@/components/Dropdown';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  label?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange }) => {
  const [hour, setHour] = useState<string>('12');
  const [minute, setMinute] = useState<string>('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM');
  const pickerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const hasUserInteracted = useRef(false);
  const isUpdatingFromProp = useRef(false);
  const previousValue = useRef<string>(value || '');
  const hourRef = useRef<string>('12');
  const minuteRef = useRef<string>('00');
  const periodRef = useRef<'AM' | 'PM'>('PM');

  hourRef.current = hour;
  minuteRef.current = minute;
  periodRef.current = period;

  const convertTo24Hour = (h: string, m: string, p: 'AM' | 'PM'): string => {
    let hourNum = parseInt(h, 10);
    const minuteNum = parseInt(m, 10);
    if (p === 'AM') {
      if (hourNum === 12) hourNum = 0;
    } else {
      if (hourNum !== 12) hourNum += 12;
    }
    return `${String(hourNum).padStart(2, '0')}:${String(minuteNum).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (value === previousValue.current && !isInitialMount.current) return;
    const currentStateTime = convertTo24Hour(hourRef.current, minuteRef.current, periodRef.current);
    if (!isInitialMount.current && currentStateTime === value) {
      previousValue.current = value || '';
      return;
    }
    previousValue.current = value || '';
    isUpdatingFromProp.current = true;

    if (value) {
      const [h, m] = value.split(':');
      const hourNum = parseInt(h || '12', 10);
      const minuteNum = parseInt(m || '0', 10);
      if (currentStateTime !== value) {
        let newHour: string;
        let newPeriod: 'AM' | 'PM';
        if (hourNum === 0) {
          newHour = '12';
          newPeriod = 'AM';
        } else if (hourNum < 12) {
          newHour = String(hourNum);
          newPeriod = 'AM';
        } else if (hourNum === 12) {
          newHour = '12';
          newPeriod = 'PM';
        } else {
          newHour = String(hourNum - 12);
          newPeriod = 'PM';
        }
        setHour(newHour);
        setMinute(String(minuteNum).padStart(2, '0'));
        setPeriod(newPeriod);
      }
    } else {
      if (!hasUserInteracted.current) {
        setHour('12');
        setMinute('00');
        setPeriod('PM');
      }
    }
    Promise.resolve().then(() => { isUpdatingFromProp.current = false; });
    isInitialMount.current = false;
  }, [value]);

  useEffect(() => {
    if (isInitialMount.current) return;
    if (isUpdatingFromProp.current) return;
    const currentTime24 = convertTo24Hour(hour, minute, period);
    if (currentTime24 !== value) {
      hasUserInteracted.current = true;
      onChange(currentTime24);
    }
  }, [hour, minute, period]);

  const hourOptions = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
  const minuteOptions = [0, 15, 30, 45].map(m => ({ value: String(m).padStart(2, '0'), label: String(m).padStart(2, '0') }));
  const periodOptions = [{ value: 'AM', label: 'AM' }, { value: 'PM', label: 'PM' }];

  return (
    <div className="relative" ref={pickerRef}>
      <div className="grid grid-cols-3 gap-2">
        <Dropdown
          label={hour || '12'}
          options={hourOptions}
          onSelect={(v) => { hasUserInteracted.current = true; setHour(v); }}
          placeholder="Hour"
          className="w-full"
        />
        <Dropdown label={minute || '00'} options={minuteOptions} onSelect={(v) => { hasUserInteracted.current = true; setMinute(v); }} placeholder="Min" className="w-full" />
        <Dropdown label={period || 'PM'} options={periodOptions} onSelect={(v) => { hasUserInteracted.current = true; setPeriod(v as 'AM' | 'PM'); }} placeholder="AM/PM" className="w-full" />
      </div>
    </div>
  );
};

export default TimePicker;

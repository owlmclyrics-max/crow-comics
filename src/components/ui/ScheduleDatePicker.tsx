import React, { useState } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';

interface ScheduleDatePickerProps {
  value?: string; // ISO datetime string (YYYY-MM-DDTHH:mm)
  onChange: (datetime: string) => void;
  label?: string;
  compact?: boolean;
}

export const ScheduleDatePicker: React.FC<ScheduleDatePickerProps> = ({
  value,
  onChange,
  label,
  compact = false,
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const datePart = value ? value.split('T')[0] : '';
  const timePart = value ? value.split('T')[1]?.slice(0, 5) : '';

  const handleDateChange = (date: string) => {
    const newDateTime = timePart ? `${date}T${timePart}` : `${date}T12:00`;
    onChange(newDateTime);
  };

  const handleTimeChange = (time: string) => {
    const newDateTime = datePart ? `${datePart}T${time}` : new Date().toISOString().split('T')[0] + `T${time}`;
    onChange(newDateTime);
  };

  const clearSchedule = () => {
    onChange('');
  };

  const formatDisplay = () => {
    if (!value) return 'Sin programar';
    const d = new Date(value);
    const dateStr = d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} - ${timeStr}`;
  };

  return (
    <div className="relative">
      {label && (
        <label className="text-xs font-bold text-mute uppercase tracking-wider mb-2 block">
          {label}
        </label>
      )}

      {/* Display */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 p-2.5 rounded-xl bg-bg border border-line">
          <Calendar className="w-4 h-4 text-accent shrink-0" />
          <span className={`text-sm ${value ? 'text-ink' : 'text-faint'} ${compact ? 'text-[11px]' : ''}`}>
            {formatDisplay()}
          </span>
        </div>

        {/* Date picker button */}
        <button
          type="button"
          onClick={() => setIsDatePickerOpen(true)}
          className="p-2.5 rounded-xl bg-raised hover:bg-bg text-mute hover:text-ink transition-colors"
          title="Elegir fecha"
        >
          <Calendar className="w-4 h-4" />
        </button>

        {/* Time picker button */}
        <button
          type="button"
          onClick={() => setIsTimePickerOpen(true)}
          className="p-2.5 rounded-xl bg-raised hover:bg-bg text-mute hover:text-ink transition-colors"
          title="Elegir hora"
        >
          <Clock className="w-4 h-4" />
        </button>

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={clearSchedule}
            className="p-2.5 rounded-xl bg-raised hover:bg-bg text-red-400 hover:text-red-300 transition-colors"
            title="Quitar programación"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Date picker popover */}
      {isDatePickerOpen && (
        <div className="absolute z-50 mt-2 left-0">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsDatePickerOpen(false)}
          />
          <div className="relative">
            <DatePicker
              value={datePart}
              onChange={handleDateChange}
              onClose={() => setIsDatePickerOpen(false)}
              label="Fecha de lanzamiento"
            />
          </div>
        </div>
      )}

      {/* Time picker popover */}
      {isTimePickerOpen && (
        <div className="absolute z-50 mt-2 left-0">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsTimePickerOpen(false)}
          />
          <div className="relative">
            <TimePicker
              value={value}
              onChange={handleTimeChange}
              onClose={() => setIsTimePickerOpen(false)}
              label="Hora de lanzamiento"
            />
          </div>
        </div>
      )}
    </div>
  );
};

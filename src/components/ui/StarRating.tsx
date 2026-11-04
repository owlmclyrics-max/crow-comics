import React, { useState } from 'react';
import { Star } from 'lucide-react';

type StarSize = 'sm' | 'md' | 'lg';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: StarSize;
  showValue?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<StarSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-6 h-6',
};

const STARS = [1, 2, 3, 4, 5];

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  showValue = false,
  className = '',
}) => {
  const [hovered, setHovered] = useState(0);
  const activeValue = hovered || value;
  const isInteractive = !readOnly && Boolean(onChange);

  if (!isInteractive) {
    return (
      <div
        className={`flex items-center gap-0.5 ${className}`}
        aria-label={`${value} de 5 estrellas`}
      >
        {STARS.map((star) => (
          <Star
            key={star}
            className={`${SIZE_CLASSES[size]} ${
              star <= value ? 'text-amber-400 fill-amber-400' : 'text-faint'
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-0.5" role="group" aria-label="Calificación">
        {STARS.map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 active:scale-95"
            aria-label={`${star} de 5 estrellas`}
          >
            <Star
              className={`${SIZE_CLASSES[size]} ${
                star <= activeValue ? 'text-amber-400 fill-amber-400' : 'text-faint'
              }`}
            />
          </button>
        ))}
      </div>
      {showValue && value > 0 && (
        <span className="text-xs text-amber-400 font-bold ml-1">{value}/5</span>
      )}
    </div>
  );
};

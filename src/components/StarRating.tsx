import { Star } from "lucide-react";
import { useState } from "react";

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
}

export function StarRating({ rating, onRate, size = 16, readonly = false }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = hover ? star <= hover : star <= Math.round(rating);
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onRate?.(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer"}`}
          >
            <Star
              size={size}
              className={filled ? "fill-primary text-primary" : "text-muted-foreground/40"}
            />
          </button>
        );
      })}
    </div>
  );
}

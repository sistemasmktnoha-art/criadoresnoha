import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return `${words[0]?.[0] ?? ""}${words.length > 1 ? words[words.length - 1]?.[0] ?? "" : ""}`.toUpperCase();
}

type InfluencerAvatarProps = {
  name: string;
  src?: string;
  className?: string;
  imageClassName?: string;
};

export function InfluencerAvatar({ name, src, className, imageClassName }: InfluencerAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [src]);

  return (
    <Avatar className={className}>
      {!imageFailed && (
        <AvatarImage
          src={src || undefined}
          alt={name}
          className={cn("object-cover", imageClassName)}
          onError={() => setImageFailed(true)}
        />
      )}
      <AvatarFallback className="text-xs font-semibold text-muted-foreground">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
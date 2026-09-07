"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "../_lib/useFavorites";
import { toggleFavorite } from "../_lib/favorites";

export default function FavoriteButton({ productId, className }: { productId: string; className?: string }) {
  const favorites = useFavorites();
  const active = favorites.includes(productId);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(productId);
      }}
      aria-label={active ? "Remove from favorites" : "Save to favorites"}
      aria-pressed={active}
      className={className ?? "flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-black/40 backdrop-blur-md transition-colors hover:bg-black/60"}
    >
      <Heart size={15} fill={active ? "currentColor" : "none"} />
    </button>
  );
}

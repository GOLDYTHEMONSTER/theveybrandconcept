"use client";

import { useEffect, useState } from "react";
import { readFavorites, subscribeToFavorites } from "./favorites";

export function useFavorites(): string[] {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(readFavorites());
    return subscribeToFavorites(() => setIds(readFavorites()));
  }, []);

  return ids;
}

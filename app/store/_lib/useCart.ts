"use client";

import { useEffect, useState } from "react";
import { readCart, subscribeToCart, type CartLine } from "./cart";

export function useCart(): CartLine[] {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    setLines(readCart());
    return subscribeToCart(() => setLines(readCart()));
  }, []);

  return lines;
}

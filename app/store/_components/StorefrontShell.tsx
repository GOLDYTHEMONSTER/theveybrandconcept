"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, LayoutGrid, ShoppingBag, Sparkles } from "lucide-react";
import { useCart } from "../_lib/useCart";
import { cartCount } from "../_lib/cart";
import { useFavorites } from "../_lib/useFavorites";
import Splash from "./Splash";

const DISCOVER_LINKS = [
  { label: "Home", href: "/store" },
  { label: "New", href: "/store/shop?category=New" },
  { label: "Dresses", href: "/store/shop?category=Dresses" },
  { label: "Tops", href: "/store/shop?category=Tops" },
  { label: "Sets", href: "/store/shop?category=Sets" },
  { label: "Gallery", href: "/store/discover" },
];

const TOP_LINKS = [
  { label: "Shop", href: "/store/shop" },
  { label: "Collections", href: "/store/shop" },
  { label: "Journal", href: "/store/shop" },
];

export default function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lines = useCart();
  const count = cartCount(lines);
  const favoriteCount = useFavorites().length;

  return (
    <>
      <Splash />

      {/* Desktop top bar */}
      <header className="sticky top-0 z-30 hidden items-center justify-between border-b border-hairline bg-canvas/80 px-8 py-5 backdrop-blur-xl md:flex">
        <Link href="/store" className="font-serif text-lg italic tracking-wide">THE VEY BRAND</Link>
        <nav className="flex items-center gap-8 text-xs uppercase tracking-[0.2em] text-muted">
          {TOP_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className="transition-colors hover:text-ink">{link.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/store/favorites" className="relative flex h-9 w-9 items-center justify-center rounded-full border border-hairline transition-colors hover:bg-surface-hover" aria-label="Favorites">
            <Heart size={15} />
            {favoriteCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[9px] font-semibold text-canvas">{favoriteCount}</span>}
          </Link>
          <Link href="/store/cart" className="relative flex h-9 w-9 items-center justify-center rounded-full border border-hairline transition-colors hover:bg-surface-hover" aria-label="Cart">
            <ShoppingBag size={16} />
            {count > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[9px] font-semibold text-canvas">{count}</span>}
          </Link>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-hairline bg-canvas/80 px-5 py-4 backdrop-blur-xl md:hidden">
        <Link href="/store" className="font-serif text-base italic tracking-wide">THE VEY BRAND</Link>
        <Link href="/store/favorites" className="relative flex h-8 w-8 items-center justify-center rounded-full border border-hairline" aria-label="Favorites">
          <Heart size={14} />
          {favoriteCount > 0 && <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ink text-[8px] font-semibold text-canvas">{favoriteCount}</span>}
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-56 shrink-0 flex-col gap-8 overflow-y-auto border-r border-hairline px-6 py-8 md:flex">
          <div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted">Discover</p>
            <nav className="flex flex-col gap-1">
              {DISCOVER_LINKS.map((link) => {
                const active = pathname === link.href.split("?")[0] && link.href === "/store"
                  ? pathname === "/store"
                  : false;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`rounded-full px-3 py-2 text-sm transition-colors ${active ? "bg-surface text-ink" : "text-muted hover:text-ink"}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-muted">Saved</p>
            <nav className="flex flex-col gap-1">
              <Link href="/store/favorites" className="flex items-center justify-between rounded-full px-3 py-2 text-sm text-muted transition-colors hover:text-ink">
                Favorites {favoriteCount > 0 && <span className="text-xs text-muted">{favoriteCount}</span>}
              </Link>
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-16">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-hairline bg-canvas/95 py-2.5 backdrop-blur-xl md:hidden">
        <Link href="/store" className="flex flex-col items-center gap-1 px-3 py-1 text-[10px] text-muted"><Home size={18} /> Home</Link>
        <Link href="/store/shop" className="flex flex-col items-center gap-1 px-3 py-1 text-[10px] text-muted"><Sparkles size={18} /> Shop</Link>
        <Link href="/store/discover" aria-label="Gallery" className="flex items-center justify-center rounded-full bg-ink px-5 py-3 text-canvas"><LayoutGrid size={18} /></Link>
        <Link href="/store/favorites" className="relative flex flex-col items-center gap-1 px-3 py-1 text-[10px] text-muted">
          <Heart size={18} />
          {favoriteCount > 0 && <span className="absolute -top-0.5 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ink text-[8px] font-semibold text-canvas">{favoriteCount}</span>}
          Saved
        </Link>
        <Link href="/store/cart" className="relative flex flex-col items-center gap-1 px-3 py-1 text-[10px] text-muted">
          <ShoppingBag size={18} />
          {count > 0 && <span className="absolute -top-0.5 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ink text-[8px] font-semibold text-canvas">{count}</span>}
          Cart
        </Link>
      </nav>
    </>
  );
}

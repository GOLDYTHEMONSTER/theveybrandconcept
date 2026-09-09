"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SHOP_FILTERS } from "../_lib/categories";

const LINKS = [
  { label: "Home", href: "/store", category: null },
  ...SHOP_FILTERS.filter((filter) => filter !== "All").map((filter) => ({
    label: filter,
    href: `/store/shop?category=${encodeURIComponent(filter)}`,
    category: filter,
  })),
  { label: "Gallery", href: "/store/discover", category: null },
];

export default function DiscoverLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => {
        const [linkPath] = link.href.split("?");
        const active = link.category ? pathname === "/store/shop" && activeCategory === link.category : pathname === linkPath;
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
  );
}

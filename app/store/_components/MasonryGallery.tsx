import Link from "next/link";
import { Sparkles } from "lucide-react";
import { formatPrice } from "../_lib/format";

export interface GalleryPin {
  key: string;
  productId: string;
  image: string;
  name: string;
  price: number;
}

const RATIOS = ["aspect-square", "aspect-[3/4]", "aspect-[4/5]", "aspect-[2/3]", "aspect-[5/6]", "aspect-[4/6]"];

export default function MasonryGallery({ pins }: { pins: GalleryPin[] }) {
  return (
    <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
      {pins.map((pin, index) => (
        <Link
          key={pin.key}
          href={`/store/product/${pin.productId}`}
          className="group mb-4 block break-inside-avoid overflow-hidden rounded-3xl bg-surface"
        >
          <div className={`relative w-full overflow-hidden ${RATIOS[index % RATIOS.length]}`}>
            <img
              src={pin.image}
              alt={pin.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-md">
              <Sparkles size={12} />
            </span>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <p className="text-xs text-white">{pin.name}</p>
              <p className="text-[11px] text-white/70">{formatPrice(pin.price)}</p>
            </div>
          </div>
        </Link>
      ))}
      {pins.length === 0 && <p className="text-sm text-muted">More pieces are on the way.</p>}
    </div>
  );
}

import Link from "next/link";

export default function StoreNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 pb-16 pt-8 text-center md:px-10">
      <p className="text-xs uppercase tracking-[0.3em] text-muted">404</p>
      <h1 className="mt-3 font-serif text-3xl italic md:text-4xl">We couldn&apos;t find that page.</h1>
      <p className="mt-3 max-w-sm text-sm text-muted">
        The piece or page you&apos;re looking for may have moved, or the link is out of date.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/store/shop" className="rounded-full border border-hairline px-6 py-3 text-sm transition-colors hover:bg-surface">
          Browse the collection
        </Link>
        <Link href="/store" className="rounded-full bg-ink px-6 py-3 text-sm text-white transition-opacity hover:opacity-90">
          Back home
        </Link>
      </div>
    </div>
  );
}

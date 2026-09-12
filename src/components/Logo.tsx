import Image from "next/image";
import Link from "next/link";

/**
 * Brand lockup. Uses the supplied horizontal logo asset inside a light card so
 * it reads consistently in both light and dark themes. On very small screens
 * the app icon mark alone is shown to save width.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center ${className}`}
      aria-label="株式会社麗海 REIKAI — ホーム"
    >
      {/* Icon mark — always visible */}
      <span className="relative block h-10 w-10 overflow-hidden rounded-xl shadow-sm ring-1 ring-line sm:h-11 sm:w-11">
        <Image
          src="/icons/icon-256.png"
          alt=""
          fill
          sizes="44px"
          className="object-cover"
          priority
        />
      </span>
      {/* Full wordmark — hidden on the narrowest screens */}
      <span className="ml-2 hidden h-9 w-[132px] overflow-hidden rounded-md bg-white/90 px-1 ring-1 ring-line sm:block sm:h-10 sm:w-[150px]">
        <span className="relative block h-full w-full">
          <Image
            src="/images/logo.png"
            alt="株式会社麗海 REIKAI Co., Ltd."
            fill
            sizes="150px"
            className="object-contain"
            priority
          />
        </span>
      </span>
    </Link>
  );
}

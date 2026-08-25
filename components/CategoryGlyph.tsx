import type { DiscoveryCategory } from "@/lib/category-discovery";

/**
 * One stroked mark per competition type. Each glyph is the thing itself
 * (knight, podium, flask, palette, nib) — not a generic “activity” icon.
 */
export function CategoryGlyph({
  category,
  className = "h-6 w-6",
}: {
  category: DiscoveryCategory;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    className,
    "aria-hidden": true as const,
    focusable: false as const,
  };
  const stroke = {
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (category) {
    case "chess":
      return (
        <svg {...common}>
          <path
            {...stroke}
            d="M12 3.5c.8 1.2.8 2.4 0 3.2-.7.7-1.6.8-2.2.4M12 6.7c.9-.2 1.8.2 2.2 1 .5 1 .2 2.1-.6 2.7H10.4c-.8-.6-1.1-1.7-.6-2.7.4-.8 1.3-1.2 2.2-1"
          />
          <path {...stroke} d="M9.2 10.4h5.6l.7 2.2H8.5l.7-2.2Z" />
          <path {...stroke} d="M8 12.6h8l-1.1 6.2H9.1L8 12.6Z" />
          <path {...stroke} d="M7 20.2h10" />
        </svg>
      );
    case "debate":
      return (
        <svg {...common}>
          <path {...stroke} d="M5 6.5h8.5a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H9l-3.2 2.4V14.5H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Z" />
          <path {...stroke} d="M15.5 9.2H19a2 2 0 0 1 2 2v3.2a2 2 0 0 1-2 2h-1.1v2.1L15.4 16.8h-.2" />
        </svg>
      );
    case "stem":
      return (
        <svg {...common}>
          <circle {...stroke} cx="12" cy="12" r="2.1" />
          <ellipse {...stroke} cx="12" cy="12" rx="8.2" ry="3.2" />
          <ellipse
            {...stroke}
            cx="12"
            cy="12"
            rx="8.2"
            ry="3.2"
            transform="rotate(60 12 12)"
          />
          <ellipse
            {...stroke}
            cx="12"
            cy="12"
            rx="8.2"
            ry="3.2"
            transform="rotate(-60 12 12)"
          />
        </svg>
      );
    case "arts":
      return (
        <svg {...common}>
          <path
            {...stroke}
            d="M12 4.2c4.4 0 8 3.2 8 7.2 0 2.4-1.6 3.6-3.2 3.6-1.2 0-1.8-.7-2.2-1.4-.3.6-.9 1.4-2 1.4-1.8 0-2.6-1.5-2.6-3.2 0-2.6 1.8-4.4 1.8-4.4S12.6 4.2 12 4.2Z"
          />
          <circle cx="8.6" cy="10.2" r="1" fill="currentColor" />
          <circle cx="11.4" cy="8.4" r="1" fill="currentColor" />
          <circle cx="14.6" cy="8.8" r="1" fill="currentColor" />
          <circle cx="16.4" cy="11.4" r="1" fill="currentColor" />
        </svg>
      );
    case "writing":
      return (
        <svg {...common}>
          <path {...stroke} d="M14.2 4.8 19.2 9.8 9 20H4v-5L14.2 4.8Z" />
          <path {...stroke} d="M12.4 6.6 17.4 11.6" />
        </svg>
      );
  }
}

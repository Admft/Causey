import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Causey",
    short_name: "Causey",
    description:
      "Search a growing, incomplete index of student competitions, then coordinate invitations and attendance with your organization.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f9fc",
    theme_color: "#f5f9fc",
    lang: "en",
    categories: ["education"],
    icons: [
      {
        src: "/icon-192",
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: "/icon-512",
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: "/icon-512",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
  };
}

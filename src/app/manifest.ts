import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "S&S Collections",
    short_name: "S&S",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/next.svg",
        sizes: "192x192",
        type: "image/svg+xml"
      },
      {
        src: "/next.svg",
        sizes: "512x512",
        type: "image/svg+xml"
      }
    ]
  };
}


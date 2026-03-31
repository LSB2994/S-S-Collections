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
        src: "/logo.png",
        sizes: "640x640",
        type: "image/png"
      },
      {
        src: "/logo.png",
        sizes: "640x640",
        type: "image/png"
      }
    ]
  };
}


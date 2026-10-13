import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "THE MENU",
    short_name: "THE MENU",
    description: "Recipes, meal plan and shopping list.",
    // Opens straight to the shopping list when launched from the home screen.
    start_url: "/shopping-list",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcuts: [
      { name: "Shopping list", url: "/shopping-list" },
      { name: "Recipes", url: "/" },
      { name: "Meal plan", url: "/meal-plan" },
    ],
  };
}

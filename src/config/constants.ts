// Centralized app constants — override via Vite env variables (VITE_*) when needed
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "Senganthal";
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export const HERO_TITLE = import.meta.env.VITE_HERO_TITLE || "Latest Fashion Collection";
export const HERO_SUBTITLE = import.meta.env.VITE_HERO_SUBTITLE || "Discover trending styles and premium quality dresses.";

export const DEFAULT_PRODUCTS = [
  "Shirt",
  "T-Shirt",
  "Jeans",
  "Dress",
];

// Export a default object for convenience
const constants = {
  APP_TITLE,
  API_BASE_URL,
  HERO_TITLE,
  HERO_SUBTITLE,
  DEFAULT_PRODUCTS,
};

export default constants;

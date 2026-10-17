import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://neat-fly-277.convex.cloud";

export const convex = new ConvexReactClient(convexUrl);

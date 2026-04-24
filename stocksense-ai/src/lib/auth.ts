export const clerkConfigured =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

export const demoMode = !clerkConfigured || process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const demoUser = {
  id: "user_demo",
  email: "demo@stocksense.ai",
  name: "Demo Seller",
  imageUrl: "",
};

export type Variant = "A" | "B";
export type SignupApp = "app_a" | "app_b";

export function getVariantFromPath(pathname: string): Variant {
  return pathname.startsWith("/b") ? "B" : "A";
}

export function getSignupAppFromPath(pathname: string): SignupApp {
  return pathname.startsWith("/b") ? "app_b" : "app_a";
}

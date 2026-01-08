// Backwards-compat alias: the app previously had two auth hooks with different storage,
// which caused "logged in but still guest" behavior. Keep this file but delegate to the
// canonical SecureStore-backed hook.
export { useAuth } from "./use-auth";
export type { User } from "./use-auth";


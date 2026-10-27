export { resolveActor, loadActor } from "./application/actor";
export { acceptTerms, hasAcceptedCurrentTerms } from "./application/consents";
export { getUserNames } from "./application/directory";
export { getAuth } from "./infrastructure/auth";
export { getCurrentActor, requireActor, requireOnboardedActor, requirePlatformActor } from "./infrastructure/next-session";
export { hasPlatformRole, type Actor, type PlatformRole } from "@/shared/kernel/actor";

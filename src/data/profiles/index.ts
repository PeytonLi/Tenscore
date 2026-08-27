import { forgottenAccountsProfile, minimalistProfile } from "./forgotten-and-minimalist";
import { powerUserProfile } from "./power-user";
import type { DemoProfile } from "@/domain/types";

export const DEMO_PROFILES: DemoProfile[] = [
  powerUserProfile,
  forgottenAccountsProfile,
  minimalistProfile,
];

export function getProfile(id: string): DemoProfile | undefined {
  return DEMO_PROFILES.find((profile) => profile.id === id);
}

export { powerUserProfile, forgottenAccountsProfile, minimalistProfile };

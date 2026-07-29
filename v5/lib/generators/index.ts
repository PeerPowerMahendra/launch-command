import type { GeneratorConfig, PageType } from "./types";
import campaignWorkspace from "./campaign-workspace";
import landingPage from "./landing-page";
import emailSequence from "./email-sequence";

export const GENERATORS: Record<PageType, GeneratorConfig> = {
  campaign_workspace: campaignWorkspace,
  landing_page: landingPage,
  email_sequence: emailSequence,
};

export function getGenerator(pageType: string): GeneratorConfig | null {
  return (GENERATORS as Record<string, GeneratorConfig>)[pageType] ?? null;
}

export const GENERATOR_LIST = Object.values(GENERATORS);
export * from "./types";

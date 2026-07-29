import type { z } from "zod";

export type PageType = "campaign_workspace" | "landing_page" | "email_sequence";

export type FieldType = "text" | "textarea" | "select" | "number";

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  help?: string;
}

/** The whole product: adding a 4th generator = one new config file, nothing else. */
export interface GeneratorConfig<T = unknown> {
  id: PageType;
  label: string;
  description: string;
  /** Extra inputs beyond the shared campaign brief. */
  formFields: FormField[];
  /** System prompt that sets the expert persona. */
  system: string;
  /** Builds the user prompt from the campaign record + this generator's extra inputs. */
  buildPrompt: (campaign: CampaignInput, extra: Record<string, string>) => string;
  /** Validates + types the model's JSON. One auto-retry happens if this throws. */
  schema: z.ZodType<T>;
}

export interface CampaignInput {
  product_name: string;
  category: string;
  price: string;
  offer?: string;
  core_problem: string;
  usp: string;
  target_audience?: string;
  brand_tone: string;
}

export const BRAND_TONES = [
  "Confident and direct",
  "Warm and reassuring",
  "Playful and bold",
  "Premium and minimal",
  "Scientific and credible",
] as const;

// Centralized, server-only OpenAI pricing assumptions backing the $40
// Build an AI Friend budget cap (see budgetConfig.ts, budgetLedger.ts).
//
// These are NOT invented numbers baked into the app. They are supplied via
// environment variables (server-only, read below) that must be filled in by
// hand from OpenAI's published pricing for the exact models this feature
// calls (see server/aiServer.ts):
//   - CHAT_MODEL  = "gpt-5.4-mini"                          (chat.completions.create)
//   - IMAGE_MODEL = "gpt-image-1" @ 1024x1024 / "medium"    (images.generate)
// Source: https://openai.com/api/pricing -- look up the current per-token
// price for gpt-5.4-nano input/output, and the current price for one
// 1024x1024 medium-quality gpt-image-1 image.
//
// Pricing basis:
//   - Chat: OPENAI_CHAT_INPUT_PRICE_PER_1M_USD / OPENAI_CHAT_OUTPUT_PRICE_PER_1M_USD
//     are USD per 1,000,000 tokens, mirroring how OpenAI publishes chat pricing.
//   - Image: OPENAI_IMAGE_PRICE_USD is a single flat USD price for one
//     generated image at the fixed IMAGE_SIZE/IMAGE_QUALITY this feature
//     always requests. gpt-image-1 responses do carry a token-based `usage`
//     breakdown (input/output image+text tokens -- see the `usage` field on
//     OpenAI.Images.ImagesResponse in the openai SDK's types), but this
//     feature deliberately does not price it token-by-token: that would
//     require three more assumed per-token prices (text input, image input,
//     image output) with more surface area for a wrong guess. A single
//     verified flat price for the one image configuration actually used
//     is simpler to source correctly and, combined with never refunding it
//     (see finalizeImageCostUsd below), is at least as conservative.
//
// If any of the three is unset or not a positive number, pricing is
// "unconfigured" and getPricingConfig() returns null. server/budgetLedger.ts
// treats that as "cannot reliably determine budget" and fails closed: the
// feature reports itself unavailable and no OpenAI request is authorized.
// There is no fallback default price -- guessing would defeat the point of
// a real financial ceiling.
//
// If OpenAI changes pricing for either model, or the model constants in
// server/aiServer.ts change, update these three environment variables.
// No code change is required for a pure price update.

export interface PricingConfig {
  chatInputPerMillionUsd: number;
  chatOutputPerMillionUsd: number;
  imageFlatUsd: number;
}

function readPositiveFloat(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getPricingConfig(): PricingConfig | null {
  const chatInputPerMillionUsd = readPositiveFloat(process.env.OPENAI_CHAT_INPUT_PRICE_PER_1M_USD);
  const chatOutputPerMillionUsd = readPositiveFloat(process.env.OPENAI_CHAT_OUTPUT_PRICE_PER_1M_USD);
  const imageFlatUsd = readPositiveFloat(process.env.OPENAI_IMAGE_PRICE_USD);
  if (chatInputPerMillionUsd === null || chatOutputPerMillionUsd === null || imageFlatUsd === null) {
    return null;
  }
  return { chatInputPerMillionUsd, chatOutputPerMillionUsd, imageFlatUsd };
}

// A BPE tokenizer cannot emit more tokens than the UTF-8 bytes supplied to
// it (byte fallback is the worst case). Add fixed protocol overhead for role
// wrappers and message framing. This is intentionally much more conservative
// than an average characters/token estimate.
const CHAT_PROTOCOL_OVERHEAD_TOKENS = 1024;

/**
 * Upper-bound cost of one chat turn: worst-case input size (system prompt +
 * full message history) plus the hard max_completion_tokens cap already
 * enforced on the request (so actual output can never exceed it).
 */
export function estimateChatReservationUsd(
  pricing: PricingConfig,
  systemPrompt: string,
  history: { content: string }[],
  maxOutputTokens: number,
): number {
  const input = systemPrompt + history.map((message) => message.content).join("");
  const maximumInputTokens = Buffer.byteLength(input, "utf8") + CHAT_PROTOCOL_OVERHEAD_TOKENS;
  const inputCost = (maximumInputTokens / 1_000_000) * pricing.chatInputPerMillionUsd;
  const outputCost = (maxOutputTokens / 1_000_000) * pricing.chatOutputPerMillionUsd;
  return inputCost + outputCost;
}

/** Reconciled cost of a chat turn from OpenAI's actual reported token usage. */
export function finalizeChatCostUsd(pricing: PricingConfig, promptTokens: number, completionTokens: number): number {
  return (promptTokens / 1_000_000) * pricing.chatInputPerMillionUsd + (completionTokens / 1_000_000) * pricing.chatOutputPerMillionUsd;
}

/** Flat conservative reservation for one image generation. See module doc for why this isn't token-priced. */
export function estimateImageReservationUsd(pricing: PricingConfig): number {
  return pricing.imageFlatUsd;
}

import { afterEach, describe, expect, it } from "vitest";
import {
  estimateChatReservationUsd,
  estimateImageReservationUsd,
  finalizeChatCostUsd,
  getPricingConfig,
  type PricingConfig,
} from "./pricingConfig";

const ENV_KEYS = ["OPENAI_CHAT_INPUT_PRICE_PER_1M_USD", "OPENAI_CHAT_OUTPUT_PRICE_PER_1M_USD", "OPENAI_IMAGE_PRICE_USD"] as const;

function clearPricingEnv() {
  for (const key of ENV_KEYS) delete process.env[key];
}

afterEach(clearPricingEnv);

describe("getPricingConfig", () => {
  it("returns null when unset (fail closed, never invent a default price)", () => {
    clearPricingEnv();
    expect(getPricingConfig()).toBeNull();
  });

  it("returns null when only some values are set", () => {
    process.env.OPENAI_CHAT_INPUT_PRICE_PER_1M_USD = "0.05";
    process.env.OPENAI_CHAT_OUTPUT_PRICE_PER_1M_USD = "0.4";
    expect(getPricingConfig()).toBeNull();
  });

  it("returns null for non-positive or non-numeric values", () => {
    process.env.OPENAI_CHAT_INPUT_PRICE_PER_1M_USD = "0";
    process.env.OPENAI_CHAT_OUTPUT_PRICE_PER_1M_USD = "-1";
    process.env.OPENAI_IMAGE_PRICE_USD = "not-a-number";
    expect(getPricingConfig()).toBeNull();
  });

  it("returns a config once all three are valid positive numbers", () => {
    process.env.OPENAI_CHAT_INPUT_PRICE_PER_1M_USD = "0.05";
    process.env.OPENAI_CHAT_OUTPUT_PRICE_PER_1M_USD = "0.4";
    process.env.OPENAI_IMAGE_PRICE_USD = "0.06";
    expect(getPricingConfig()).toEqual({
      chatInputPerMillionUsd: 0.05,
      chatOutputPerMillionUsd: 0.4,
      imageFlatUsd: 0.06,
    });
  });
});

describe("estimateChatReservationUsd", () => {
  const pricing: PricingConfig = { chatInputPerMillionUsd: 3, chatOutputPerMillionUsd: 6, imageFlatUsd: 0.05 };

  it("is a positive upper bound driven by prompt size and the hard max-output-token cap", () => {
    const small = estimateChatReservationUsd(pricing, "short system prompt", [{ content: "hi" }], 220);
    const large = estimateChatReservationUsd(
      pricing,
      "short system prompt",
      [{ content: "a".repeat(2000) }],
      220,
    );
    expect(small).toBeGreaterThan(0);
    expect(large).toBeGreaterThan(small);
  });

  it("output-cost component never exceeds maxOutputTokens worth of spend, regardless of actual reply length", () => {
    const reservation = estimateChatReservationUsd(pricing, "", [], 220);
    const outputOnlyCost = (220 / 1_000_000) * pricing.chatOutputPerMillionUsd;
    expect(reservation).toBeGreaterThan(outputOnlyCost);
  });
});

describe("finalizeChatCostUsd", () => {
  it("matches the published per-token formula exactly for real usage numbers", () => {
    const pricing: PricingConfig = { chatInputPerMillionUsd: 2, chatOutputPerMillionUsd: 8, imageFlatUsd: 0.05 };
    const cost = finalizeChatCostUsd(pricing, 1000, 100);
    expect(cost).toBeCloseTo((1000 / 1_000_000) * 2 + (100 / 1_000_000) * 8, 10);
  });
});

describe("estimateImageReservationUsd", () => {
  it("is the configured flat price, unchanged", () => {
    const pricing: PricingConfig = { chatInputPerMillionUsd: 2, chatOutputPerMillionUsd: 8, imageFlatUsd: 0.042 };
    expect(estimateImageReservationUsd(pricing)).toBe(0.042);
  });
});

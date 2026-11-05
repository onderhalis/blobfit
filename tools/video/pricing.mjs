// Pre-run cost estimate from a Wiro model's live price data (`/Tool/Detail`).
// Wiro docs: `dynamicprice` is a JSON array of tiers keyed by input parameters; an empty
// `inputs` object is a flat rate. Without dynamic pricing the charge is elapsed seconds × `cps`,
// which can only be approximated (`approximatelycost`). Only successful tasks are billed.

/** Price-method labels used by Wiro's official MCP server. */
export const PRICE_METHODS = {
  cpr: 'per request',
  cps: 'per second of compute',
  cpo: 'per output',
  cpt: 'per token',
  'cp-pixel': 'per pixel',
  'cp-audiosecondslength': 'per audio second',
  'cp-promptlength': 'per character',
  'cp-outputVideoLength': 'per video second',
  'cp-realtimeturn': 'per turn',
  'cp-readoutput': 'model-reported',
};

export function parseDynamicPrice(raw) {
  if (!raw) return [];
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return Array.isArray(parsed) ? parsed : [];
}

function tierMatches(tier, params) {
  const inputs = tier.inputs ?? {};
  return Object.entries(inputs).every(([key, value]) => {
    if (typeof value === 'string' && value.startsWith('QUANTITY:')) return key in params;
    return String(params[key]) === String(value);
  });
}

/**
 * @returns {{ status: 'exact' | 'approximate' | 'unknown', priceUsd: number | null, method?: string,
 *            tier?: object, reason?: string, tiers: object[] }}
 * 'exact' means the charge for a successful run is fully determined by the inputs.
 */
export function estimateCost(tool, params) {
  const tiers = parseDynamicPrice(tool.dynamicprice);
  if (tiers.length > 0) {
    const matching = tiers.filter((tier) => tierMatches(tier, params));
    if (matching.length === 0) {
      return { status: 'unknown', priceUsd: null, reason: 'No price tier matches these parameters.', tiers };
    }
    // Most specific tier wins; on a tie take the most expensive so the estimate never undershoots.
    const specificity = (tier) => Object.keys(tier.inputs ?? {}).length;
    const best = Math.max(...matching.map(specificity));
    const tier = matching
      .filter((candidate) => specificity(candidate) === best)
      .reduce((a, b) => (Number(b.price) > Number(a.price) ? b : a));
    const price = Number(tier.price);
    const usesQuantity = Object.values(tier.inputs ?? {}).some((v) => typeof v === 'string' && v.startsWith('QUANTITY:'));
    if (!Number.isFinite(price) || usesQuantity) {
      return { status: 'unknown', priceUsd: null, method: tier.priceMethod, tier, tiers, reason: 'Quantity-based tier; check the model page manually.' };
    }
    switch (tier.priceMethod) {
      case 'cpr':
      case 'cpo':
        return { status: 'exact', priceUsd: round(price), method: tier.priceMethod, tier, tiers };
      case 'cp-outputVideoLength': {
        const seconds = Number(params.duration);
        if (!Number.isFinite(seconds)) {
          return { status: 'unknown', priceUsd: null, method: tier.priceMethod, tier, tiers, reason: 'Per-second price but no numeric duration.' };
        }
        return { status: 'exact', priceUsd: round(price * seconds), method: tier.priceMethod, tier, tiers };
      }
      default:
        return { status: 'unknown', priceUsd: null, method: tier.priceMethod, tier, tiers, reason: `Unsupported price method "${tier.priceMethod}".` };
    }
  }
  const approx = Number(tool.approximatelycost ?? 0);
  if (approx > 0) {
    return { status: 'approximate', priceUsd: round(approx), method: 'cps', tiers, reason: 'Billed by compute seconds; Wiro estimate from average run time.' };
  }
  return { status: 'unknown', priceUsd: null, tiers, reason: 'Model publishes no price data.' };
}

export function round(value) {
  return Math.round(value * 1e6) / 1e6;
}

export function formatUsd(value) {
  return value === null || value === undefined ? 'unknown' : `$${value.toFixed(value < 1 ? 3 : 2)}`;
}

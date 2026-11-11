/**
 * Dual-price planning helper. NOT wired into live checkout.
 *
 * Base price is the discounted Zelle amount; the returned regular price
 * is an all-in card price, not a separate credit/debit card surcharge.
 * Display the regular price everywhere a price is advertised, alongside
 * the discounted Zelle price if desired, before enabling this helper.
 *
 * The fee assumptions must be verified for the merchant account.
 * Keep this helper isolated until checkout, webhook/RPC, existing-session
 * compatibility and customer-facing price displays are deployed together.
 */
export function regularCardPriceCents(
  zellePriceCents: number,
  percentageBasisPoints = 290,
  fixedFeeCents = 30,
): number {
  if (!Number.isSafeInteger(zellePriceCents) || zellePriceCents < 0 ||
      !Number.isSafeInteger(percentageBasisPoints) || percentageBasisPoints < 0 ||
      percentageBasisPoints >= 10000 ||
      !Number.isSafeInteger(fixedFeeCents) || fixedFeeCents < 0) {
    throw new RangeError('Invalid price or processing rate');
  }
  // Round up so the estimated post-processing amount is never below
  // the intended discounted Zelle price, given these assumptions.
  const gross = Math.ceil(
    ((zellePriceCents + fixedFeeCents) * 10000) /
    (10000 - percentageBasisPoints)
  );
  if (!Number.isSafeInteger(gross)) throw new RangeError('Price overflow');
  return gross;
}

export function dualPriceForRegistration(
  zelleUnitPriceCents: number,
  spotsReserved: number,
) {
  if (!Number.isSafeInteger(spotsReserved) || spotsReserved < 1 || spotsReserved > 100) {
    throw new RangeError('Invalid reserved spot count');
  }
  const zelleTotalCents = zelleUnitPriceCents * spotsReserved;
  if (!Number.isSafeInteger(zelleTotalCents)) throw new RangeError('Price overflow');
  return {
    zelleTotalCents,
    regularCardTotalCents: regularCardPriceCents(zelleTotalCents),
  };
}

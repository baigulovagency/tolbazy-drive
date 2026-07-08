import type { TariffCell } from "../../../../packages/shared/src/index.js";
import { calculateSegmentPrice } from "../../../../packages/shared/src/index.js";

export type PricingPoint = {
  label: string;
  zoneId?: string;
};

export type MultiStopRule = {
  mode: "sum_segments" | "base_plus_stop_fee";
  extraStopFeeRub: number;
};

export type PriceQuote =
  | { kind: "fixed"; priceRub: number }
  | { kind: "needs_dispatcher"; reason: string };

export function quoteRoutePrice(params: {
  points: PricingPoint[];
  isRoundTrip: boolean;
  tariffMatrix: TariffCell[];
  multiStopRule?: MultiStopRule;
}): PriceQuote {
  const { points, isRoundTrip, tariffMatrix } = params;
  const rule = params.multiStopRule ?? { mode: "sum_segments", extraStopFeeRub: 0 };

  if (points.length < 2) {
    return { kind: "needs_dispatcher", reason: "Недостаточно точек маршрута" };
  }

  if (points.some((point) => !point.zoneId)) {
    return { kind: "needs_dispatcher", reason: "Не удалось определить тарифную зону" };
  }

  const segmentPrices: number[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const fromZoneId = points[index].zoneId;
    const toZoneId = points[index + 1].zoneId;
    if (!fromZoneId || !toZoneId) {
      return { kind: "needs_dispatcher", reason: "Не удалось определить тарифную зону" };
    }

    const segmentPrice = calculateSegmentPrice(fromZoneId, toZoneId, tariffMatrix);
    if (segmentPrice === undefined) {
      return { kind: "needs_dispatcher", reason: "Маршрут отсутствует в матрице тарифов" };
    }
    segmentPrices.push(segmentPrice);
  }

  const oneWayPrice =
    rule.mode === "base_plus_stop_fee"
      ? segmentPrices[0] + Math.max(0, points.length - 2) * rule.extraStopFeeRub
      : segmentPrices.reduce((sum, price) => sum + price, 0) +
        Math.max(0, points.length - 2) * rule.extraStopFeeRub;

  return { kind: "fixed", priceRub: isRoundTrip ? oneWayPrice * 2 : oneWayPrice };
}

export function quoteAnyFleetRange(quotes: Array<{ fleetName: string; priceRub?: number }>) {
  const fixedPrices = quotes.flatMap((quote) => (quote.priceRub ? [quote.priceRub] : []));
  if (fixedPrices.length === 0) {
    return undefined;
  }

  return {
    minRub: Math.min(...fixedPrices),
    maxRub: Math.max(...fixedPrices),
    quotes
  };
}

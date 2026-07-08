export type OrderDraftStep = "from" | "to" | "fleet" | "confirm";

export type OrderDraft = {
  step: OrderDraftStep;
  fromZoneId?: string;
  fromLabel?: string;
  toZoneId?: string;
  toLabel?: string;
  fleetId?: string;
  fleetChoice?: "any" | "specific";
  quotedPriceRub?: number;
  priceLabel?: string;
};

const drafts = new Map<string, OrderDraft>();

export function getDraft(telegramId: string): OrderDraft | undefined {
  return drafts.get(telegramId);
}

export function setDraft(telegramId: string, draft: OrderDraft) {
  drafts.set(telegramId, draft);
}

export function clearDraft(telegramId: string) {
  drafts.delete(telegramId);
}

export function startDraft(telegramId: string): OrderDraft {
  const draft: OrderDraft = { step: "from" };
  drafts.set(telegramId, draft);
  return draft;
}

import { InlineKeyboard, Keyboard } from "grammy";

type ZoneOption = { id: string; name: string; type: string };

export function passengerMainMenu(lastRouteLabel?: string) {
  const keyboard = new Keyboard();

  if (lastRouteLabel) {
    keyboard.text(`🔁 Повторить: ${lastRouteLabel}`).row();
  }

  keyboard.text("🚕 Новый заказ").row();
  keyboard.text("📋 Мои поездки").text("📍 Мои адреса").row();
  keyboard.text("❌ Отменить заказ").text("❓ Помощь").resized();

  return keyboard;
}

export function zoneGroupKeyboard(step: "from" | "to") {
  return new InlineKeyboard()
    .text("🏘 Толбазы", `zonegrp:${step}:tolbazy`)
    .text("🌾 Деревни", `zonegrp:${step}:district`)
    .row()
    .text("❌ Отмена", "order:cancel");
}

export function zonesKeyboard(step: "from" | "to", zones: ZoneOption[]) {
  const keyboard = new InlineKeyboard();

  for (const zone of zones) {
    keyboard.text(zone.name, `zone:${step}:${zone.id}`).row();
  }

  keyboard.text("⬅️ Назад", `zonegrp:${step}:back`).text("❌ Отмена", "order:cancel");
  return keyboard;
}

export function fleetChoiceKeyboard(fleets: Array<{ id: string; name: string }>) {
  const keyboard = new InlineKeyboard().text("🎲 Любой свободный", "fleet:any").row();
  for (const fleet of fleets) {
    keyboard.text(fleet.name, `fleet:${fleet.id}`).row();
  }
  keyboard.text("⬅️ Назад", "order:back:to").text("❌ Отмена", "order:cancel");
  return keyboard;
}

export function confirmOrderKeyboard() {
  return new InlineKeyboard()
    .text("✅ Заказать", "order:confirm")
    .text("✏️ Изменить", "order:restart")
    .row()
    .text("❌ Отмена", "order:cancel");
}

export function driverOfferKeyboard(orderId: string, round: number) {
  return new InlineKeyboard()
    .text("✅ Принять", `driver:accept:${orderId}`)
    .text("❌ Пропустить", `driver:skip:${orderId}:${round}`);
}

export function activeRideKeyboard(dispatcherPhone?: string) {
  const keyboard = new InlineKeyboard().text("📞 Позвонить водителю", "ride:call_driver").row();
  if (dispatcherPhone) {
    keyboard.text("📞 Диспетчер парка", `ride:dispatcher:${dispatcherPhone}`).row();
  }
  return keyboard.text("❌ Отменить", "ride:cancel");
}

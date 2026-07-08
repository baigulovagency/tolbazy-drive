import { InlineKeyboard, Keyboard } from "grammy";

export function passengerMainMenu(lastRouteLabel?: string) {
  const keyboard = new Keyboard();

  if (lastRouteLabel) {
    keyboard.text(`🔁 Повторить: ${lastRouteLabel}`).row();
  }

  keyboard.text("🚕 Новый заказ").row();
  keyboard.text("📋 Мои поездки").text("📍 Мои адреса").row();
  keyboard.text("❓ Помощь").resized();

  return keyboard;
}

export function fleetChoiceKeyboard(fleets: Array<{ id: string; name: string }>) {
  const keyboard = new InlineKeyboard().text("🎲 Любой свободный", "fleet:any").row();
  for (const fleet of fleets) {
    keyboard.text(fleet.name, `fleet:${fleet.id}`).row();
  }
  return keyboard;
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

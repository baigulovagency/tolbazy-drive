import { InlineKeyboard, Keyboard } from "grammy";
import { t } from "../domain/bot-texts";

type ZoneOption = { id: string; name: string; type: string };

export function passengerMainMenu(lastRouteLabel?: string) {
  const keyboard = new Keyboard();

  if (lastRouteLabel) {
    keyboard.text(t("kbd.repeat", { route: lastRouteLabel })).row();
  }

  keyboard.text(t("kbd.new_order")).row();
  keyboard.text(t("kbd.my_trips")).text(t("kbd.my_addresses")).row();
  keyboard.text(t("kbd.cancel_order")).text(t("kbd.help")).resized();

  return keyboard;
}

export function zoneGroupKeyboard(step: "from" | "to") {
  return new InlineKeyboard()
    .text(t("kbd.zone_town"), `zonegrp:${step}:tolbazy`)
    .text(t("kbd.zone_village"), `zonegrp:${step}:district`)
    .row()
    .text(t("kbd.cancel"), "order:cancel");
}

export function zonesKeyboard(step: "from" | "to", zones: ZoneOption[]) {
  const keyboard = new InlineKeyboard();

  for (const zone of zones) {
    keyboard.text(zone.name, `zone:${step}:${zone.id}`).row();
  }

  keyboard.text(t("kbd.back"), `zonegrp:${step}:back`).text(t("kbd.cancel"), "order:cancel");
  return keyboard;
}

export function fleetChoiceKeyboard(fleets: Array<{ id: string; name: string }>) {
  const keyboard = new InlineKeyboard().text(t("kbd.fleet_any"), "fleet:any").row();
  for (const fleet of fleets) {
    keyboard.text(fleet.name, `fleet:${fleet.id}`).row();
  }
  keyboard.text(t("kbd.back"), "order:back:to").text(t("kbd.cancel"), "order:cancel");
  return keyboard;
}

export function confirmOrderKeyboard() {
  return new InlineKeyboard()
    .text(t("kbd.confirm"), "order:confirm")
    .text(t("kbd.edit"), "order:restart")
    .row()
    .text(t("kbd.cancel"), "order:cancel");
}

export function driverOfferKeyboard(orderId: string, round: number) {
  return new InlineKeyboard()
    .text(t("kbd.accept"), `driver:accept:${orderId}`)
    .text(t("kbd.skip"), `driver:skip:${orderId}:${round}`);
}

export function activeRideKeyboard(dispatcherPhone?: string) {
  const keyboard = new InlineKeyboard().text(t("kbd.call_driver"), "ride:call_driver").row();
  if (dispatcherPhone) {
    keyboard.text(t("kbd.call_dispatcher"), `ride:dispatcher:${dispatcherPhone}`).row();
  }
  return keyboard.text(t("kbd.cancel"), "ride:cancel");
}

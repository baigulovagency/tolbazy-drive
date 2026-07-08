export type UserRole = "passenger" | "driver" | "dispatcher" | "fleet_admin" | "super_admin";

export type ZoneType = "tolbazy" | "district";

export type FleetCode = "voyage" | "alexander" | "akbuzat";

export type PaymentMethod = "cash" | "transfer";

export type OrderStatus =
  | "draft"
  | "awaiting_price"
  | "awaiting_confirm"
  | "broadcasting"
  | "taken"
  | "arriving"
  | "waiting"
  | "in_trip"
  | "completed"
  | "cancelled"
  | "expired";

export type Zone = {
  id: string;
  name: string;
  type: ZoneType;
  description: string;
  settlements: string[];
};

export type Fleet = {
  id: FleetCode | string;
  name: string;
  dispatcherPhone?: string;
  isActive: boolean;
  monthlyFeeRub: number;
};

export type TariffCell = {
  fromZoneId: string;
  toZoneId: string;
  priceRub: number;
};

export type RoutePoint = {
  label: string;
  zoneId?: string;
  latitude?: number;
  longitude?: number;
};

export type RideOrder = {
  id: string;
  passengerId: string;
  fleetId?: string;
  driverId?: string;
  points: RoutePoint[];
  isRoundTrip: boolean;
  paymentPreference?: PaymentMethod;
  status: OrderStatus;
  quotedPriceRub?: number;
  comment?: string;
};

export const MIN_RIDE_PRICE_RUB = 150;
export const TEST_SUBSCRIPTION_PRICE_RUB = 0;

export const TOLBAZY_ZONES: Zone[] = [
  {
    id: "tolbazy_north",
    name: "Северный район",
    type: "tolbazy",
    description: "Северная часть села, выезд в сторону Уфы",
    settlements: []
  },
  {
    id: "tolbazy_center",
    name: "Центральный район",
    type: "tolbazy",
    description: "Администрация, центральная площадь, рынок, основные магазины",
    settlements: []
  },
  {
    id: "tolbazy_south",
    name: "Южный район",
    type: "tolbazy",
    description: "Южная часть села, выезд в сторону Стерлитамака",
    settlements: []
  },
  {
    id: "tolbazy_east",
    name: "Восточный район",
    type: "tolbazy",
    description: "Восточная жилая застройка, новые улицы",
    settlements: []
  },
  {
    id: "tolbazy_sofipol",
    name: "Софиполь",
    type: "tolbazy",
    description: "Отдельный микрорайон Толбазов",
    settlements: []
  }
];

export const DISTRICT_ZONES: Zone[] = [
  {
    id: "district_north",
    name: "Северная зона",
    type: "district",
    description: "Северная группа деревень Аургазинского района",
    settlements: ["Бишкаин", "Ишлы", "Староабсалямово", "Чуваш-Карамалы"]
  },
  {
    id: "district_west",
    name: "Западная зона",
    type: "district",
    description: "Западная группа деревень Аургазинского района",
    settlements: ["Тряпино", "Семёнкино", "Новофёдоровка", "Александровка"]
  },
  {
    id: "district_east",
    name: "Восточная зона",
    type: "district",
    description: "Восточная группа деревень Аургазинского района",
    settlements: ["Исмагилово", "Тукаево", "Месели", "Турумбет"]
  },
  {
    id: "district_south",
    name: "Южная зона",
    type: "district",
    description: "Южная группа деревень Аургазинского района",
    settlements: ["Шланлы", "Татарский Нагадак", "Чувашский Нагадак", "Мустафино"]
  },
  {
    id: "district_near_tolbazy",
    name: "Пригород Толбазов",
    type: "district",
    description: "Ближайшие населённые пункты около Толбазов",
    settlements: ["Юламаново", "Культура", "Никольск", "Алексеевка", "Чулпан"]
  }
];

export const DEFAULT_ZONES = [...TOLBAZY_ZONES, ...DISTRICT_ZONES];

export const DEFAULT_FLEETS: Fleet[] = [
  { id: "voyage", name: "Вояж", isActive: true, monthlyFeeRub: TEST_SUBSCRIPTION_PRICE_RUB },
  { id: "alexander", name: "Александр", isActive: true, monthlyFeeRub: TEST_SUBSCRIPTION_PRICE_RUB },
  { id: "akbuzat", name: "Акбузат", isActive: true, monthlyFeeRub: TEST_SUBSCRIPTION_PRICE_RUB }
];

export function buildDefaultTariffMatrix(zones: Zone[] = DEFAULT_ZONES): TariffCell[] {
  return zones.flatMap((fromZone) =>
    zones.map((toZone) => {
      const priceRub = fromZone.type === "tolbazy" && toZone.type === "tolbazy" ? 150 : 300;
      return { fromZoneId: fromZone.id, toZoneId: toZone.id, priceRub };
    })
  );
}

export function calculateSegmentPrice(
  fromZoneId: string,
  toZoneId: string,
  matrix: TariffCell[]
): number | undefined {
  const cell = matrix.find((item) => item.fromZoneId === fromZoneId && item.toZoneId === toZoneId);
  if (!cell) return undefined;
  return Math.max(cell.priceRub, MIN_RIDE_PRICE_RUB);
}

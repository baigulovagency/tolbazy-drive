export type BotTextDefault = {
  key: string;
  category: string;
  label: string;
  body: string;
};

export const DEFAULT_BOT_TEXTS: BotTextDefault[] = [
  {
    key: "bot.welcome",
    category: "general",
    label: "Приветствие /start",
    body: "Здравствуйте, {name}! Это Толбазы Драйв.\n\nЗакажите такси без звонков — всё в одном окне ниже."
  },
  {
    key: "bot.help",
    category: "general",
    label: "Помощь",
    body: "Как заказать:\n1. Нажмите «Новый заказ»\n2. Выберите откуда и куда\n3. Выберите автопарк\n4. Подтвердите цену\n\nОтмена: кнопка «Отмена» или /cancel"
  },
  {
    key: "bot.cancelled",
    category: "general",
    label: "Отмена /cancel",
    body: "Заказ отменён."
  },
  {
    key: "bot.coming_soon",
    category: "general",
    label: "Функция скоро",
    body: "Эта функция скоро появится. Пока заказывайте через «Новый заказ»."
  },
  {
    key: "bot.trips_empty",
    category: "general",
    label: "Нет поездок",
    body: "Пока нет поездок. Нажмите «Новый заказ»."
  },
  {
    key: "bot.trips_header",
    category: "general",
    label: "Заголовок списка поездок",
    body: "📋 Последние поездки:"
  },
  {
    key: "order.from_prompt",
    category: "order",
    label: "Шаг: откуда",
    body: "📍 Откуда поедем?\n\nВыберите зону:"
  },
  {
    key: "order.to_prompt",
    category: "order",
    label: "Шаг: куда",
    body: "📍 Куда поедем?\n\nВыберите зону:"
  },
  {
    key: "order.from_title",
    category: "order",
    label: "Заголовок списка зон (откуда)",
    body: "📍 Откуда поедем?"
  },
  {
    key: "order.to_title",
    category: "order",
    label: "Заголовок списка зон (куда)",
    body: "📍 Куда поедем?"
  },
  {
    key: "order.fleet_prompt",
    category: "order",
    label: "Шаг: автопарк",
    body: "🚕 Выберите автопарк:"
  },
  {
    key: "order.summary_header",
    category: "order",
    label: "Заголовок подтверждения",
    body: "📋 Ваш заказ"
  },
  {
    key: "order.fleet_any",
    category: "order",
    label: "Парк: любой",
    body: "Любой свободный"
  },
  {
    key: "order.cancelled",
    category: "order",
    label: "Заказ отменён (inline)",
    body: "Заказ отменён. Нажмите «Новый заказ», когда будете готовы."
  },
  {
    key: "order.accepted",
    category: "order",
    label: "Заказ принят, ищем машину",
    body: "✅ Заказ принят!\n\n{route}\n💰 {price}\n\nИщем машину… (уведомлено водителей: {sentCount})"
  },
  {
    key: "order.accepted_no_drivers",
    category: "order",
    label: "Заказ принят, нет водителей",
    body: "✅ Заказ принят, но сейчас нет водителей на линии.\n\n{route}\n💰 {price}\n\nПовторим поиск автоматически."
  },
  {
    key: "order.driver_found",
    category: "order",
    label: "Машина найдена",
    body: "✅ Машина найдена!\n\nВодитель: {driverName}\nПарк: {fleetName}\n💰 {price} ₽"
  },
  {
    key: "order.expired",
    category: "order",
    label: "Машина не найдена",
    body: "😔 Пока не удалось найти свободную машину.\n\nПопробуйте ещё раз или выберите другой автопарк."
  },
  {
    key: "status.broadcasting",
    category: "status",
    label: "Статус: ищем машину",
    body: "Ищем машину…"
  },
  {
    key: "status.taken",
    category: "status",
    label: "Статус: водитель назначен",
    body: "Водитель назначен"
  },
  {
    key: "status.arriving",
    category: "status",
    label: "Статус: едет к вам",
    body: "Едет к вам"
  },
  {
    key: "status.waiting",
    category: "status",
    label: "Статус: на месте",
    body: "На месте"
  },
  {
    key: "status.in_trip",
    category: "status",
    label: "Статус: в пути",
    body: "В пути"
  },
  {
    key: "status.completed",
    category: "status",
    label: "Статус: завершено",
    body: "Завершено"
  },
  {
    key: "status.cancelled",
    category: "status",
    label: "Статус: отменено",
    body: "Отменено"
  },
  {
    key: "status.expired",
    category: "status",
    label: "Статус: не нашли машину",
    body: "Не нашли машину"
  },
  {
    key: "alert.session_expired",
    category: "alert",
    label: "Сессия истекла",
    body: "Сессия истекла. Нажмите «Новый заказ»."
  },
  {
    key: "alert.zone_not_found",
    category: "alert",
    label: "Зона не найдена",
    body: "Зона не найдена"
  },
  {
    key: "alert.route_required",
    category: "alert",
    label: "Сначала маршрут",
    body: "Сначала выберите маршрут"
  },
  {
    key: "alert.price_failed",
    category: "alert",
    label: "Не удалось рассчитать цену",
    body: "Не удалось рассчитать цену"
  },
  {
    key: "alert.fleet_not_found",
    category: "alert",
    label: "Автопарк не найден",
    body: "Автопарк не найден"
  },
  {
    key: "alert.dispatcher_price",
    category: "alert",
    label: "Цену уточнит диспетчер",
    body: "Цену уточнит диспетчер"
  },
  {
    key: "alert.order_incomplete",
    category: "alert",
    label: "Данные заказа неполные",
    body: "Данные заказа неполные"
  },
  {
    key: "alert.active_order",
    category: "alert",
    label: "Уже есть активный заказ",
    body: "У вас уже есть активный заказ"
  },
  {
    key: "driver.not_registered",
    category: "driver",
    label: "Не зарегистрирован как водитель",
    body: "Вы не зарегистрированы как водитель. Обратитесь к диспетчеру автопарка."
  },
  {
    key: "driver.online",
    category: "driver",
    label: "Водитель на линии",
    body: "✅ Вы на линии ({fleet}).\nНовые заказы будут приходить сюда."
  },
  {
    key: "driver.offline",
    category: "driver",
    label: "Водитель снят с линии",
    body: "Вы сняты с линии. Заказы приходить не будут."
  },
  {
    key: "driver.offer_header",
    category: "driver",
    label: "Заголовок заказа для водителя",
    body: "🚕 НОВЫЙ ЗАКАЗ"
  },
  {
    key: "driver.offer_taken",
    category: "driver",
    label: "Заказ уже принят",
    body: "❌ Заказ уже принят другим водителем"
  },
  {
    key: "driver.accepted",
    category: "driver",
    label: "Водитель принял заказ",
    body: "✅ Вы приняли заказ. Свяжитесь с пассажиром."
  },
  {
    key: "driver.skipped",
    category: "driver",
    label: "Водитель пропустил",
    body: "Вы пропустили заказ."
  },
  {
    key: "driver.not_linked",
    category: "driver",
    label: "Водитель не привязан к парку",
    body: "Водитель не привязан к автопарку"
  },
  {
    key: "kbd.new_order",
    category: "keyboard",
    label: "Кнопка: Новый заказ",
    body: "🚕 Новый заказ"
  },
  {
    key: "kbd.my_trips",
    category: "keyboard",
    label: "Кнопка: Мои поездки",
    body: "📋 Мои поездки"
  },
  {
    key: "kbd.my_addresses",
    category: "keyboard",
    label: "Кнопка: Мои адреса",
    body: "📍 Мои адреса"
  },
  {
    key: "kbd.cancel_order",
    category: "keyboard",
    label: "Кнопка: Отменить заказ",
    body: "❌ Отменить заказ"
  },
  {
    key: "kbd.help",
    category: "keyboard",
    label: "Кнопка: Помощь",
    body: "❓ Помощь"
  },
  {
    key: "kbd.repeat",
    category: "keyboard",
    label: "Кнопка: Повторить маршрут",
    body: "🔁 Повторить: {route}"
  },
  {
    key: "kbd.zone_town",
    category: "keyboard",
    label: "Кнопка: Толбазы",
    body: "🏘 Толбазы"
  },
  {
    key: "kbd.zone_village",
    category: "keyboard",
    label: "Кнопка: Деревни",
    body: "🌾 Деревни"
  },
  {
    key: "kbd.cancel",
    category: "keyboard",
    label: "Кнопка: Отмена",
    body: "❌ Отмена"
  },
  {
    key: "kbd.back",
    category: "keyboard",
    label: "Кнопка: Назад",
    body: "⬅️ Назад"
  },
  {
    key: "kbd.fleet_any",
    category: "keyboard",
    label: "Кнопка: Любой парк",
    body: "🎲 Любой свободный"
  },
  {
    key: "kbd.confirm",
    category: "keyboard",
    label: "Кнопка: Заказать",
    body: "✅ Заказать"
  },
  {
    key: "kbd.edit",
    category: "keyboard",
    label: "Кнопка: Изменить",
    body: "✏️ Изменить"
  },
  {
    key: "kbd.accept",
    category: "keyboard",
    label: "Кнопка: Принять",
    body: "✅ Принять"
  },
  {
    key: "kbd.skip",
    category: "keyboard",
    label: "Кнопка: Пропустить",
    body: "❌ Пропустить"
  },
  {
    key: "kbd.call_driver",
    category: "keyboard",
    label: "Кнопка: Позвонить водителю",
    body: "📞 Позвонить водителю"
  },
  {
    key: "kbd.call_dispatcher",
    category: "keyboard",
    label: "Кнопка: Диспетчер",
    body: "📞 Диспетчер парка"
  },
  {
    key: "label.from",
    category: "order",
    label: "Подпись: Откуда",
    body: "Откуда"
  },
  {
    key: "label.to",
    category: "order",
    label: "Подпись: Куда",
    body: "Куда"
  },
  {
    key: "label.fleet",
    category: "order",
    label: "Подпись: Парк",
    body: "Парк"
  },
  {
    key: "label.price",
    category: "order",
    label: "Подпись: Цена",
    body: "💰"
  },
  {
    key: "label.round",
    category: "driver",
    label: "Подпись: Раунд",
    body: "⏱ Раунд {round}/{maxRounds}"
  }
];

export const DEFAULT_BOT_TEXT_MAP = Object.fromEntries(
  DEFAULT_BOT_TEXTS.map((item) => [item.key, item.body])
) as Record<string, string>;

import { DEFAULT_FLEETS, DEFAULT_ZONES } from "@tolbazy/shared";

const raceSettings = [
  ["Раунд рассылки", "3 минуты"],
  ["Пауза между раундами", "1-2 минуты"],
  ["Максимум раундов", "3"],
  ["Отклонил заказ", "Скрыт до следующего раунда"]
];

export default function DashboardPage() {
  const tolbazyZones = DEFAULT_ZONES.filter((zone) => zone.type === "tolbazy");
  const districtZones = DEFAULT_ZONES.filter((zone) => zone.type === "district");

  return (
    <main>
      <section className="hero">
        <p className="pill">Тестовый период: абонплата 0 ₽</p>
        <h1>Толбазы Драйв</h1>
        <p>
          Админка агрегатора такси: автопарки, зоны, тарифы, водители, диспетчеры и race-раздача заказов.
        </p>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Автопарки</h2>
          <table>
            <tbody>
              {DEFAULT_FLEETS.map((fleet) => (
                <tr key={fleet.id}>
                  <td>{fleet.name}</td>
                  <td>{fleet.isActive ? "Активен" : "Скрыт"}</td>
                  <td>{fleet.monthlyFeeRub} ₽/мес</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Стартовые тарифы</h2>
          <p>По Толбазам: 150 ₽</p>
          <p>В деревни / из деревень / между деревнями: 300 ₽</p>
          <p>Туда-обратно: цена × 2</p>
        </div>

        <div className="card">
          <h2>Race-раздача</h2>
          <table>
            <tbody>
              {raceSettings.map(([label, value]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>5 зон Толбаз</h2>
          {tolbazyZones.map((zone) => (
            <p key={zone.id}>
              <strong>{zone.name}</strong>
              <br />
              {zone.description}
            </p>
          ))}
        </div>

        <div className="card">
          <h2>5 зон района</h2>
          {districtZones.map((zone) => (
            <p key={zone.id}>
              <strong>{zone.name}</strong>
              <br />
              {zone.settlements.join(", ")}
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}

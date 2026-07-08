import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Толбазы Драйв",
  description: "Админка агрегатора такси"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

import "./globals.css";

export const metadata = {
  title: "Крестики-Нолики Онлайн",
  description: "Игра для двоих, в любой точке мира",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

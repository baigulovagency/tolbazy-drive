# Деплой на VPS

Инструкция для сервера Ubuntu 24.04 LTS.

## 1. Подключиться к серверу

На странице сервера найдите публичный IP. Подключение:

```bash
ssh root@SERVER_IP
```

Если используется SSH-ключ, команда та же. Если используется пароль, сервер попросит пароль.

## 2. Обновить сервер

```bash
apt update && apt upgrade -y
```

## 3. Установить Docker

```bash
apt install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Проверка:

```bash
docker --version
docker compose version
```

## 4. Создать папку проекта

```bash
mkdir -p /opt/tolbazy-drive
cd /opt/tolbazy-drive
```

## 5. Загрузить проект на сервер

С локального ПК можно отправить архивом или через Git.

Вариант без Git:

1. На ПК заархивировать папку `C:\Users\baigd\Projects\tolbazy-drive`.
2. Загрузить архив на сервер.
3. Распаковать в `/opt/tolbazy-drive`.

Вариант через Git будет удобнее после настройки репозитория.

## 6. Создать production .env

```bash
cp .env.production.example .env
nano .env
```

Заполнить:

```env
POSTGRES_USER="tolbazy"
POSTGRES_PASSWORD="сложный_пароль_для_базы"
POSTGRES_DB="tolbazy_drive"
TELEGRAM_BOT_TOKEN="токен_от_BotFather"
ADMIN_BASE_URL="http://SERVER_IP:3000"
NEXT_PUBLIC_API_URL="http://SERVER_IP:4000"
```

`SERVER_IP` заменить на IP сервера.

## 7. Запустить приложение

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 8. Создать таблицы и стартовые данные

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec api npm run db:seed
```

## 9. Проверить

API:

```bash
curl http://localhost:4000/health
```

В браузере:

```text
http://SERVER_IP:3000
```

Telegram-бот начнет отвечать, если `TELEGRAM_BOT_TOKEN` указан правильно.

## Полезные команды

Логи:

```bash
docker compose -f docker-compose.prod.yml logs -f api
```

Перезапуск:

```bash
docker compose -f docker-compose.prod.yml restart
```

Остановить:

```bash
docker compose -f docker-compose.prod.yml down
```

Обновить после изменений:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

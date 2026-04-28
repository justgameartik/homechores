# 🏠 Домашний Рейтинг

Семейное приложение для соревнования — кто больше делает по дому.

## Стек
- **Backend:** Go + Chi + PostgreSQL + JWT
- **Frontend:** React + Vite
- **Деплой:** Docker Compose

---

## Быстрый старт (Docker)

```bash
# 1. Клонируй / скопируй проект на сервер
scp -r homechores/ user@your-server:~/

# 2. Создай .env из примера
cp .env.example .env
# Отредактируй: DB_PASSWORD и JWT_SECRET (случайная строка ≥ 32 символов)

# 3. Запусти
docker compose up -d --build
OR
docker-compose up -d --build

# Приложение доступно на http://your-server:8080
```

---

## Разработка без Docker

### Backend
```bash
# Нужен Go 1.22+ и PostgreSQL
cp .env.example .env
# Настрой .env под локальную БД

go mod tidy
go run ./cmd/server
# Сервер на :8080
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Dev-сервер на :5173, API проксируется на :8080
```

---

## Как пользоваться

### Первый участник создаёт семью
1. Открывает приложение → "Создать семью"
2. Вводит имя, пароль, название семьи
3. Получает **инвайт-код** (показывается вверху после входа)

### Остальные вступают
1. "Вступить" → вводят инвайт-код
2. Создают свой профиль с паролем

### Логин
- Нужен **Family ID** (число) + имя + пароль
- Family ID видно в URL или сообщи членам семьи

---

## API endpoints

| Method | Path | Auth | Описание |
|--------|------|------|----------|
| POST | `/api/auth/register` | — | Создать семью + первого юзера |
| POST | `/api/auth/join` | — | Вступить по инвайт-коду |
| POST | `/api/auth/login` | — | Войти |
| GET | `/api/family` | JWT | Инфо о семье + рейтинг |
| GET | `/api/chores` | JWT | Список заданий |
| POST | `/api/chores` | JWT | Добавить своё задание |
| POST | `/api/log` | JWT | Отметить выполненное |
| GET | `/api/history/{userID}` | JWT | История конкретного участника |

---

## Nginx (если нужен reverse proxy)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

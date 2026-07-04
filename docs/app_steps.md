````md

# Ближайшие шаги: подключение CinemaGuesser к PostgreSQL

## 1. Установить PostgreSQL-клиент для Next.js

<!-- 
```bash
npm install pg
npm install -D @types/pg
<!-- ```` -->
<!-- 
Что это даёт:

* `pg` — библиотека для подключения Node.js / Next.js к PostgreSQL.
* `@types/pg` — типы для TypeScript. --> 


## 2. Добавить подключение к базе

<!-- В файл `.env.local` приложения добавить:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/cinemaguesser"
<!-- ```

Заменить:

* `postgres` — пользователь БД;
* `password` — пароль;
* `localhost` — хост;
* `5432` — порт;
* `cinemaguesser` — имя базы. -->


## 3. Создать общий модуль подключения к БД

<!--
-->


## 4. Проверить, что app-витрина работает

<!-- Если результат больше `0`, значит данные готовы для приложения. -->

## 5. Создать API route для нового раунда

<!-- Файл:

src/app/api/round/route.ts

Задача route:

* взять случайный кадр из `app.v_frames_ready`;
* вернуть данные для фронта;
* не возвращать `frame_timestamp_seconds`. -->



## 6. Создать API route для проверки ответа

<!-- Задача route:

* принять `frameId`;
* принять выбранный пользователем таймкод;
* достать настоящий `frame_timestamp_seconds`;
* посчитать ошибку;
* вернуть результат. -->

## 7. Решить вопрос с путями к картинкам


## 8. Подключить фронт к API

В `page.tsx` заменить локальный mock-датасет на запросы:

```ts
fetch("/api/round")
```

и после ответа пользователя:

```ts
fetch("/api/guess")
```

---

## 9. Проверить полный игровой цикл

Минимальная проверка:

1. Запустить PostgreSQL.
2. Запустить Next.js:

```bash
npm run dev
```

3. Открыть приложение.
4. Получить случайный кадр.
5. Сделать guess.
6. Получить score.
7. Перейти к следующему кадру.

---

## 10. После успешной проверки

Зафиксировать рабочую точку:

```bash
git add .
git commit -m "Connect app to PostgreSQL frames data"
```

```
```

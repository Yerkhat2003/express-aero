# erp.aero — тестовое задание

Это REST сервис на Express: логин по JWT, файлы в MinIO, юзеры в MySQL. Всё поднимается через Docker, руками почти ничего крутить не надо.

**Как завести.** Скопируй `.env.example` в `.env`. Потом в корне проекта:

```bash
docker compose up --build
```

Поднимется API на http://localhost:3000. 
Жить проще всего через Swagger: http://localhost:3000/api-docs — там же можно жать «Try it out» и не мучиться с curl. 
Сырой OpenAPI лежит на http://localhost:3000/openapi.json.

**Файлы.** Заливка — `POST /file/upload`, в форме поле называется `file`. Не JSON, а multipart, иначе не залетит.

## Роуты

| Метод | Путь | Кто пускает |
|--------|------|-------------|
| GET | `/health` | все |
| POST | `/signup` | все |
| POST | `/signin` | все |
| POST | `/signin/new_token` | все, в теле `refresh_token` |
| GET | `/info` | Bearer |
| GET | `/logout` | Bearer |
| POST | `/file/upload` | Bearer, multipart, поле `file` |
| GET | `/file/list` | Bearer, опционально `page` и `list_size` (дефолт 1 и 10) |
| GET | `/file/:id` | Bearer |
| GET | `/file/download/:id` | Bearer |
| PUT | `/file/update/:id` | Bearer, снова `file` в форме |
| DELETE | `/file/delete/:id` | Bearer |


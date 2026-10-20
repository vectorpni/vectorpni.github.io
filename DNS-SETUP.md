# Подключение aerofiberpni.com

Статус на момент настройки: pending. Создание привязки в Sites не регистрирует и не покупает домен.

Добавьте у DNS-провайдера:

| Тип | Полное имя | Значение |
| --- | --- | --- |
| A | aerofiberpni.com | 162.159.143.30 |
| A | aerofiberpni.com | 172.66.3.26 |
| TXT | _openai-site-verification.aerofiberpni.com | openai-site-verification=A5oeimmpxM0ViA-cc8vDPmXax2xKm-Bg6U0gAGeRmZ0 |
| TXT | _cf-custom-hostname.aerofiberpni.com | 8591aee9-b900-4bd3-b19f-74f9575e90d7 |

Для корневой записи провайдер может использовать @, для TXT — только префикс без имени домена. TTL: Auto или стандартное значение провайдера. После изменения DNS необходимо повторно проверить домен в Sites. До активного статуса и выпуска SSL адрес .com не считается подключённым.

Текущий публичный адрес: https://aerofiber-af18-explorer.deepsnail512.chatgpt.site

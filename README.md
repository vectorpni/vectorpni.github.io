# AEROFIBER / AF-18

React + Vite + Three.js. Центральная интерактивная 3D-реконструкция по изображению пользователя. Геометрия условная, не CAD.

Запуск: start.cmd или npm run dev -- --port 5174
Сборка: npm run build

Перетаскивание вращает модель, колесо приближает. Нажатие на геометрию открывает паспорт с отдельной вращаемой моделью, объяснениями, параметрами и источниками. Кнопка с кубом открывает переходы по всем 16 компонентам. «Разобрать» разносит внутренние слои.

Исследование: knowledge.js. Проверено 21.10.2026. Использованы первоисточники Raspberry Pi, Matek, T-MOTOR, Hobbywing, Pololu, RadioMaster, Tattu, Amass, ISDT и документация ArduPilot. Ссылки и область применимости находятся в каждом паспорте. Исходная таблица хранится отдельно от подтверждённых данных и примеров. Пример конкретной модели не считается установленным компонентом. Для AF-18-CFST официальный паспорт не найден. Ревизия H743-SLIM не определена.

Проверка Firefox (из родительской папки, при работающем сервере):
playwright-cli -s=drone open http://127.0.0.1:5174 --browser=firefox
playwright-cli -s=drone run-code --filename=drone-lab/qa-v3.js

Скриншоты: knowledge-desktop.png, knowledge-specs.png, knowledge-mobile.png, knowledge-model.png, knowledge-exploded.png.

Публикация управляется Sites; .openai/hosting.json содержит идентификатор существующего публичного сайта.

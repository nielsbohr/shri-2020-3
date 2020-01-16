# Ошибки

- Для первоначального дебага использовал вкладку output у vs code. Туда выбрасываются все ошибки компиляции. Далее гулял по стекрейсам, удалял баги. Многие ошибки были явными и понятными. Но были также и скрытые, наример отправка в диагностику массива ошибок. Не очевидно, что если ошибок нет, то надо отправлять пустой массив. Иначе ошибки в редакторе могут быть исправлены, но продолжают подсвечиваться. Наткнулся на это путем ручной проверки.

- Большинство ошибок закомментировано в коде. Удалены два лишних файла: `jsonMain.ts` и `hash.ts`. По всей видимости, это что-то из исходников vs-code. Нам, естественно, это не нужно. Добавлен файл нового линтера по адресу: `./src/js/linter.js`. И превью ассеты в `./preview/style.css` и `./preview/build.js`

- Cинтаксические ошибки (пропущенные точки с запятой и т.д.) починены прогоном через tslint.

- Добавлен проперти `allowJs: true` в `tsconfig.json` и в исключения фолдер `out`, иначе происходит зацикливание компиляции.
# GN FinTrust

Сайт вебинаров, семинаров и курсов по финансам и бухгалтерии.

Сайт: https://fintrust.dev

Made by [losdek](https://github.com/tipilek2020-ai).

Вопросы — через WhatsApp, Telegram или почту, контакты на сайте.

## Настройка админки

Сайт статический (GitHub Pages публикует ветку `main`), а аккаунты, каталог и заявки
хранятся в Firebase, проект `fintrust-af741`. Всё ниже делается один раз в
[консоли Firebase](https://console.firebase.google.com/project/fintrust-af741).

### 1. Ключи Firebase

Ключи уже вписаны в `firebase-config.js`. Если проект Firebase когда-нибудь сменится:
Project settings → General → Your apps → Web app → скопируйте `firebaseConfig`
в `firebase-config.js`. Эти ключи не секретные — данные защищают правила из шага 3.

### 2. Вход на сайт

1. Authentication → Sign-in method → включите **Email/Password** и **Google**.
2. Authentication → Settings → Authorized domains → добавьте `fintrust.dev`
   (и `gnfintrust.github.io`, если пользуетесь старым адресом).

### 3. Правила безопасности

Правила лежат в файле [`firestore.rules`](firestore.rules). Без них любой посетитель
может прочитать заявки и данные покупателей или выдать себе доступ.

1. Firestore Database → Rules.
2. Замените весь текст содержимым `firestore.rules` и нажмите **Publish**.

Или из терминала: `npx firebase-tools deploy --only firestore:rules --project fintrust-af741`.

Что разрешают правила:

- каталог (`products`) и настройки (`settings`) видят все, меняет только админ;
- заявку (`orders`) может оставить любой посетитель, читает и закрывает только админ;
- записаться на встречу (`meetings`, страница «Запись на встречу») может любой посетитель,
  видит и подтверждает записи только админ (вкладка «Встречи» в админке);
- занятое время (`busy`) видят все — там только день и час, без имён и контактов.
  Так одно время нельзя занять дважды; при удалении записи в админке время освобождается;
- покупатель видит только свой профиль и только купленные материалы (`productContent`);
- сам себе пользователь может только привязать Instagram для акции и тратить свои
  токены GN Tools; выдать покупку, токены или права админа может только админ.

После каждой правки `firestore.rules` публикуйте его заново.

### 4. Первый админ

Админом считается аккаунт, у которого в профиле стоит `admin: true`. Первого админа
нужно назначить вручную:

1. Зайдите на https://fintrust.dev/login.html и войдите (почта или Google) —
   так создастся ваш профиль.
2. Firestore Database → Data → коллекция `users` → документ с вашим UID
   (UID есть в Authentication → Users).
3. Поменяйте поле `admin` на `true` (тип boolean).
4. Откройте https://fintrust.dev/admin.html.

Следующих админов назначайте прямо в админке: «Аккаунты» → «Сделать админом».

### 5. Наполнить сайт

В админке:

- **Каталог** — добавьте материалы с ценой; без них страница покупки пишет, что каталог пуст.
- **Номера для оплаты** и **QR-коды** — куда покупатели переводят деньги.
- **GN Tools** — пакеты токенов и цены.

### GN Tools

Программа скачивается из [релиза `gntools`](https://github.com/GNFinTrust/GNFinTrust.github.io/releases/tag/gntools)
на GitHub, а не из файлов в репозитории. Чтобы выпустить новую версию:

1. Соберите `GNTools.exe` и `GNTools-client.zip` (`build_exe.bat` на Windows).
2. В релизе `gntools` замените оба файла новыми (Edit → удалить старые → загрузить новые,
   имена те же).
3. Обновите SHA-256 в `GNTools.exe.sha256` и в `gntools.html` (`certutil -hashfile GNTools.exe SHA256`).

Большие файлы (`.exe`, `.zip`) в репозиторий не коммитьте — только в релиз.

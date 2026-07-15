# GN FinTrust — сайт вебинаров, семинаров и курсов

Одна оплата — доступ навсегда. Без подписок. Цвета: красный и белый.

## Файлы

| Файл | Зачем |
|---|---|
| `index.html` | Главная: 3 блока (вебинары / семинары / курсы) с видео-анонсами, описаниями и кнопкой «Купить» |
| `buy.html` | Оплата: по номеру или по QR-коду; покупатель выбирает WhatsApp / почту / Telegram |
| `login.html` | Вход (Google или почта + пароль) |
| `members.html` | Кабинет покупателя: только купленные материалы (полные видео + текст) |
| `admin.html` | Админ-панель: заявки, каталог, способы оплаты, создание аккаунтов |
| `catalog.js` | Демо-каталог и демо-реквизиты (пока не настроен Firebase) |
| `firebase-config.js` | Сюда вставляются ключи Firebase |

## Шаг 1. Подключите Firebase (бесплатно)

1. Зайдите на [console.firebase.google.com](https://console.firebase.google.com) и создайте проект.
2. **Authentication → Sign-in method**: включите **Email/Password** и **Google**.
3. **Firestore Database**: создайте базу (production mode).
4. **Project settings → Your apps → Web**: скопируйте конфиг и вставьте значения в `firebase-config.js`.
5. Если сайт на своём домене — добавьте его в **Authentication → Settings → Authorized domains**.

## Шаг 2. Сделайте себя админом

1. Откройте `login.html` и зарегистрируйтесь (или войдите через Google).
2. В консоли Firebase откройте **Firestore → коллекция `users`** → найдите свой документ (по почте).
3. Поменяйте поле `admin` с `false` на `true`.
4. Откройте `admin.html` — панель доступна.

## Шаг 3. Правила безопасности Firestore

**Firestore → Rules** — вставьте и опубликуйте:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.admin == true;
    }
    match /users/{uid} {
      allow read: if request.auth != null && (request.auth.uid == uid || isAdmin());
      allow create: if request.auth != null && request.auth.uid == uid
        && request.resource.data.admin == false;
      allow update, delete: if isAdmin();
    }
    match /products/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /settings/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /productContent/{id} {
      allow read: if isAdmin() || (request.auth != null &&
        id in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.purchases);
      allow write: if isAdmin();
    }
    match /orders/{id} {
      allow create: if true;
      allow read, update, delete: if isAdmin();
    }
  }
}
```

Что это даёт:
- Полные видео и материалы (`productContent`) видят только те, кто купил.
- Каталог и реквизиты видны всем, меняют их только админы.
- Никто не может сам выдать себе покупки или права админа.
- Заявки (`orders`) может создать любой посетитель (чтобы кнопка «Я оплатил» работала без регистрации). Возможен спам — просто удаляйте мусор во вкладке «Заявки».

## Как работает продажа

1. Покупатель нажимает «Купить», платит по номеру или QR-коду и оставляет контакт (WhatsApp / почта / Telegram).
2. Заявка появляется в админ-панели → вкладка «Заявки».
3. Вы проверяете, что деньги пришли, и во вкладке «Аккаунты» создаёте аккаунт: почта-логин, сгенерированный пароль, галочки купленных материалов.
4. Появится готовое сообщение с логином и паролем — один клик, и оно откроется в WhatsApp или почте (для Telegram — скопируйте и вставьте). Сайт не может отправлять сообщения сам — это ограничение WhatsApp/Telegram, а не сайта.
5. Покупатель входит в «Мой кабинет» и видит свои покупки.

База данных со всеми аккаунтами и покупками — это коллекция `users` в Firestore (видна и во вкладке «Аккаунты» админ-панели).

## Про Google Диск (ваши 5 ТБ)

### Диск = хранилище видео и картинок, не база данных

Google Диск **не может быть базой ��анных** для аккаунтов и покупок. Почему:
- Диск не проверяет пароли и не знает, кто что купил.
- База данных (Firebase Firestore) нужна, чтобы при входе покупатель видел только свои материалы, а админ — все заявки и аккаунты.

Поэтому **Firestore** хранит: пользователей, их покупки, заявки, каталог и цены. А **Google Диск** — это ваше бесплатное видеохранилище на 5 ТБ.

### Как добавить видео с Диска

1. Загрузите видео на [drive.google.com](https://drive.google.com).
2. Правой кнопкой по файлу → **Поделиться** → **Все, у кого есть ссылка** (можно читать).
3. Откройте файл в новой вкладке. В адресной строке будет ссылка вида:
   `https://drive.google.com/file/d/1ABC123def456/view`
4. Возьмите `1ABC123def456` — это FILE_ID.
5. В админ-панели (вкладка «Каталог») вставьте:
   `https://drive.google.com/file/d/1ABC123def456/preview`

То же для картинок QR-кодов:
`https://drive.google.com/thumbnail?id=1ABC123def456&sz=w600`

### Важно про безопасность видео

Ссылка `/preview` технически доступна любому, у кого она есть. Сайт показывает её только покупателям, но человек может переслать её другу. Для старта и небольших курсов этого достаточно. Для максимальной защиты позже можно переехать на Vimeo/YouTube с ограничением по домену.

## Как опубликовать сайт в интернете (GitHub Pages, бесплатно)

GitHub Pages — это бесплатный хостинг для сайтов. Ваши файлы будут лежать на GitHub, а сайт открываться в интернете.

### 1. Создайте аккаунт GitHub
- Зайдите на [github.com](https://github.com) и зарегистрируйтесь (если ещё нет).
- Подтвердите почту.

### 2. Создайте репозиторий (папку проекта)
- Нажмите **New repository** (зелёная кнопка +).
- Название: `GNFinTrust.github.io` (уже так называется ваш репозиторий).
- Оставьте **Public** (открытый) — GitHub Pages бесплатен только для открытых репозиториев.
- Нажмите **Create repository**.

### 3. Загрузите файлы
- Внутри нового репозитория нажмите **uploading an existing file**.
- Перетащите файлы из архива: `index.html`, `buy.html`, `login.html`, `members.html`, `admin.html`, `catalog.js`, `firebase-config.js`, `README.md`.
- Прокрутите вниз и нажмите **Commit changes**.

### 4. Включите GitHub Pages
- В репозитории перейдите в **Settings** (вкладка сверху).
- Слева выберите **Pages**.
- В разделе **Build and deployment** → **Source** выберите **Deploy from a branch**.
- Ветка: **main**, папка: **/(root)**.
- Нажмите **Save**.
- Через 30–60 секунд сайт будет доступен по адресу:
  `https://GNFinTrust.github.io/`

### 5. Подключите домен к Firebase
- Скопируйте адрес из шага 4.
- В Firebase Console: **Authentication → Settings → Authorized domains** → **Add domain** → вставьте `GNFinTrust.github.io` (или ваш кастомный домен, если купите).

### 6. Проверьте
- Откройте сайт в браузере. Главная должна работать.
- Чтобы проверить админ-панель, сначала зарегистрируйтесь через `login.html`, затем вручную поставьте `admin: true` в Firestore (см. шаг 2 «Сделайте себя админом»), и откройте `admin.html`.

### Если что-то не обновляется
GitHub Pages иногда кеширует страницы. Нажмите **Ctrl+F5** (или Ctrl+Shift+R) для жёсткого обновления.

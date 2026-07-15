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

Диск **не может быть базой данных** (он хранит файлы, а не проверяет пароли и покупки), но он идеален как видеохранилище:

- **Видео**: загрузите на Диск → «Поделиться» → «Все, у кого есть ссылка» → вставьте в админ-панель ссылку вида:
  `https://drive.google.com/file/d/FILE_ID/preview`
- **Картинки QR-кодов**: `https://drive.google.com/thumbnail?id=FILE_ID&sz=w600`

Важно: прямая ссылка на видео с Диска технически доступна любому, у кого она есть. Сайт показывает ссылки только покупателям, но переслать ссылку другу они могут. Для старта этого достаточно.

## Как опубликовать сайт (GitHub Pages)

1. Создайте репозиторий на github.com.
2. Загрузите туда все файлы из архива (Add file → Upload files).
3. Settings → Pages → Branch: `main` → Save.
4. Через минуту сайт будет на `https://ВАШ_ЛОГИН.github.io/ИМЯ_РЕПОЗИТОРИЯ/`.
5. Добавьте этот адрес в Authorized domains в Firebase (шаг 1.5).

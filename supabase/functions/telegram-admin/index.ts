// version 2.6
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const telegramAdminChatId = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") ?? "";
const telegramAdminUserId = Deno.env.get("TELEGRAM_ADMIN_USER_ID") ?? "";
const telegramWebhookSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const registrationWebhookSecret = Deno.env.get("REGISTRATION_WEBHOOK_SECRET") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

function getSupabaseSecretKey() {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      if (parsed.default) return parsed.default;
    } catch {}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

const supabaseSecretKey = getSupabaseSecretKey();

function getAdminClient() {
  if (!supabaseUrl || !supabaseSecretKey) return null;
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {autoRefreshToken: false, persistSession: false},
  });
}

async function telegram(method: string, body: Record<string, unknown>) {
  if (!telegramToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  const response = await fetch("https://api.telegram.org/bot" + telegramToken + "/" + method, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });
  const responseText = await response.text();
  let responseBody: unknown = responseText;
  try { responseBody = JSON.parse(responseText); } catch {}
  if (!response.ok) throw new Error("Telegram API returned " + response.status + ": " + JSON.stringify(responseBody));
  return typeof responseBody === "string" ? JSON.parse(responseBody) : responseBody;
}

async function reply(chatId: number | string, text: string, showKeyboard = false, inlineKeyboard?: Array<Array<{text: string; callback_data: string}>>) {
  const replyMarkup = inlineKeyboard
    ? {inline_keyboard: inlineKeyboard}
    : showKeyboard
      ? {
          keyboard: [[{text: "⚙️ Меню администрирования"}]],
          resize_keyboard: true,
          is_persistent: true,
        }
      : undefined;

  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    ...(replyMarkup ? {reply_markup: replyMarkup} : {}),
  });
}

function formatMoscow(value: string | undefined) {
  if (!value) return "неизвестно";
  return new Date(value).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    dateStyle: "short",
    timeStyle: "medium",
  }) + " MSK";
}

const commandDescriptions = [
  ["/start", "открыть панель LifeGame Admin Bot"],
  ["/status", "мониторинг Database, Telegram API, пользователей и безопасности"],
  ["/help", "показать список команд и их назначение"],
] as const;

function adminMenuKeyboard() {
  return [
    [{text: "👥 Пользователи", callback_data: "admin:users"}],
    [{text: "🔐 Безопасность", callback_data: "admin:security"}],
    [{text: "📊 Аналитика", callback_data: "admin:analytics"}],
    [{text: "🖥 Система", callback_data: "admin:system"}],
    [{text: "🔔 Уведомления", callback_data: "admin:notifications"}],
    [{text: "ℹ️ О боте", callback_data: "admin:about"}],
  ];
}

function adminSectionKeyboard() {
  return [[{text: "⬅️ Назад в меню", callback_data: "admin:menu"}]];
}

function usersMenuKeyboard() {
  return [
    [{text: "📊 Сводка", callback_data: "users:summary"}],
    [{text: "🕘 Последние регистрации", callback_data: "users:recent:0"}],
    [{text: "🔎 Поиск пользователя", callback_data: "users:search"}],
    [{text: "⬅️ Назад в меню", callback_data: "admin:menu"}],
  ];
}

function recentUsersKeyboard(offset: number, hasNext: boolean) {
  const rows: Array<Array<{text: string; callback_data: string}>> = [];
  if (offset > 0) rows.push([{text: "⬅️ Назад", callback_data: "users:recent:" + Math.max(0, offset - 5)}]);
  if (hasNext) rows.push([{text: "Дальше ➡️", callback_data: "users:recent:" + (offset + 5)}]);
  rows.push([{text: "👥 Меню пользователей", callback_data: "admin:users"}]);
  return rows;
}

function userDetailKeyboard(userId: string) {
  return [[
    {text: "⬅️ К пользователям", callback_data: "admin:users"},
  ], [
    {text: "🔎 Найти другого", callback_data: "users:search"},
  ]];
}

async function getUserSummary() {
  const admin = getAdminClient();
  if (!admin) return null;
  const now = Date.now();
  const periods = [
    ["24h", 24 * 60 * 60 * 1000],
    ["7d", 7 * 24 * 60 * 60 * 1000],
    ["30d", 30 * 24 * 60 * 60 * 1000],
  ] as const;
  const total = await admin.from("profiles").select("id", {count: "exact", head: true});
  const counts = await Promise.all(periods.map(async ([, ms]) => {
    const result = await admin.from("profiles").select("id", {count: "exact", head: true})
      .gte("created_at", new Date(now - ms).toISOString());
    return result.error ? null : result.count;
  }));
  return {
    total: total.error ? null : total.count,
    last24h: counts[0],
    last7d: counts[1],
    last30d: counts[2],
  };
}

async function getRecentUsers(offset: number) {
  const admin = getAdminClient();
  if (!admin) return null;
  const {data, error} = await admin.from("profiles")
    .select("id, display_name, created_at")
    .order("created_at", {ascending: false})
    .range(offset, offset + 5);
  if (error) return null;
  return {users: data ?? [], hasNext: (data ?? []).length === 6};
}

async function findUsers(query: string) {
  const admin = getAdminClient();
  if (!admin) return [];
  const trimmed = query.trim();
  if (!trimmed) return [];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    const {data} = await admin.from("profiles").select("id, display_name, created_at").eq("id", trimmed).limit(1);
    return data ?? [];
  }
  const {data} = await admin.from("profiles")
    .select("id, display_name, created_at")
    .ilike("display_name", "%" + trimmed.replace(/[%_]/g, "") + "%")
    .order("created_at", {ascending: false})
    .limit(5);
  return data ?? [];
}

function formatUserLine(user: Record<string, unknown>, index?: number) {
  const prefix = typeof index === "number" ? (index + 1) + ". " : "";
  const name = typeof user.display_name === "string" && user.display_name.trim()
    ? user.display_name.trim()
    : "Без имени";
  const created = typeof user.created_at === "string" ? formatMoscow(user.created_at) : "неизвестно";
  return prefix + name + "\\n" + "ID: " + String(user.id) + "\\n" + "Регистрация: " + created;
}

async function renderUsersSummary(chatId: string) {
  const summary = await getUserSummary();
  if (!summary) {
    await reply(chatId, "👥 Пользователи\\n\\n🔴 Database недоступна.", false, usersMenuKeyboard());
    return;
  }
  await reply(chatId,
    "👥 Пользователи\\n\\n" +
    "Всего: " + (summary.total ?? "н/д") + "\\n" +
    "За 24 часа: +" + (summary.last24h ?? "н/д") + "\\n" +
    "За 7 дней: +" + (summary.last7d ?? "н/д") + "\\n" +
    "За 30 дней: +" + (summary.last30d ?? "н/д"),
    false,
    usersMenuKeyboard()
  );
}

async function renderRecentUsers(chatId: string, offset: number) {
  const result = await getRecentUsers(offset);
  if (!result) {
    await reply(chatId, "👥 Пользователи\\n\\n🔴 Database недоступна.", false, usersMenuKeyboard());
    return;
  }
  if (!result.users.length) {
    await reply(chatId, "🕘 Последние регистрации\\n\\nБольше регистраций нет.", false, recentUsersKeyboard(offset, false));
    return;
  }
  const text = result.users.map((user, index) => formatUserLine(user as Record<string, unknown>, index)).join("\\n\\n");
  const userButtons = result.users.map((user) => [{
    text: "👤 " + (user.display_name?.trim() || "Без имени"),
    callback_data: "user:view:" + String(user.id),
  }]);
  const navigation = recentUsersKeyboard(offset, result.hasNext);
  await reply(chatId, "🕘 Последние регистрации\\n\\n" + text, false, [...userButtons, ...navigation]);
}

async function renderUserDetails(chatId: string, userId: string) {
  const admin = getAdminClient();
  if (!admin) {
    await reply(chatId, "👤 Пользователь\\n\\n🔴 Database недоступна.", false, userDetailKeyboard(userId));
    return;
  }
  const {data: profile, error} = await admin.from("profiles")
    .select("id, display_name, birth_date, created_at, updated_at")
    .eq("id", userId).maybeSingle();
  if (error || !profile) {
    await reply(chatId, "👤 Пользователь\\n\\nПользователь не найден.", false, userDetailKeyboard(userId));
    return;
  }

  let authStatus = "неизвестен";
  try {
    const authResult = await admin.auth.admin.getUserById(userId);
    const authUser = authResult.data.user;
    if (authUser) {
      authStatus = authUser.banned_until && new Date(authUser.banned_until).getTime() > Date.now()
        ? "заблокирован"
        : "активен";
    }
  } catch {}

  const name = profile.display_name?.trim() || "Без имени";
  await reply(chatId,
    "👤 Пользователь\\n\\n" +
    "Имя: " + name + "\\n" +
    "ID: " + profile.id + "\\n" +
    "Статус: " + authStatus + "\\n" +
    "Регистрация: " + formatMoscow(profile.created_at) + "\\n" +
    "Изменён: " + formatMoscow(profile.updated_at) + "\\n" +
    "Дата рождения: " + (profile.birth_date ?? "не указана"),
    false,
    userDetailKeyboard(userId)
  );
}

function adminSectionText(section: string) {
  const sections: Record<string, string> = {
    users: "👥 Пользователи\\n\\nВыберите действие:",
    security: "🔐 Безопасность\\n\\nРаздел подготовлен для событий безопасности, неудачных попыток авторизации и подозрительной активности.",
    analytics: "📊 Аналитика\\n\\nРаздел подготовлен для DAU, WAU, MAU, регистраций, retention и динамики продукта.",
    system: "🖥 Система\\n\\nРаздел подготовлен для состояния Database, Edge Functions, Telegram API, latency и ошибок.",
    notifications: "🔔 Уведомления\\n\\nРаздел подготовлен для критических событий, порогов и настроек уведомлений.",
    about: "ℹ️ О боте\\n\\nLifeGame Admin Bot\\nВерсия: 2.5\\n\\nАдминистративный интерфейс LifeGame.",
  };
  return sections[section] ?? "Раздел не найден.";
}

async function handleCallbackQuery(update: Record<string, unknown>, request: Request) {
  const headerSecret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!telegramWebhookSecret || headerSecret !== telegramWebhookSecret) {
    return new Response("Unauthorized", {status: 401});
  }

  const callbackQuery = update.callback_query as Record<string, unknown> | undefined;
  const callbackData = typeof callbackQuery?.data === "string" ? callbackQuery.data : "";
  const callbackId = typeof callbackQuery?.id === "string" ? callbackQuery.id : "";
  const callbackMessage = callbackQuery?.message as Record<string, unknown> | undefined;
  const callbackChat = callbackMessage?.chat as Record<string, unknown> | undefined;
  const chatId = callbackChat?.id;
  const callbackFrom = callbackQuery?.from as Record<string, unknown> | undefined;
  const callbackUserId = callbackFrom?.id;

  if (callbackId) {
    try {
      await telegram("answerCallbackQuery", {callback_query_id: callbackId});
    } catch (error) {
      console.error("Failed to answer callback query:", error);
    }
  }

  if (!chatId || String(chatId) !== telegramAdminChatId) {
    return new Response("ok", {status: 200});
  }

  if (telegramAdminUserId && String(callbackUserId ?? "") !== telegramAdminUserId) {
    return new Response("ok", {status: 200});
  }

  if (!telegramAdminUserId && String(callbackChat?.type ?? "") === "private" &&
      String(callbackUserId ?? "") !== telegramAdminChatId) {
    return new Response("ok", {status: 200});
  }

  console.log("Admin callback:", JSON.stringify({
    callbackData,
    chatId: String(chatId),
    userId: String(callbackUserId ?? ""),
  }));

  if (callbackData === "admin:menu") {
    await reply(chatId, "⚙️ Меню администрирования\\n\\nВыберите раздел:", false, adminMenuKeyboard());
    return new Response("ok", {status: 200});
  }

  if (callbackData === "admin:users") {
    await reply(chatId, adminSectionText("users"), false, usersMenuKeyboard());
    return new Response("ok", {status: 200});
  }

  if (callbackData === "users:summary") {
    await renderUsersSummary(String(chatId));
    return new Response("ok", {status: 200});
  }

  if (callbackData.startsWith("users:recent:")) {
    const offset = Math.max(0, Number(callbackData.split(":")[2]) || 0);
    await renderRecentUsers(String(chatId), offset);
    return new Response("ok", {status: 200});
  }

  if (callbackData === "users:search") {
    await reply(chatId,
      "🔎 Поиск пользователя\\n\\n" +
      "Используй команду:\\n" +
      "/user <имя или UUID>",
      false,
      usersMenuKeyboard()
    );
    return new Response("ok", {status: 200});
  }

  if (callbackData.startsWith("user:view:")) {
    const userId = callbackData.slice("user:view:".length);
    await renderUserDetails(String(chatId), userId);
    return new Response("ok", {status: 200});
  }

  if (callbackData.startsWith("admin:")) {
    const section = callbackData.slice("admin:".length);
    await reply(chatId, adminSectionText(section), false, adminSectionKeyboard());
    return new Response("ok", {status: 200});
  }

  return new Response("ok", {status: 200});
}

function formatCommandList() {
  return commandDescriptions.map(([command, description]) => command + " — " + description).join("\n");
}

async function handleTelegramUpdate(update: Record<string, unknown>, request: Request) {
  const headerSecret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!telegramWebhookSecret || headerSecret !== telegramWebhookSecret) {
    return new Response("Unauthorized", {status: 401});
  }

  if (update.callback_query) return await handleCallbackQuery(update, request);

  const message = update.message as Record<string, unknown> | undefined;
  const chat = message?.chat as Record<string, unknown> | undefined;
  const text = typeof message?.text === "string" ? message.text.trim() : "";
  if (!chat?.id || !text) return new Response("ok", {status: 200});

  const chatId = String(chat.id);

  if (!telegramAdminChatId) {
    await reply(chatId, "LifeGame Admin Bot\n\nChat ID: " + chatId + "\n\nBootstrap mode: set TELEGRAM_ADMIN_CHAT_ID to authorize this chat.");
    return new Response("ok", {status: 200});
  }

  if (chatId !== telegramAdminChatId) {
    await reply(chatId, "Доступ запрещён.");
    return new Response("ok", {status: 200});
  }

  if (text === "/start") {
    await reply(chatId,
      "🎮 LifeGame Admin Bot\n\n" +
      "🟢 Бот активен\n" +
      "🔔 Регистрации подключены\n\n" +
      "Меню администрирования:\n" +
      formatCommandList(),
      true
    );
    return new Response("ok", {status: 200});
  }

  if (text === "⚙️ Меню администрирования") {
    await reply(chatId,
      "🎮 LifeGame Admin\n\n" +
      "⚙️ Меню администрирования\n\n" +
      "Выберите раздел:",
      false,
      adminMenuKeyboard()
    );
    return new Response("ok", {status: 200});
  }

  if (text === "/help") {
    await reply(chatId,
      "🎮 LifeGame Admin\n\n" +
      "Меню администрирования:\n" +
      formatCommandList() +
      "\n\n" +
      "Автоматически:\n" +
      "• новые регистрации\n" +
      "• security events",
      true
    );
    return new Response("ok", {status: 200});
  }

  if (text.startsWith("/user")) {
    const query = text.slice("/user".length).trim();
    if (!query) {
      await reply(chatId, "🔎 Поиск пользователя\\n\\nУкажи имя или UUID.\\nПример: /user Bogdan", false, usersMenuKeyboard());
      return new Response("ok", {status: 200});
    }
    const users = await findUsers(query);
    if (!users.length) {
      await reply(chatId, "🔎 Поиск пользователя\\n\\nНичего не найдено.", false, usersMenuKeyboard());
      return new Response("ok", {status: 200});
    }
    const keyboard = users.map((user) => [{
      text: (user.display_name?.trim() || "Без имени") + " · " + String(user.id).slice(0, 8),
      callback_data: "user:view:" + String(user.id),
    }]);
    keyboard.push([{text: "👥 Меню пользователей", callback_data: "admin:users"}]);
    await reply(chatId, "🔎 Результаты поиска\\n\\nНайдено: " + users.length + "\\n\\nВыберите пользователя:", false, keyboard);
    return new Response("ok", {status: 200});
  }

  if (text === "/status") {
    const admin = getAdminClient();
    let databaseStatus = "🔴 недоступна";
    let databaseLatency = "н/д";
    let totalUsers = "н/д";
    let newUsers24h = "н/д";
    let securityEvents24h = "н/д";
    let authenticationFailures24h = "н/д";
    let securityNamespaceEvents24h = "н/д";

    if (admin) {
      const databaseStartedAt = Date.now();
      const profileResult = await admin.from("profiles").select("id", {count: "exact", head: true});
      databaseLatency = String(Date.now() - databaseStartedAt) + " ms";

      if (!profileResult.error) {
        databaseStatus = "🟢 доступна";
        if (typeof profileResult.count === "number") totalUsers = String(profileResult.count);
      }

      const newUsersResult = await admin
        .from("profiles")
        .select("id", {count: "exact", head: true})
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!newUsersResult.error && typeof newUsersResult.count === "number") {
        newUsers24h = String(newUsersResult.count);
      }

      const securityResult = await admin.rpc("lifegame_admin_monitoring_24h");
      if (!securityResult.error && securityResult.data && typeof securityResult.data === "object") {
        const monitoring = securityResult.data as Record<string, unknown>;
        if (typeof monitoring.total_24h === "number") securityEvents24h = String(monitoring.total_24h);
        if (typeof monitoring.authentication_failed_24h === "number") {
          authenticationFailures24h = String(monitoring.authentication_failed_24h);
        }
        if (typeof monitoring.security_namespace_24h === "number") {
          securityNamespaceEvents24h = String(monitoring.security_namespace_24h);
        }
      }
    }

    let telegramStatus = "🔴 недоступен";
    let telegramLatency = "н/д";
    try {
      const telegramStartedAt = Date.now();
      const me = await telegram("getMe", {});
      telegramLatency = String(Date.now() - telegramStartedAt) + " ms";
      const ok = Boolean(me && typeof me === "object" && "ok" in me && (me as Record<string, unknown>).ok);
      if (ok) telegramStatus = "🟢 доступен";
    } catch {}

    await reply(chatId,
      "⚙️ LifeGame System Status\n\n" +
      "Database: " + databaseStatus + " · " + databaseLatency + "\n" +
      "Telegram API: " + telegramStatus + " · " + telegramLatency + "\n\n" +
      "👥 Users\n" +
      "Total: " + totalUsers + "\n" +
      "New / 24h: +" + newUsers24h + "\n\n" +
      "🔐 Security / 24h\n" +
      "Events: " + securityEvents24h + "\n" +
      "Auth failures: " + authenticationFailures24h + "\n" +
      "Security namespace: " + securityNamespaceEvents24h + "\n\n" +
      "Проверено: " + formatMoscow(new Date().toISOString())
    );
    return new Response("ok", {status: 200});
  }

  await reply(chatId, "Неизвестная команда. Используй /help.");
  return new Response("ok", {status: 200});
}

async function getRegistrationWebhookSecret() {
  const admin = getAdminClient();
  if (admin) {
    const {data, error} = await admin.rpc("lifegame_registration_webhook_secret");
    if (!error && typeof data === "string" && data) return data;
  }
  return registrationWebhookSecret;
}

async function handleRegistrationWebhook(payload: Record<string, unknown>, request: Request) {
  const registrationHeader = request.headers.get("x-lifegame-webhook-secret") ?? "";
  const expectedRegistrationSecret = await getRegistrationWebhookSecret();
  if (!expectedRegistrationSecret || registrationHeader !== expectedRegistrationSecret) {
    return new Response("Unauthorized", {status: 401});
  }
  if (!telegramAdminChatId) throw new Error("TELEGRAM_ADMIN_CHAT_ID is not configured.");

  const record = payload.record as Record<string, unknown> | undefined;
  const createdAt = typeof record?.created_at === "string"
    ? formatMoscow(record.created_at)
    : "неизвестно";
  let totalUsers = "недоступно";

  const admin = getAdminClient();
  if (admin) {
    const {count, error} = await admin.from("profiles").select("id", {count: "exact", head: true});
    if (!error && typeof count === "number") totalUsers = String(count);
  }

  await reply(telegramAdminChatId,
    "🟢 Новый пользователь\n\n" +
    "Зарегистрирован: " + createdAt + "\n" +
    "Всего пользователей: " + totalUsers
  );
  return new Response("ok", {status: 200});
}

async function handleSecurityEventWebhook(payload: Record<string, unknown>, request: Request) {
  const adminHeader = request.headers.get("x-lifegame-webhook-secret") ?? "";
  const expectedSecret = await getRegistrationWebhookSecret();
  if (!expectedSecret || adminHeader !== expectedSecret) {
    return new Response("Unauthorized", {status: 401});
  }
  if (!telegramAdminChatId) throw new Error("TELEGRAM_ADMIN_CHAT_ID is not configured.");

  const record = payload.record as Record<string, unknown> | undefined;
  const eventType = typeof record?.event_type === "string" ? record.event_type : "unknown";
  const userId = typeof record?.user_id === "string" ? record.user_id : "";
  const shortUserId = userId ? userId.slice(0, 8) : "system";
  const occurredAt = typeof record?.occurred_at === "string" ? formatMoscow(record.occurred_at) : "неизвестно";

  await reply(telegramAdminChatId,
    "⚠️ Security Event\n\n" +
    "Тип: " + eventType + "\n" +
    "Пользователь: " + shortUserId + "\n" +
    "Время: " + occurredAt
  );
  return new Response("ok", {status: 200});
}

async function handleSetup(request: Request) {
  const secretCharacterCheck = /^[A-Za-z0-9_-]+$/.test(telegramWebhookSecret);
  const secretLength = telegramWebhookSecret.length;

  const diagnostics = {
    telegramTokenConfigured: Boolean(telegramToken),
    telegramWebhookSecretConfigured: Boolean(telegramWebhookSecret),
    telegramWebhookSecretValidCharacters: secretCharacterCheck,
    telegramWebhookSecretLength: secretLength,
    registrationWebhookSecretConfigured: Boolean(registrationWebhookSecret),
    adminChatIdConfigured: Boolean(telegramAdminChatId),
    adminUserIdConfigured: Boolean(telegramAdminUserId)
  };
  if (!telegramToken || !telegramWebhookSecret) {
    return new Response(JSON.stringify({status: "configuration_incomplete", ...diagnostics}), {status: 200, headers: {"Content-Type": "application/json"}});
  }

  const webhookUrl = "https://ewwpnahjhqcbtfszthhc.supabase.co/functions/v1/telegram-admin";

  await telegram("setWebhook", {
    url: webhookUrl,
    secret_token: telegramWebhookSecret,
    allowed_updates: ["message", "callback_query"],
  });

  if (telegramAdminChatId) {
    await telegram("setMyCommands", {
      commands: commandDescriptions.map(([command, description]) => ({
        command: command.slice(1),
        description,
      })),
      scope: {
        type: "chat",
        chat_id: Number(telegramAdminChatId),
      },
    });
  }

  return new Response(JSON.stringify({status: "ok", webhookConfigured: true, commandsConfigured: Boolean(telegramAdminChatId)}), {status: 200, headers: {"Content-Type": "application/json"}});
}

async function handleWebhookInfo() {
  const result = await telegram("getWebhookInfo", {});
  const info = result && typeof result === "object" && "result" in result
    ? (result as Record<string, unknown>).result
    : result;
  return new Response(JSON.stringify({status: "ok", webhookInfo: info}), {
    status: 200,
    headers: {"Content-Type": "application/json"},
  });
}

Deno.serve(async (request) => {
  if (request.method === "GET") {
    try {
      if (new URL(request.url).searchParams.get("diagnostic") === "webhook") return await handleWebhookInfo();
      return await handleSetup(request);
    } catch (error) {
      console.error(error);
      return new Response(JSON.stringify({status: "telegram_webhook_setup_failed", error: error instanceof Error ? error.message : String(error)}), {status: 502, headers: {"Content-Type": "application/json"}});
    }
  }

  if (request.method !== "POST") return new Response("Method Not Allowed", {status: 405});

  try {
    const telegramHeader = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
    const registrationHeader = request.headers.get("x-lifegame-webhook-secret") ?? "";
    const payload = await request.json();

    if (telegramWebhookSecret && telegramHeader === telegramWebhookSecret) {
      return await handleTelegramUpdate(payload, request);
    }

    if (registrationHeader) {
      const eventType = typeof payload?.event_type === "string" ? payload.event_type : "";
      if (eventType === "security_event") {
        return await handleSecurityEventWebhook(payload, request);
      }
      return await handleRegistrationWebhook(payload, request);
    }

    return new Response("Unauthorized", {status: 401});
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", {status: 500});
  }
});

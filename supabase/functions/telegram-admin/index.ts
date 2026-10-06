// version 1.8
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const telegramAdminChatId = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") ?? "";
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

async function reply(chatId: number | string, text: string) {
  return telegram("sendMessage", {chat_id: chatId, text});
}

function formatMoscow(value: string | undefined) {
  if (!value) return "неизвестно";
  return new Date(value).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    dateStyle: "short",
    timeStyle: "medium",
  }) + " MSK";
}

async function handleTelegramUpdate(update: Record<string, unknown>, request: Request) {
  const headerSecret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!telegramWebhookSecret || headerSecret !== telegramWebhookSecret) {
    return new Response("Unauthorized", {status: 401});
  }

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
      "Команды:\n" +
      "/status — состояние системы\n" +
      "/help — список команд"
    );
    return new Response("ok", {status: 200});
  }

  if (text === "/help") {
    await reply(chatId,
      "🎮 LifeGame Admin\n\n" +
      "/status — health check основных сервисов\n" +
      "/help — список команд\n\n" +
      "Автоматически:\n" +
      "• новые регистрации\n" +
      "• security events"
    );
    return new Response("ok", {status: 200});
  }

  if (text === "/status") {
    const admin = getAdminClient();
    let databaseStatus = "🔴 недоступна";
    let totalUsers = "н/д";
    let securityEvents24h = "н/д";

    if (admin) {
      const profileResult = await admin.from("profiles").select("id", {count: "exact", head: true});
      if (!profileResult.error) {
        databaseStatus = "🟢 доступна";
        if (typeof profileResult.count === "number") totalUsers = String(profileResult.count);
      }

      const securityResult = await admin
        .schema("private")
        .from("security_events")
        .select("id", {count: "exact", head: true})
        .gte("occurred_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!securityResult.error && typeof securityResult.count === "number") {
        securityEvents24h = String(securityResult.count);
      }
    }

    let telegramStatus = "🔴 недоступен";
    try {
      const me = await telegram("getMe", {});
      const ok = Boolean(me && typeof me === "object" && "ok" in me && (me as Record<string, unknown>).ok);
      if (ok) telegramStatus = "🟢 доступен";
    } catch {}

    await reply(chatId,
      "⚙️ LifeGame System Status\n\n" +
      "Database: " + databaseStatus + "\n" +
      "Telegram API: " + telegramStatus + "\n" +
      "Users: " + totalUsers + "\n" +
      "Security events / 24h: " + securityEvents24h + "\n\n" +
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
    adminChatIdConfigured: Boolean(telegramAdminChatId)
  };
  if (!telegramToken || !telegramWebhookSecret) {
    return new Response(JSON.stringify({status: "configuration_incomplete", ...diagnostics}), {status: 200, headers: {"Content-Type": "application/json"}});
  }

  const webhookUrl = "https://ewwpnahjhqcbtfszthhc.supabase.co/functions/v1/telegram-admin";

  await telegram("setWebhook", {
    url: webhookUrl,
    secret_token: telegramWebhookSecret,
    allowed_updates: ["message"],
  });

  return new Response(JSON.stringify({status: "ok", webhookConfigured: true}), {status: 200, headers: {"Content-Type": "application/json"}});
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
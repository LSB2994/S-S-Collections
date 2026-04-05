export async function sendAdminAlert(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(",") || [];

  if (!token || adminIds.length === 0) return;

  for (const adminId of adminIds) {
    const chatId = adminId.trim();
    if (!chatId) continue;

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      });
    } catch (e) {
      console.error("Failed to send admin alert to", chatId, e);
    }
  }
}

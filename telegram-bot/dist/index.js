import { env } from "./env.js";
import { createBot } from "./bot.js";
import { createServer } from "./server.js";
async function main() {
    const app = createServer();
    app.listen(env.PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`HTTP server on ${env.PUBLIC_BASE_URL} (port ${env.PORT})`);
    });
    const bot = createBot();
    await bot.launch();
    // eslint-disable-next-line no-console
    console.log("Telegram bot started");
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});

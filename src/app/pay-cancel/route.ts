export const runtime = "nodejs";

export async function GET() {
  return new Response("Payment cancelled. You can return to Telegram.", {
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}


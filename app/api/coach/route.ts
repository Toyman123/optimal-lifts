import Anthropic from "@anthropic-ai/sdk";

/**
 * Optional coaching endpoint. Everything else in this app runs client-side on
 * localStorage; this is the one feature that needs a server and a paid API
 * key, so it stays dormant unless ANTHROPIC_API_KEY is set. Without a key the
 * client hides the panel entirely and the rest of the app is unaffected.
 *
 * SECURITY: there is no auth here. That is fine for the intended use — the
 * server runs on your own machine and is reachable only over your LAN. If you
 * ever deploy this publicly, put auth or a rate limit in front of it first:
 * every request spends money from your account.
 */

const MODEL = "claude-opus-5";

const SYSTEM = `You are a strength-training assistant inside a personal workout logger called OptimalLifts.

You are given the lifter's own training history and asked a question about it. Ground every claim in the numbers you were given — cite specific dates, loads, and rep counts. If the history is too short or too sparse to answer, say so plainly instead of inventing a trend.

The app is built on progressive overload: clear the rep goal on every working set, then add that lift's increment. Loads are in pounds. "BW" means bodyweight and "BW+25" means bodyweight plus 25 lb.

Be concise and concrete — a few short paragraphs or a tight list, not an essay. Give the actual numbers to use next session where that is what was asked. You are not a doctor or a physiotherapist; if asked about pain or injury, say it is outside what you can help with and suggest a professional.`;

function configured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function GET() {
  return Response.json({ configured: configured() });
}

export async function POST(request: Request) {
  if (!configured()) {
    return Response.json(
      {
        error:
          "No ANTHROPIC_API_KEY set. Copy .env.example to .env.local, add a key, and restart the server.",
      },
      { status: 503 },
    );
  }

  let question: unknown;
  let digest: unknown;
  let routine: unknown;
  try {
    const body = await request.json();
    ({ question, digest, routine } = body);
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (typeof question !== "string" || !question.trim()) {
    return Response.json({ error: "Ask a question first." }, { status: 400 });
  }
  if (typeof digest !== "string" || typeof routine !== "string") {
    return Response.json({ error: "Missing training history." }, { status: 400 });
  }

  const client = new Anthropic();

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 4000, // A coaching answer is short by design.
      system: SYSTEM,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      messages: [
        {
          role: "user",
          content: `${routine}\n\n${digest}\n\nQUESTION: ${question.trim()}`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
      cancel() {
        stream.abort();
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    // Most specific first, so a bad key doesn't read as a rate limit.
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json(
        { error: "That API key was rejected. Check ANTHROPIC_API_KEY." },
        { status: 502 },
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "Rate limited by the API — try again shortly." },
        { status: 502 },
      );
    }
    if (err instanceof Anthropic.APIError) {
      return Response.json(
        { error: `The API returned ${err.status}: ${err.message}` },
        { status: 502 },
      );
    }
    return Response.json(
      { error: "Could not reach the API." },
      { status: 502 },
    );
  }
}

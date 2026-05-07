export async function GET() {
  return Response.json({
    ok: true,
    aiEnabled: Boolean(process.env.OPENAI_API_KEY),
  });
}

export default {
  async fetch(request) {
    if (request.method === "GET") {
      return GET();
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  },
};

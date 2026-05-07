import { createMealAnalysis } from "../src/server-core.mjs";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await createMealAnalysis(body);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}

export default {
  async fetch(request) {
    if (request.method === "POST") {
      return POST(request);
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  },
};

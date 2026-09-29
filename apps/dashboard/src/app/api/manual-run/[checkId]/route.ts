import { apiBaseUrl } from "../../../../lib/api";

export async function POST(
  _request: Request,
  context: { params: Promise<{ checkId: string }> }
): Promise<Response> {
  const { checkId } = await context.params;
  const response = await fetch(
    `${apiBaseUrl}/api/v1/checks/${encodeURIComponent(checkId)}/run`,
    {
      method: "POST",
      cache: "no-store"
    }
  );

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json"
    }
  });
}

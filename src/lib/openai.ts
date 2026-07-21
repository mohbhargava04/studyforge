type InputContent = string | Array<Record<string, unknown>>;

type OpenAIResponseShape = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: { message?: string };
};

export class OpenAIConfigurationError extends Error {}
export class OpenAIRequestError extends Error {}

function outputText(payload: OpenAIResponseShape) {
  if (payload.output_text?.trim()) return payload.output_text.trim();
  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export async function createStudyResponse({
  instructions,
  input,
  json = false,
}: {
  instructions: string;
  input: InputContent;
  json?: boolean;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIConfigurationError("OPENAI_API_KEY is not configured.");
  }

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5",
      store: false,
      input: [
        { role: "developer", content: instructions },
        { role: "user", content: input },
      ],
      ...(json ? { text: { format: { type: "json_object" } } } : {}),
    }),
  });

  const payload = (await upstream.json().catch(() => ({}))) as OpenAIResponseShape;
  if (!upstream.ok) {
    throw new OpenAIRequestError(payload.error?.message || "The AI provider did not complete the request.");
  }

  const text = outputText(payload);
  if (!text) throw new OpenAIRequestError("The AI provider returned an empty response.");
  return text;
}

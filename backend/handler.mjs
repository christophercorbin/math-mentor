import { askTutor, validateMessages } from "./tutor.mjs";

const MODEL_ID = process.env.MODEL_ID;

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.requestContext?.http?.method !== "POST") {
    return response(405, { error: "Method not allowed" });
  }

  let payload;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body ?? "", "base64").toString("utf-8")
      : (event.body ?? "");
    payload = JSON.parse(raw);
  } catch {
    return response(400, { error: "Invalid JSON body" });
  }

  const validationError = validateMessages(payload?.messages);
  if (validationError) {
    return response(400, { error: validationError });
  }

  try {
    const reply = await askTutor(payload.messages, MODEL_ID);
    return response(200, { reply });
  } catch (err) {
    console.error("Bedrock invocation failed", err);
    return response(502, { error: "Model invocation failed" });
  }
};

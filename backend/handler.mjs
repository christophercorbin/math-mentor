import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({});

const MODEL_ID = process.env.MODEL_ID;
const MAX_TURNS = 30;
const MAX_MESSAGE_CHARS = 4000;

const SYSTEM_PROMPT = `You are MathMentor, a patient Socratic math tutor from Barbados, helping Bajan students from primary school through CSEC/CXC and beyond.

Personality and voice:
- You are warm and encouraging in a naturally Barbadian way. Light, respectful Bajan flavour is welcome in greetings and encouragement ("Alright, leh we work through this together", "Yuh nearly got it!", "Sweet! Dat is correct"), but NEVER in the mathematics itself.
- All mathematical explanations, definitions, and steps must be in clear standard English so nothing is ambiguous.
- If a student writes in Bajan dialect, respond naturally and warmly; never mock or correct their dialect.
- Keep the dialect light and genuine. You are a Bajan teacher, not a caricature.

Curriculum awareness:
- You know the Barbados school journey: Common Entrance (BSSEE) for primary students, CSEC/CXC Mathematics and Additional Mathematics for secondary, and CAPE for sixth form.
- If the student mentions their level or exam, pitch explanations and methods to that syllabus (for example, CXC general proficiency methods for CSEC students).
- Use Barbadian and Caribbean contexts in examples where natural: prices in Barbados dollars, bus fares, cricket scores, market shopping, distances between parishes.

Tutoring rules:
1. Never give the final answer outright. Guide the student toward it with one question or one hint at a time.
2. Start by asking the student to show what they have tried, unless they already have.
3. When the student makes an error, point to where it happened and ask a question that helps them find it themselves.
4. Adjust your language to the apparent level of the problem. Keep explanations short, one concept per message.
5. Use LaTeX for all math, wrapped in \\( \\) for inline and \\[ \\] for display.
6. When the student reaches the correct answer, confirm it, recap the key steps in two or three bullet points, and offer one similar practice problem (Bajan context encouraged).
7. Stay on the subject of mathematics. If asked about anything else, politely steer back to the math problem.
8. If a student asks you to just give the answer, explain kindly that working through it is the point, and offer a smaller first step instead.`;

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

  const { messages } = payload ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return response(400, { error: "messages array is required" });
  }
  if (messages.length > MAX_TURNS) {
    return response(400, { error: "Conversation too long; start a new session" });
  }

  const valid = messages.every(
    (m) =>
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.length > 0 &&
      m.content.length <= MAX_MESSAGE_CHARS
  );
  if (!valid || messages[messages.length - 1].role !== "user") {
    return response(400, { error: "Malformed messages" });
  }

  try {
    const result = await client.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        system: [{ text: SYSTEM_PROMPT }],
        messages: messages.map((m) => ({
          role: m.role,
          content: [{ text: m.content }],
        })),
        inferenceConfig: { maxTokens: 1024, temperature: 0.4 },
      })
    );

    const text =
      result.output?.message?.content?.map((c) => c.text ?? "").join("") ?? "";
    return response(200, { reply: text });
  } catch (err) {
    console.error("Bedrock invocation failed", err);
    return response(502, { error: "Model invocation failed" });
  }
};

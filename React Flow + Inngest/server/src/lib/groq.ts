import Groq from "groq-sdk";

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";

export type Decision = "YES" | "NO";


export async function decide(prompt: string): Promise<Decision> {
  const res = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0,
    max_tokens: 5,
    messages: [
      {
        role: "system",
        content: `
          You are a binary decision engine. 
          Read the user's question and answer with EXACTLY one word: YES or NO. 
          No punctuation, no explanation, no other text.
        `,
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = (res.choices[0]?.message?.content ?? "").trim().toUpperCase();

  const cleaned = raw.replace(/[^A-Z]/g, "");
  if (cleaned.startsWith("YES")) return "YES";
  return "NO";
}
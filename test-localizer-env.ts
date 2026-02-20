import { mastra } from "./src/mastra";

async function run() {
  console.log("GOOGLE_GENERATIVE_AI_API_KEY initially starts with:", process.env.GOOGLE_GENERATIVE_AI_API_KEY?.substring(0, 5));
  console.log("GEMINI_API_KEY initially starts with:", process.env.GEMINI_API_KEY?.substring(0, 5));

  const agent = mastra.getAgent("localizer");
  try {
    const res = await agent.generate("Say hello in Spanish");
    console.log("Response:", res.text);
  } catch (e) {
    console.error("Error generating:", e);
  }
}

run();

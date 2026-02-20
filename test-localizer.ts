import { mastra } from "./src/mastra";

async function run() {
  const agent = mastra.getAgent("localizer");
  console.log("Got agent:", !!agent);
  try {
    const res = await agent.generate("Say hello in Spanish");
    console.log("Response:", res.text);
  } catch (e) {
    console.error("Error generating:", e);
  }
}

run();

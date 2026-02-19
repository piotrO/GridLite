import { z } from "zod";
import { strategyWorkflow } from "./src/mastra/workflows/strategy";

async function main() {
  const brandProfile = {
    name: "Test Brand",
    url: "https://example.com",
    industry: "Testing",
    tagline: "Testing is believing",
    brandSummary: "A brand for testing.",
    audiences: [{ name: "Testers", description: "People who test things." }],
  };

  const shortText = "Too short";
  const url = "https://example.com";

  console.log("Running strategy workflow with short text and valid URL...");

  try {
    const result = await strategyWorkflow.execute({
      brandProfile,
      rawWebsiteText: shortText,
      websiteUrl: url,
    });

    console.log("Workflow execution complete.");
    console.log(
      "Success:",
      result.results?.["generate-strategy"]?.status === "success",
    );

    // We expect the workflow to have re-scraped or at least processed.
    // In a real environment with network, it would scrape.
    // Here we just want to ensure it didn't just bail out with "Too short" if the logic was wrong.
    // But since we can't easily mock network here without more setup, we rely on the log message we added.

    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Workflow failed:", error);
  }
}

main();

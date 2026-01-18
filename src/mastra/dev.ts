import { Mastra } from "@mastra/core";
import {
  brandScannerAgent,
  strategistAgent,
  strategistChatAgent,
  designerAgent,
  designerChatAgent,
} from "./agents";

/**
 * Mastra development instance for Studio.
 *
 * NOTE: This is a simplified instance that only includes agents
 * (not workflows). Workflows depend on @/app imports which Mastra's
 * standalone bundler cannot resolve.
 *
 * For full workflow functionality, use the main application.
 * This dev instance is for testing agents in Mastra Studio.
 */
const mastraDev = new Mastra({
  agents: {
    brandScanner: brandScannerAgent,
    strategist: strategistAgent,
    strategistChat: strategistChatAgent,
    designer: designerAgent,
    designerChat: designerChatAgent,
  },
});

export default mastraDev;

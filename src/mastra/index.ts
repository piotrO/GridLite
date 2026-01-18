import { Mastra } from "@mastra/core";
import {
  brandScannerAgent,
  strategistAgent,
  strategistChatAgent,
  designerAgent,
  designerChatAgent,
} from "./agents";
import {
  brandScanWorkflow,
  strategyWorkflow,
  designerWorkflow,
} from "./workflows";

/**
 * Main Mastra instance for the GridLite application.
 * Registers agents and workflows for use throughout the app.
 */
export const mastra = new Mastra({
  agents: {
    brandScanner: brandScannerAgent,
    strategist: strategistAgent,
    strategistChat: strategistChatAgent,
    designer: designerAgent,
    designerChat: designerChatAgent,
  },
  workflows: {
    brandScan: brandScanWorkflow,
    strategy: strategyWorkflow,
    designer: designerWorkflow,
  },
});

/**
 * Type-safe accessor for agents.
 */
export function getBrandScannerAgent() {
  return mastra.getAgent("brandScanner");
}

/**
 * Type-safe accessor for the brand scan workflow.
 */
export function getBrandScanWorkflow() {
  return mastra.getWorkflow("brandScan");
}

/**
 * Type-safe accessor for the strategy workflow.
 */
export function getStrategyWorkflow() {
  return mastra.getWorkflow("strategy");
}

/**
 * Type-safe accessor for the designer workflow.
 */
export function getDesignerWorkflow() {
  return mastra.getWorkflow("designer");
}

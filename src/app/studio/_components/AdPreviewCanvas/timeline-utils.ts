import type {
  TimelineLayer,
  ManifestLayer,
  ManifestAnimationGroup,
} from "./types";

interface Manifest {
  layers?: ManifestLayer[];
  animationGroups?: ManifestAnimationGroup[];
  shots?: Array<{ duration: number }>;
}

/**
 * Extract animated layers from manifest for timeline display.
 * Only returns layers that have at least one timeline with animation steps.
 */
export function extractAnimatedLayers(manifest: Manifest): TimelineLayer[] {
  const layers = manifest?.layers ?? [];
  const animationGroups = manifest?.animationGroups ?? [];
  const animatedLayers: TimelineLayer[] = [];

  // Build a map of animation group delays for resolving triggers
  const groupDelayMap = new Map<string, number>();
  let accumulatedDelay = 0;

  // Animation groups often chain, so we calculate cumulative delays
  for (const group of animationGroups) {
    const groupDelay = parseFloat(String(group.delay)) || 0;
    groupDelayMap.set(group.id, accumulatedDelay + groupDelay);
    const groupDuration = parseFloat(group.duration) || 0.5;
    accumulatedDelay += groupDelay + groupDuration;
  }

  for (const layer of layers) {
    // Skip layers without shots or timelines
    if (!layer.shots?.[0]?.timelines?.length) continue;

    const shot = layer.shots[0];

    for (const timeline of shot.timelines) {
      // Skip timelines without steps
      if (!timeline.steps?.length) continue;

      // Skip hover/click interactions - only show auto-playing animations
      if (
        timeline.trigger === "On Hover Ad" ||
        timeline.trigger === "On Click Ad"
      ) {
        continue;
      }

      const step = timeline.steps[0];
      const settings = step.settings;

      // Check if there's any meaningful animation property
      // An animation is meaningful if ANY property differs from static state
      const hasAnimation =
        settings.opacity !== undefined ||
        settings.x !== undefined ||
        settings.y !== undefined ||
        (settings.scale !== undefined && settings.scale !== 1) ||
        settings.rotation !== undefined;

      if (!hasAnimation) {
        continue;
      }

      // Parse delay: either direct timestamp or animation group reference
      let delay = parseFloat(String(settings.delay)) || 0;

      // If trigger is a GUID (animation group), add the group's delay
      if (timeline.trigger && timeline.trigger !== "Timestamp") {
        const groupDelay = groupDelayMap.get(timeline.trigger);
        if (groupDelay !== undefined) {
          delay += groupDelay;
        }
      }

      const duration = parseFloat(String(settings.duration)) || 0.5;

      animatedLayers.push({
        name: layer.name,
        guid: layer.guid,
        delay,
        duration,
        endTime: delay + duration,
        animationType: settings.animationType || "from",
        trigger: timeline.trigger,
        properties: {
          x: settings.x,
          y: settings.y,
          scale: settings.scale,
          opacity: settings.opacity,
          rotation: settings.rotation,
        },
      });

      // Only take the first auto-playing timeline per layer
      break;
    }
  }

  // Sort by delay for proper visual stacking
  animatedLayers.sort((a, b) => a.delay - b.delay);

  return animatedLayers;
}

/**
 * Get total ad duration from manifest shots
 */
export function getManifestDuration(manifest: Manifest): number {
  const shots = manifest?.shots ?? [];
  return shots.reduce((total, shot) => total + (shot.duration || 0), 0) || 5;
}

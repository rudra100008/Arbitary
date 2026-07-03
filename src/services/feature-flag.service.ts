/**
 * Re-exports from the unified feature-flags service.
 * Importers should migrate to `@/src/services/feature-flags.service` directly.
 */
export {
  FeatureFlagsService as FeatureFlagService,
  TOGGLEABLE_PLATFORMS,
  type TogglePlatform,
  type PlatformFlags,
} from "./feature-flags.service";

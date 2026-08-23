import type { SuggestedWaypointFixtureScenarioIds } from "./suggestedWaypointLocalSqlFixture";
import {
  runWithSuggestedWaypointLocalAuthFixture,
  type SuggestedWaypointLocalFixtureRunOptions,
} from "./suggestedWaypointLocalAuthFixture";
import {
  createSuggestedWaypointPlaywrightBundle,
  type SuggestedWaypointPlaywrightActor,
  type SuggestedWaypointPlaywrightBrowser,
} from "./suggestedWaypointPlaywrightSession";
import {
  readSuggestedWaypointWholePathSafetyConfig,
  WHOLE_PATH_APPROVAL_GATE,
  WHOLE_PATH_EFFECT_GATE,
  type SuggestedWaypointWholePathSafetyConfig,
} from "./suggestedWaypointWholePathSafety";

type WholePathEnvironment = Readonly<Record<string, string | undefined>>;

export type SuggestedWaypointOwnedPlaywrightBrowser =
  SuggestedWaypointPlaywrightBrowser &
    Readonly<{
      close(): Promise<void>;
    }>;

export type SuggestedWaypointWholePathScenario = Readonly<{
  config: SuggestedWaypointWholePathSafetyConfig;
  scenarioIds: SuggestedWaypointFixtureScenarioIds;
  actors: readonly SuggestedWaypointPlaywrightActor[];
}>;

export type SuggestedWaypointWholePathOrchestratorOptions<T> = Omit<
  SuggestedWaypointLocalFixtureRunOptions<unknown>,
  "environment" | "runScenario"
> &
  Readonly<{
    environment: WholePathEnvironment;
    createBrowser(
      config: SuggestedWaypointWholePathSafetyConfig,
    ): Promise<SuggestedWaypointOwnedPlaywrightBrowser>;
    runScenario(scenario: SuggestedWaypointWholePathScenario): Promise<T>;
  }>;

type BrowserOutcome<T> =
  | Readonly<{ status: "completed"; result: T }>
  | Readonly<{ status: "run_failed" }>
  | Readonly<{ status: "cleanup_failed" }>;

function stableEnvironment(
  config: SuggestedWaypointWholePathSafetyConfig,
): WholePathEnvironment {
  return Object.freeze({
    SOLMIND_WHOLE_PATH_APPROVAL: WHOLE_PATH_APPROVAL_GATE,
    SOLMIND_WHOLE_PATH_ALLOW_LOCAL_EFFECTS: WHOLE_PATH_EFFECT_GATE,
    SOLMIND_WHOLE_PATH_RUN_ID: config.runId,
    SOLMIND_LOCAL_SUPABASE_PROJECT_ID: config.projectId,
    SOLMIND_LOCAL_SUPABASE_URL: config.localSupabaseUrl,
    SOLMIND_LOCAL_DATABASE_PORT: String(config.localDatabasePort),
    SOLMIND_TRUSTED_APP_ORIGIN: config.trustedApplicationOrigin,
  });
}

async function runBrowserScenario<T>(
  options: SuggestedWaypointWholePathOrchestratorOptions<T>,
  config: SuggestedWaypointWholePathSafetyConfig,
  fixture: Parameters<
    SuggestedWaypointLocalFixtureRunOptions<unknown>["runScenario"]
  >[0],
): Promise<BrowserOutcome<T>> {
  let browser: SuggestedWaypointOwnedPlaywrightBrowser | undefined;
  let bundle: Awaited<
    ReturnType<typeof createSuggestedWaypointPlaywrightBundle>
  > | undefined;
  let result: T | undefined;
  let runFailed = false;
  let cleanupFailed = false;
  let stage: "browser" | "bundle" | "scenario" = "browser";

  try {
    browser = await options.createBrowser(config);
    stage = "bundle";
    bundle = await createSuggestedWaypointPlaywrightBundle(
      browser,
      fixture.actors,
      config,
    );
    stage = "scenario";
    result = await options.runScenario(
      Object.freeze({
        config,
        scenarioIds: fixture.scenarioIds,
        actors: bundle.actors,
      }),
    );
  } catch (error) {
    if (
      stage === "bundle" &&
      error instanceof Error &&
      error.message === "whole_path_playwright_setup_cleanup_failed"
    ) {
      cleanupFailed = true;
    } else {
      runFailed = true;
    }
  } finally {
    if (bundle) {
      try {
        await bundle.close();
      } catch {
        cleanupFailed = true;
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch {
        cleanupFailed = true;
      }
    }
  }

  if (cleanupFailed) return Object.freeze({ status: "cleanup_failed" });
  if (runFailed) return Object.freeze({ status: "run_failed" });
  return Object.freeze({ status: "completed", result: result as T });
}

export async function runSuggestedWaypointWholePath<T>(
  options: SuggestedWaypointWholePathOrchestratorOptions<T>,
): Promise<Readonly<{ status: "refused" } | { status: "completed"; result: T }>> {
  let config: SuggestedWaypointWholePathSafetyConfig | null;
  try {
    config = readSuggestedWaypointWholePathSafetyConfig(options.environment);
  } catch {
    throw new Error("whole_path_orchestrator_configuration_failed");
  }
  if (config === null) return Object.freeze({ status: "refused" });

  const fixtureResult = await runWithSuggestedWaypointLocalAuthFixture<
    BrowserOutcome<T>
  >({
    environment: stableEnvironment(config),
    loadSecrets: options.loadSecrets,
    createDependencies: options.createDependencies,
    ...(options.generatePassword
      ? { generatePassword: options.generatePassword }
      : {}),
    runScenario: (fixture) => runBrowserScenario(options, config, fixture),
  });

  if (fixtureResult.status === "refused") {
    throw new Error("whole_path_orchestrator_configuration_drift");
  }
  if (fixtureResult.result.status === "cleanup_failed") {
    throw new Error("whole_path_orchestrator_cleanup_failed");
  }
  if (fixtureResult.result.status === "run_failed") {
    throw new Error("whole_path_orchestrator_run_failed");
  }
  return Object.freeze({
    status: "completed",
    result: fixtureResult.result.result,
  });
}

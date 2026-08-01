/**
 * Critic agent — thin wrapper over the existing eval harness.
 * Future extension: swap structured-output providers without touching routes.
 */
export { runEval as criticAgent } from "../harness/run-eval";
export type { EvalResult as CriticEvaluation } from "../ai/schema";

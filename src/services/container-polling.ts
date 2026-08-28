export interface ContainerPollingOptions {
  intervalMs: number;
  maxWaitMs: number;
  sleep?: (milliseconds: number) => Promise<void>;
  label?: string;
}

export async function waitForContainerStatus(
  fetchStatus: () => Promise<string | undefined>,
  options: ContainerPollingOptions
): Promise<void> {
  const {
    intervalMs,
    maxWaitMs,
    sleep = (milliseconds) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)),
    label = "Container",
  } = options;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error("Polling intervalMs must be greater than zero.");
  }
  if (!Number.isFinite(maxWaitMs) || maxWaitMs < 0) {
    throw new Error("Polling maxWaitMs must be zero or greater.");
  }
  const maxAttempts = Math.max(1, Math.floor(maxWaitMs / intervalMs) + 1);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await fetchStatus();
    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(`${label} processing failed (${status} status)`);
    }
    if (attempt + 1 < maxAttempts) await sleep(intervalMs);
  }

  throw new Error(`${label} processing timed out after ${Math.ceil(maxWaitMs / 1000)}s`);
}

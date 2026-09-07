/**
 * Latency measurement and telemetry helper utilities.
 * Uses high-resolution monotonic timestamps (performance.now() and Date.now()).
 */

export interface LatencyRecord {
  name: string;
  startHrTime: number;
  endHrTime?: number;
  startTimestampMs: number;
  endTimestampMs?: number;
  durationMs?: number;
}

export class LatencyTracker {
  private records: Map<string, LatencyRecord> = new Map();

  public start(name: string): LatencyRecord {
    const record: LatencyRecord = {
      name,
      startHrTime: performance.now(),
      startTimestampMs: Date.now()
    };
    this.records.set(name, record);
    return record;
  }

  public end(name: string): LatencyRecord {
    const record = this.records.get(name);
    if (!record) {
      throw new Error(`No active latency record found for "${name}"`);
    }
    record.endHrTime = performance.now();
    record.endTimestampMs = Date.now();
    record.durationMs = Number((record.endHrTime - record.startHrTime).toFixed(3));
    return record;
  }

  public getRecord(name: string): LatencyRecord | undefined {
    return this.records.get(name);
  }

  public getAllRecords(): LatencyRecord[] {
    return Array.from(this.records.values());
  }

  public clear(): void {
    this.records.clear();
  }
}

/**
 * Calculates cutoff latency given barge-in timestamp and audio stop timestamp.
 */
export function calculateCutoffLatency(interruptionDetectedAt: number, audioStoppedAt: number): number {
  if (audioStoppedAt < interruptionDetectedAt) {
    throw new Error('audioStoppedAt cannot be earlier than interruptionDetectedAt');
  }
  return audioStoppedAt - interruptionDetectedAt;
}

/**
 * Execution scheduling: split a parent order into child slices.
 *
 * `twap` spreads size evenly across a fixed number of slices (time-weighted).
 * `pov` participates at a fixed fraction of each interval's volume
 * (percentage-of-volume). Both return the child sizes; sizes may be fractional.
 */

/**
 * TWAP: split ``totalSize`` into ``slices`` equal child orders. The sizes sum
 * exactly to ``totalSize`` (any floating residual lands in the last slice).
 */
export function twap(totalSize: number, slices: number): number[] {
  if (slices < 1 || !Number.isInteger(slices)) {
    throw new Error("slices must be a positive integer");
  }
  const out: number[] = [];
  let allocated = 0;
  for (let i = 1; i <= slices; i++) {
    const target = (totalSize * i) / slices;
    out.push(target - allocated);
    allocated = target;
  }
  return out;
}

/**
 * POV: for each interval, trade ``rate`` × that interval's volume, capped by
 * the size still remaining. Returns per-interval child sizes; their sum is the
 * filled amount (less than ``totalSize`` if the volume was insufficient).
 */
export function pov(
  totalSize: number,
  intervalVolumes: readonly number[],
  rate: number,
): number[] {
  const r = Math.max(0, rate);
  const out: number[] = [];
  let remaining = totalSize;
  for (const vol of intervalVolumes) {
    if (remaining <= 0) {
      out.push(0);
      continue;
    }
    const child = Math.min(remaining, r * Math.max(0, vol));
    out.push(child);
    remaining -= child;
  }
  return out;
}

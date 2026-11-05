// Mulberry32: all state transitions are explicit unsigned 32-bit integer operations.
export class SeededRng {
  private value: number;

  constructor(seed: number) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
      throw new Error('Seed must be an unsigned 32-bit integer');
    }
    this.value = seed;
  }

  get state(): number {
    return this.value;
  }

  next(): number {
    this.value = (this.value + 0x6d2b79f5) >>> 0;
    let value = this.value;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  }
}

interface RouteStage {
  readonly name: string;
  readonly points: readonly (readonly [x: number, y: number, seconds: number, height?: number])[];
  readonly checkpoints: number;
  readonly deviants: number;
  readonly refill: boolean;
}

// Real orders on the authored level, shared by model replay and browser smoke.
export const REDOUBTS_ROUTE: readonly RouteStage[] = [
  {
    name: 'upper courtyard',
    points: [
      [780, 300, 4],
      [1300, 300, 5],
      [1580, 250, 6],
      [1760, 300, 8, 170],
    ],
    checkpoints: 1,
    deviants: 3,
    refill: true,
  },
  {
    name: 'second courtyard supports via the northern approach',
    points: [
      [2150, 550, 5],
      [2430, 240, 5],
      [2780, 240, 5],
      [2860, 400, 4],
      [3720, 400, 7],
      [3720, 700, 5],
    ],
    checkpoints: 1,
    deviants: 3,
    refill: true,
  },
  {
    name: 'second garrison and checkpoint',
    points: [
      [3520, 700, 10, 170],
      [3520, 700, 6, 170],
    ],
    checkpoints: 2,
    deviants: 3,
    refill: true,
  },
  {
    name: 'checkpoint deviant from the lower flank',
    points: [
      [4000, 500, 5],
      [4340, 500, 5],
      [4400, 850, 4],
      [5120, 850, 7],
      [5460, 700, 7],
      [5400, 640, 6],
    ],
    checkpoints: 2,
    deviants: 2,
    refill: true,
  },
  {
    name: 'central redoubt',
    points: [
      [5100, 500, 6],
      [5280, 500, 12, 170],
      [5280, 500, 6, 170],
    ],
    checkpoints: 3,
    deviants: 2,
    refill: true,
  },
  {
    name: 'second deviant on the upper flank',
    points: [
      [5800, 550, 5],
      [6280, 450, 5],
      [6400, 100, 4],
      [6530, 120, 5],
      [6740, 140, 8],
    ],
    checkpoints: 3,
    deviants: 1,
    refill: true,
  },
  {
    name: 'lower final deviant and support from the rear',
    points: [
      [7100, 330, 6],
      [7140, 600, 10],
    ],
    checkpoints: 3,
    deviants: 0,
    refill: true,
  },
  {
    name: 'final garrison',
    points: [[6780, 480, 8]],
    checkpoints: 3,
    deviants: 0,
    refill: true,
  },
  {
    name: 'final courtyard',
    points: [
      [6840, 500, 6, 190],
      [6940, 500, 8, 190],
      [7060, 500, 5, 190],
    ],
    checkpoints: 3,
    deviants: 0,
    refill: false,
  },
];

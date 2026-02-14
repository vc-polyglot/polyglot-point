export type DomainId = 'ARITHMETIC' | 'ALGEBRA' | 'FUNCTIONS';
export type ReflexId = 'ARITH_MULT';

export type DifficultySettings = {
  digitsA: 1 | 2;
  digitsB: 1 | 2;
};

export type MultiplicationSubpatternId =
  | 'TABLA_1'
  | 'TABLA_2'
  | 'TABLA_3'
  | 'TABLA_4'
  | 'TABLA_5'
  | 'TABLA_6'
  | 'TABLA_7'
  | 'TABLA_8'
  | 'TABLA_9'
  | 'DOS_DIGITOS_X_UN_DIGITO'
  | 'DOS_DIGITOS_X_DOS_DIGITOS';

export type Exercise = {
  exerciseId: string;
  domain: DomainId;
  reflexId: ReflexId;
  prompt: string;
  operands: [number, number];
  correctAnswer: number;
  subpatternId: MultiplicationSubpatternId;
  difficulty: DifficultySettings;
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeId(): string {
  return 'ex_' + Date.now() + '_' + Math.random().toString(16).slice(2);
}

function detectSubpattern(a: number, b: number, diff: DifficultySettings): MultiplicationSubpatternId {
  if (diff.digitsA === 1 && diff.digitsB === 1) {
    const table = Math.max(a, b);
    return ('TABLA_' + table) as MultiplicationSubpatternId;
  }

  if (
    (diff.digitsA === 2 && diff.digitsB === 1) ||
    (diff.digitsA === 1 && diff.digitsB === 2)
  ) {
    return 'DOS_DIGITOS_X_UN_DIGITO';
  }

  if (diff.digitsA === 2 && diff.digitsB === 2) {
    return 'DOS_DIGITOS_X_DOS_DIGITOS';
  }

  return 'DOS_DIGITOS_X_UN_DIGITO';
}

export function generateMultiplicationExercise(diff: DifficultySettings): Exercise {
  let a = diff.digitsA === 1 ? randomInt(2, 9) : randomInt(10, 99);
  let b = diff.digitsB === 1 ? randomInt(2, 9) : randomInt(10, 99);

  if (diff.digitsA === 1 && diff.digitsB === 1 && a < b) {
    const temp = a;
    a = b;
    b = temp;
  }

  const correctAnswer = a * b;
  const subpatternId = detectSubpattern(a, b, diff);

  return {
    exerciseId: makeId(),
    domain: 'ARITHMETIC',
    reflexId: 'ARITH_MULT',
    prompt: a + ' × ' + b + ' = ?',
    operands: [a, b],
    correctAnswer,
    subpatternId,
    difficulty: diff
  };
}

export function evaluateMultiplicationAnswer(
  ex: Exercise,
  userAnswerRaw: string
): { isCorrect: boolean; userAnswer: number | null } {
  const cleaned = userAnswerRaw.trim();
  if (!cleaned) return { isCorrect: false, userAnswer: null };

  const n = Number(cleaned);
  if (!Number.isFinite(n)) return { isCorrect: false, userAnswer: null };

  return {
    isCorrect: n === ex.correctAnswer,
    userAnswer: n
  };
}

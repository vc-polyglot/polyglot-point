export type MentalStrategy = {
  numericSteps: string[]
  verbalExplanation: string
}

export function generateMentalStrategy(a: number, b: number): MentalStrategy {
  // Ordenar para consistencia
  const x = Math.max(a, b)
  const y = Math.min(a, b)

  // MÃ©todo Ã—5
  if (y === 5) {
    return {
      numericSteps: [
        x + " Ã— 5",
        "= " + x + " Ã— (10 Ã· 2)",
        "= " + (x * 10) + " Ã· 2",
        "= " + (x * 5)
      ],
      verbalExplanation:
        "Multiplicar por 5 es equivalente a multiplicar por 10 y dividir entre 2. Es mÃ¡s rÃ¡pido mentalmente."
    }
  }

  // Cercano a 10
  if (y === 9) {
    return {
      numericSteps: [
        x + " Ã— 9",
        "= " + x + " Ã— (10 âˆ’ 1)",
        "= " + (x * 10) + " âˆ’ " + x,
        "= " + (x * 9)
      ],
      verbalExplanation:
        "Como 9 estÃ¡ a una unidad de 10, multiplicamos por 10 y restamos una vez el nÃºmero original."
    }
  }

  // MÃ©todo 25
  if (y === 25) {
    return {
      numericSteps: [
        x + " Ã— 25",
        "= " + x + " Ã— (100 Ã· 4)",
        "= " + (x * 100) + " Ã· 4",
        "= " + (x * 25)
      ],
      verbalExplanation:
        "Multiplicar por 25 es lo mismo que multiplicar por 100 y dividir entre 4."
    }
  }

  // Default elegante
  return {
    numericSteps: [
      a + " Ã— " + b,
      "= " + (a * b)
    ],
    verbalExplanation:
      "Se puede resolver directamente o descomponiendo uno de los factores si resulta conveniente."
  }
}


## 9) DomainId (estructura mínima)

type DomainId =
  | 'ARITHMETIC'
  | 'ALGEBRA'
  | 'FUNCTIONS'

Los botones visibles en UI serán:

- Aritmética
- Álgebra
- Funciones

Los IDs internos nunca se muestran al usuario.


## 10) Primer Reflejo Oficial

ReflexId: 'ARITH_MULT'
Domain: ARITHMETIC
Label visible: 'Multiplicación'

Subpatrones detectables:

- TABLA_1 a TABLA_9
- DOS_DIGITOS_X_UN_DIGITO
- DOS_DIGITOS_X_DOS_DIGITOS

Tipo: Determinista
Resolución: 100% local
LLM requerido: No

El sistema debe registrar subpatternId por ejercicio para análisis futuro.


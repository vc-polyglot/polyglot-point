export interface Leaf {
  id: string;
  label: string;
}

export interface Subbranch {
  id: string;
  label: string;
  leaves: Leaf[];
}

export interface Branch {
  id: string;
  label: string;
  subbranches?: Subbranch[];
  leaves?: Leaf[];
}

export interface Domain {
  id: string;
  label: string;
  branches: Branch[];
}

export const TREE: Domain[] = [
  {
    id: "cotidiana",
    label: "Vida cotidiana",
    branches: [
      {
        id: "sueno",
        label: "Sueño y descanso",
        leaves: [
          { id: "sueno-1", label: "Dormir o seguir trabajando" },
          { id: "sueno-2", label: "Levantarme temprano o quedarme en cama" },
          { id: "sueno-3", label: "Dormir temprano o desvelarme" },
        ],
      },
      {
        id: "alimentacion",
        label: "Alimentación",
        leaves: [
          { id: "ali-1", label: "Comer saludable o lo que tengo ganas" },
          { id: "ali-2", label: "Cocinar o pedir comida" },
          { id: "ali-3", label: "Hacer dieta o no" },
        ],
      },
      {
        id: "ejercicio",
        label: "Ejercicio y cuerpo",
        leaves: [
          { id: "eje-1", label: "Hacer ejercicio hoy o dejarlo para mañana" },
          { id: "eje-2", label: "Empezar una rutina nueva o seguir igual" },
          { id: "eje-3", label: "Ir al gym o entrenar en casa" },
        ],
      },
      {
        id: "tiempo",
        label: "Tiempo y productividad",
        leaves: [
          { id: "tie-1", label: "Estudiar o procrastinar" },
          { id: "tie-2", label: "Concentrarme en una cosa o atender todo a la vez" },
          { id: "tie-3", label: "Descansar o seguir trabajando" },
        ],
      },
    ],
  },
  {
    id: "relaciones",
    label: "Relaciones",
    branches: [
      {
        id: "pareja",
        label: "Pareja",
        subbranches: [
          {
            id: "pareja-conflicto",
            label: "Hay un conflicto",
            leaves: [
              { id: "par-1", label: "Tener la conversación difícil o evitarla" },
              { id: "par-2", label: "Pedir perdón o sostener mi postura" },
              { id: "par-3", label: "Poner límites o ceder" },
              { id: "par-4", label: "Hablar ahora o esperar que se enfríe" },
            ],
          },
          {
            id: "pareja-decision",
            label: "Decisión de pareja",
            leaves: [
              { id: "par-5", label: "Vivir juntos o seguir separados" },
              { id: "par-6", label: "Continuar la relación o terminarla" },
              { id: "par-7", label: "Decirle lo que siento o guardármelo" },
            ],
          },
        ],
      },
      {
        id: "familia",
        label: "Familia",
        leaves: [
          { id: "fam-1", label: "Decirle algo difícil a un familiar" },
          { id: "fam-2", label: "Poner límites con mi familia" },
          { id: "fam-3", label: "Ayudar económicamente o no" },
          { id: "fam-4", label: "Mantener el contacto o tomar distancia" },
        ],
      },
      {
        id: "amistad",
        label: "Amistad",
        leaves: [
          { id: "ami-1", label: "Hablar de algo que me molestó o dejarlo ir" },
          { id: "ami-2", label: "Mantener la amistad o alejarme" },
          { id: "ami-3", label: "Estar presente o tomar distancia" },
        ],
      },
      {
        id: "social",
        label: "Social",
        leaves: [
          { id: "soc-1", label: "Ir al evento o quedarme en casa" },
          { id: "soc-2", label: "Ser honesto o decir lo que quieren escuchar" },
          { id: "soc-3", label: "Responder o ignorar" },
        ],
      },
    ],
  },
  {
    id: "carrera",
    label: "Carrera y propósito",
    branches: [
      {
        id: "trabajo-actual",
        label: "Trabajo actual",
        leaves: [
          { id: "tra-1", label: "Renunciar o aguantar un poco más" },
          { id: "tra-2", label: "Pedir aumento o esperar" },
          { id: "tra-3", label: "Hablar con mi jefe o callármelo" },
          { id: "tra-4", label: "Quedarme en este puesto o buscar otro dentro de la empresa" },
        ],
      },
      {
        id: "cambio-profesional",
        label: "Cambio profesional",
        leaves: [
          { id: "cam-1", label: "Aceptar la oferta o rechazarla" },
          { id: "cam-2", label: "Emprender o seguir empleado" },
          { id: "cam-3", label: "Cambiar de industria o quedarme" },
          { id: "cam-4", label: "Moverme a otra ciudad por trabajo" },
        ],
      },
      {
        id: "formacion",
        label: "Formación",
        leaves: [
          { id: "for-1", label: "Estudiar una maestría o seguir trabajando" },
          { id: "for-2", label: "Tomar el curso o no" },
          { id: "for-3", label: "Especializarme o mantenerme generalista" },
        ],
      },
      {
        id: "proposito",
        label: "Propósito",
        leaves: [
          { id: "pro-1", label: "Seguir en esto o buscar algo que me llene más" },
          { id: "pro-2", label: "Priorizar estabilidad o significado" },
          { id: "pro-3", label: "Trabajar en lo mío o en el proyecto de alguien más" },
        ],
      },
    ],
  },
  {
    id: "finanzas",
    label: "Finanzas",
    branches: [
      {
        id: "deuda-inversion",
        label: "Deuda e inversión",
        leaves: [
          { id: "deu-1", label: "Pagar deuda o invertir" },
          { id: "deu-2", label: "Pedir préstamo para invertir o esperar" },
          { id: "deu-3", label: "Pagar la deuda rápido o en parcialidades" },
        ],
      },
      {
        id: "gastos-grandes",
        label: "Gastos grandes",
        leaves: [
          { id: "gas-1", label: "Comprar casa o seguir rentando" },
          { id: "gas-2", label: "Comprar el auto o seguir sin él" },
          { id: "gas-3", label: "Hacer el gasto ahora o esperar" },
        ],
      },
      {
        id: "ahorro",
        label: "Ahorro",
        leaves: [
          { id: "aho-1", label: "Ahorrar o gastar" },
          { id: "aho-2", label: "Guardar para el retiro o disfrutarlo ahora" },
          { id: "aho-3", label: "Fondo de emergencia o inversión" },
        ],
      },
      {
        id: "negocio",
        label: "Negocio",
        leaves: [
          { id: "neg-1", label: "Invertir en el negocio o proteger el capital" },
          { id: "neg-2", label: "Expandir o consolidar" },
          { id: "neg-3", label: "Asociarme o seguir solo" },
        ],
      },
    ],
  },
  {
    id: "identidad",
    label: "Identidad y crecimiento",
    branches: [
      {
        id: "cambios-vida",
        label: "Cambios de vida",
        leaves: [
          { id: "cvi-1", label: "Mudarme o quedarme" },
          { id: "cvi-2", label: "Empezar de nuevo o continuar" },
          { id: "cvi-3", label: "Salir de mi zona de confort o mantener lo que tengo" },
          { id: "cvi-4", label: "Hacer el cambio ahora o esperar el momento perfecto" },
        ],
      },
      {
        id: "salud-mental",
        label: "Bienestar personal",
        leaves: [
          { id: "sal-1", label: "Buscar ayuda profesional o manejarlo solo" },
          { id: "sal-2", label: "Poner límites o seguir aguantando" },
          { id: "sal-3", label: "Decir que no sin sentirme culpable" },
          { id: "sal-4", label: "Tomarse un descanso real o seguir adelante" },
        ],
      },
      {
        id: "valores",
        label: "Valores y camino propio",
        leaves: [
          { id: "val-1", label: "Seguir el camino que otros esperan o el mío" },
          { id: "val-2", label: "Ser auténtico o adaptarme al entorno" },
          { id: "val-3", label: "Priorizarme o priorizar a los demás" },
        ],
      },
      {
        id: "tiempo-personal",
        label: "Tiempo personal",
        leaves: [
          { id: "tie-p1", label: "Dedicar tiempo a lo mío o a los demás" },
          { id: "tie-p2", label: "Desconectarme o seguir conectado" },
          { id: "tie-p3", label: "Hacer más o aprender a hacer menos" },
        ],
      },
    ],
  },
];
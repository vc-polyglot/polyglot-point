// frontend/src/components/HowItWorks.tsx

export function HowItWorks() {
  return (
    <section className="how-it-works">
      <h2 className="how-it-works__title">Cómo funciona decidir</h2>

      <div className="how-it-works__blocks">

        <div className="how-it-works__block">
          <h3>Probabilidad subjetiva</h3>
          <p>
            Cuando dices "esto tiene 70% de chance de funcionar", ese número no salió de una tabla
            — salió de tu cabeza. El truco no es evitarlo, porque siempre vas a estimar. La clave
            es calibrar: ¿Cuántas veces, de cada 10 situaciones similares, has acertado con tus
            estimaciones? Si no lo has medido, tu 70% puede ser cualquier cosa.
          </p>
        </div>

        <div className="how-it-works__block">
          <h3>Valor esperado</h3>
          <p>
            EV = P(éxito) × Valor(éxito) + P(fallo) × Valor(fallo).
          </p>
          <p>
            Ejemplo: 60% de ganar $10,000, 40% de perder $2,000.
            EV = 0.6×10,000 + 0.4×(−2,000) = $5,200.
          </p>
          <p>
            En papel, es una decisión con EV positivo. Matemáticamente correcta. Fríamente atractiva.
          </p>
          <p className="how-it-works__callout">
            Pero aquí viene la verdad que casi nadie te dice: no todas las ganancias promedio valen la pena.
          </p>
          <p>
            Porque tú no vives en el promedio. Vives en la realidad. Y en la realidad, también puedes
            caer en ese 40%. Y si ese 40% te rompe —si no puedes absorber esa pérdida— entonces no es
            una buena decisión. Es una apuesta disfrazada de inteligencia.
          </p>
          <p>
            El error no está en las matemáticas. Está en ignorar tu contexto. El valor esperado no mide
            tu paz mental. No mide tu liquidez. No mide qué pasa si las cosas salen mal justo en el
            peor momento.
          </p>
          <p className="how-it-works__question">
            Así que la próxima vez que algo "suene bien en promedio", pregúntate: ¿puedo sobrevivir
            al peor escenario… o solo estoy enamorado del mejor?
          </p>
          <p>
            Porque una decisión inteligente no es la que maximiza ganancias. Es la que puedes
            sostener… incluso cuando falla.
          </p>
        </div>

        <div className="how-it-works__block">
          <h3>Costo de oportunidad</h3>
          <p>
            Elegir A no solo cuesta lo que pierdes si falla. Cuesta también lo que hubieras ganado
            con B, la mejor alternativa que sacrificaste.
          </p>
          <p>
            El costo de oportunidad es invisible, pero es real. Y duele más cuando ni siquiera te
            preguntaste cuál era tu plan B.
          </p>
        </div>

        <div className="how-it-works__block">
          <h3>Reversibilidad</h3>
          <p>Jeff Bezos lo resume así:</p>
          <ul>
            <li>
              <strong>Puertas de una vía:</strong> decisiones irreversibles. Ahí vas con máxima
              deliberación, análisis, preguntas incómodas.
            </li>
            <li>
              <strong>Puertas de dos vías:</strong> decisiones reversibles. Ahí decides rápido,
              ejecutas, y corriges sobre la marcha.
            </li>
          </ul>
          <p>
            El error clásico es tratar todas las decisiones como si fueran de una vía. Eso te
            paraliza en las que no importan, y te apresura en las que sí.
          </p>
        </div>

        <div className="how-it-works__block">
          <h3>Por qué el peor escenario importa</h3>
          <p>
            La mayoría sobreestima el promedio y subestima la cola. El peor escenario no es el más
            probable, pero es el que te puede sacar del juego.
          </p>
          <p className="how-it-works__question">
            La pregunta no es "¿qué tan probable es que salga mal?". La pregunta es: si sale mal,
            ¿puedo seguir jugando?
          </p>
        </div>

        <div className="how-it-works__block">
          <h3>Cómo evitar decisiones impulsivas</h3>
          <p>
            El cerebro bajo estrés no busca calidad — busca salir rápido de la incomodidad.
          </p>
          <p>Una forma simple de contrarrestarlo: escribe los inputs antes de decidir.</p>
          <ul>
            <li>Probabilidad estimada</li>
            <li>Alternativas que estás descartando</li>
            <li>Reversibilidad</li>
            <li>Peor escenario</li>
          </ul>
          <p>
            No es burocracia. Es fricción deliberada. Y esa fricción es la que te salva de los
            sesgos de disponibilidad y anclaje.
          </p>
        </div>

      </div>
    </section>
  );
}

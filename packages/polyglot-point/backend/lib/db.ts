const connectionString = process.env.DATABASE_URL;

let dbImpl: any;

if (!connectionString) {
  console.warn("?? Sin DATABASE_URL: usando DB falsa (modo bypass)");

  const fakeDb = new Proxy(
    {},
    {
      get(_target, prop) {
        // Cualquier llamada tipo db.loQueSea(...) devuelve una promesa resuelta
        return async (..._args: any[]) => {
          if (prop === "getDailyUsage") {
            return 0; // para lÃƒÂ­mites diarios, devuelve 0 uso
          }
          return; // las demÃƒÂ¡s funciones no hacen nada
        };
      },
    }
  );

  dbImpl = fakeDb;
} else {
  // TODO: implementaciÃƒÂ³n real de tu ORM cuando definas la DB
  // Ejemplo con Prisma:
  //
  // import { PrismaClient } from "@prisma/client";
  // const prisma = new PrismaClient();
  // dbImpl = prisma;
}

export const db = dbImpl;

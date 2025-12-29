const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const token = process.env.RAILWAY_TOKEN;

if (!token) {
  console.error("No existe RAILWAY_TOKEN. Ejecuta:  railway whoami");
  process.exit(1);
}

fetch("https://backboard.railway.app/graphql", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: `{ projects { edges { node { id name } } } }`
  }),
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

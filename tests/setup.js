// Configuration globale pour tous les tests Jest
// Ce fichier est exécuté avant chaque suite de tests

// Augmente le timeout par défaut de Jest de 5s à 15s
// Nécessaire pour les tests qui simulent des appels async (DB, API)
jest.setTimeout(15000)

// Supprime les logs console pendant les tests pour garder
// la sortie propre, sauf si la variable DEBUG_TESTS est définie
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // On garde error visible pour débugger plus facilement
    error: console.error
  }
}

// Nettoyage global après tous les tests du fichier
afterAll(async () => {
  // Laisse le temps aux connexions async de se fermer proprement
  await new Promise(resolve => setTimeout(resolve, 100))
})
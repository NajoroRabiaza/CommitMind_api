/**
 * Middleware de validation des paramètres d'URL entiers.
 *
 * Retourne un middleware Express qui vérifie que les paramètres
 * spécifiés sont des entiers positifs valides. Si l'un d'eux est
 * absent ou non numérique, la requête est rejetée avec un 400
 * avant d'atteindre le controller.
 *
 * Sans cette validation, parseInt() retourne NaN silencieusement,
 * ce qui produit un 404 trompeur au lieu d'un 400 explicite.
 *
 * Exemple d'utilisation :
 *   router.get('/repositories/:repoId/commits', jwtAuth, validateParams('repoId'), getCommits)
 */

const validateParams = (...params) => (req, res, next) => {
  for (const param of params) {
    const value = parseInt(req.params[param])

    if (isNaN(value) || value < 1) {
      return res.status(400).json({
        message: `parametre invalide : "${param}" doit etre un entier positif`
      })
    }
  }

  next()
}

module.exports = validateParams
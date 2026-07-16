/**
 * Middleware de validation des donnees entrantes via Zod.
 *
 * Expose une fonction fabrique validate(schema) qui retourne un middleware
 * Express. Si les donnees du body ne correspondent pas au schema, la requête
 * est rejeter avec un 400 avant d'atteindre le controller.
 *
 * Les donnees validees remplacent req.body, ce qui garantit que les controllers
 * reçoivent toujours des donnees propres et conformes au schema.
 */

const { z } = require('zod')

const conceptSchema = z.object({
  name: z.string({ required_error: 'le champ "name" est obligatoire' })
    .min(1, 'le champ "name" ne peut pas etre vide')
    .max(100, 'le champ "name" ne peut pas depasser 100 caracteres'),
  description: z.string()
    .max(500, 'la description ne peut pas depasser 500 caracteres')
    .optional()
})

const linkConceptSchema = z.object({
  // z.coerce.number() convertit automatiquement une string "42" en nombre 42,
  // ce qui evite des erreurs de type quand le client envoie du JSON serialise
  conceptId: z.coerce.number({
    required_error: 'le champ "conceptId" est obligatoire',
    invalid_type_error: 'conceptId doit etre un nombre'
  })
    .int('conceptid doit etre un entier')
    .positive('conceptid doit etre un nombre positif')
})

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)

  if (!result.success) {
    const errors = result.error.issues.map(e => ({
      field: e.path.join('.') || 'body',
      message: e.message
    }))

    return res.status(400).json({ message: 'validation echouee', errors })
  }

  req.body = result.data
  next()
}

module.exports = { validate, conceptSchema, linkConceptSchema }
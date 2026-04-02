const { z } = require('zod')

const conceptSchema = z.object({
  name: z.string({ required_error: 'Le champ "name" est obligatoire' })
    .min(1, 'Le champ "name" ne peut pas être vide')
    .max(100, 'Le champ "name" ne peut pas dépasser 100 caractères'),
  description: z.string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional()
})

const linkConceptSchema = z.object({
  conceptId: z.coerce.number({
    required_error: 'Le champ "conceptId" est obligatoire',
    invalid_type_error: 'conceptId doit être un nombre'
  })
    .int('conceptId doit être un entier')
    .positive('conceptId doit être un nombre positif')
})

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)

  if (!result.success) {
    const errors = result.error.issues.map(e => ({
      field: e.path.join('.') || 'body',
      message: e.message
    }))
    return res.status(400).json({ message: 'Validation échouée', errors })
  }

  req.body = result.data
  next()
}

module.exports = { validate, conceptSchema, linkConceptSchema }
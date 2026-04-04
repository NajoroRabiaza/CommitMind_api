// fichier : src/middleware/validate.js
// validation des donnees envoyees par le client
// avant qu'elles n'arrivent dans les controllers
// on utilise la librairie "zod" pour definir des
// schemas qui decrivent exactement ce qu'on attend
// si le client envoie des mauvaises donnees, on
// renvoie une erreur claire avant de faire quoi que ce soit

// on importe "z" depuis zod, c'est l'objet principal
// avec lequel on construit tous nos schemas de validation
const { z } = require('zod')

// schema pour creer ou modifier un concept
// ce schema decrit exactement ce que req.body doit contenir
// quand on appelle POST /concepts ou PUT /concepts/:id
const conceptSchema = z.object({
  // "name" est obligatoire et doit etre une chaine de caracteres
  // on enchaine des regles avec des points (methode chaining)
  name: z.string({ required_error: 'le champ "name" est obligatoire' })
    // le nom ne peut pas etre une chaine vide ""
    .min(1, 'le champ "name" ne peut pas etre vide')
    // le nom ne peut pas etre trop long (protection contre les abus)
    .max(100, 'le champ "name" ne peut pas depasser 100 caracteres'),

  // "description" est optionnelle (on peut ne pas l'envoyer)
  // c'est pour ca qu'on ajoute .optional() a la fin
  description: z.string()
    .max(500, 'la description ne peut pas depasser 500 caracteres')
    .optional()
})

// schema pour lier un concept a un commit
// ce schema decrit ce que req.body doit contenir
// quand on appelle POST /repositories/:id/commits/:id/concepts
const linkConceptSchema = z.object({
  // "conceptId" doit etre un nombre entier positif
  // z.coerce.number() est important : il essaie de convertir
  // une chaine "42" en nombre 42 automatiquement
  // sans coerce, si le client envoie "42" (string) au lieu de 42 (number)
  // zod retournerait une erreur alors que c'est valide
  conceptId: z.coerce.number({
    required_error: 'le champ "conceptId" est obligatoire',
    invalid_type_error: 'conceptId doit etre un nombre'
  })
    // .int() interdit les decimaux comme 3.14
    .int('conceptid doit etre un entier')
    // .positive() interdit 0 et les nombres negatifs
    .positive('conceptid doit etre un nombre positif')
})

// fonction middleware de validation
// validate est une "fabrique de middlewares" (higher-order function)
// elle prend un schema zod en argument et retourne un middleware express
// ca nous permet de reutiliser la meme logique pour plusieurs schemas
//
// exemple d'utilisation dans un fichier de route :
//   router.post('/concepts', jwtAuth, validate(conceptSchema), createConcept)
//   le middleware validate(conceptSchema) s'execute avant createConcept
const validate = (schema) => (req, res, next) => {
  // schema.safeParse() essaie de valider req.body selon les regles du schema
  // contrairement a schema.parse(), safeParse() ne lance pas d'erreur
  // elle retourne un objet avec :
  // { success: true, data: {...} }     si ca passe
  // { success: false, error: {...} }   si ca echoue
  const result = schema.safeParse(req.body)

  // si la validation a echoue, on construit une reponse d'erreur claire
  if (!result.success) {
    // result.error.issues est un tableau contenant toutes les erreurs trouvees
    // on le transforme en tableau d'objets plus lisibles
    const errors = result.error.issues.map(e => ({
      // e.path indique quel champ pose probleme (ex: ["name"])
      // join('.') le transforme en string "name" ou "champ.souschamp"
      // si path est vide on met 'body' par defaut
      field: e.path.join('.') || 'body',
      // e.message contient le message d'erreur qu'on a defini dans le schema
      message: e.message
    }))

    // on renvoie 400 (bad request) avec la liste des erreurs
    return res.status(400).json({ message: 'validation echouee', errors })
  }

  // si la validation a reussi, result.data contient les donnees
  // nettoyees et conformes au schema (les champs inconnus sont supprimes)
  // on remplace req.body par les donnees validees
  // ainsi le controller recoit toujours des donnees propres
  req.body = result.data

  // on passe au prochain middleware (ou au controller)
  next()
}

// on exporte les trois elements :
// validate        : la fonction fabrique de middleware
// conceptSchema   : le schema pour creer/modifier un concept
// linkConceptSchema : le schema pour lier un concept a un commit
module.exports = { validate, conceptSchema, linkConceptSchema }
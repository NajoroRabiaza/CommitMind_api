// le middleware de verification du token jwt
// il s'execute avant chaque route protegee pour
// il s'execute avant chaque route protegee pour
// s'assurer que la personne qui fait la requete
// est bien connectee et possede un token valide

// comment ca marche ?
// 1. l'utilisateur se connecte via /auth/github
// 2. on lui donne un token jwt (comme un badge d'acces)
// 3. a chaque requete suivante, il envoie ce token
// 4. ce middleware verifie que le badge est authentique
// et n'a pas expire

// jsonwebtoken est la librairie qui permet de creer,
// signer et verifier des tokens jwt
// un token jwt ressemble a ca : "eyJhbGci...abc123"
// il contient des donnees encodees (pas chiffrees) + une signature
const jwt = require('jsonwebtoken')

// on a besoin du client prisma pour aller chercher
// l'utilisateur dans la base de donnees apres avoir
// decode le token
const prisma = require('../utils/prisma')

// jwtAuth est une fonction middleware
// express lui passe 3 arguments automatiquement :
// req : l'objet requete (ce que le client a envoye)
// res : l'objet reponse (ce qu'on va renvoyer)
// next : une fonction a appeler pour passer au prochain middleware
// on la declare async car on fait des appels a la base de donnees
const jwtAuth = async (req, res, next) => {
  try {
    // le client doit envoyer son token dans le header http
    // "authorization" avec le format : "Bearer mon_token_ici"
    // req.headers contient tous les headers de la requete
    const authHeader = req.headers.authorization

    // on verifie deux choses :
    // 1. que le header authorization existe
    // 2. qu'il commence bien par "Bearer " (avec l'espace)
    // si l'une des deux conditions echoue, on refuse la requete
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'unauthorized. please login first at /auth/github'
      })
    }

    // on extrait uniquement le token depuis la chaine "Bearer <token>"
    // split(' ') coupe la chaine en deux parties sur l'espace :
    // partie 0 : "Bearer"
    // partie 1 : le token lui-meme
    // on prend l'index [1] pour avoir juste le token
    const token = authHeader.split(' ')[1]

    // jwt.verify() fait deux choses en meme temps :
    // 1. il verifie que la signature du token est valide
    // (que personne n'a modifie le token)
    // 2. il verifie que le token n'a pas expire (expiresIn)
    // si l'une des deux echoue, jwt lance une erreur
    // et on tombe directement dans le bloc catch en bas
    // JWT_SECRET est la cle secrete qu'on avait utilisee
    // pour signer le token lors de la connexion
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // decoded contient maintenant les donnees qu'on avait
    // mises dans le token au moment de la connexion
    // dans auth.js on avait mis : { userId: req.user.id }
    // donc decoded.userId contient l'id de l'utilisateur

    // on va chercher l'utilisateur dans la base de donnees
    // pour s'assurer qu'il existe encore
    // (il pourrait avoir ete supprime entre-temps)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    // si aucun utilisateur n'est trouve, on refuse
    if (!user) {
      return res.status(401).json({ message: 'user not found' })
    }

    // on attache l'utilisateur complet a l'objet req
    // ainsi les controllers qui viennent apres ce middleware
    // peuvent faire req.user pour acceder aux infos de l'utilisateur
    // sans avoir a refaire une requete en base
    req.user = user

    // next() dit a express de continuer vers le prochain
    // middleware ou vers le controller de la route
    next()
  } catch (error) {
    // si jwt.verify() a lance une erreur (token invalide,
    // expire, ou mal forme), on arrive ici et on refuse
    return res.status(401).json({ message: 'invalid or expired token' })
  }
}

// on exporte la fonction pour pouvoir l'utiliser dans les routes
// exemple d'utilisation dans un fichier de route :
// router.get('/commits', jwtAuth, getCommits)
module.exports = jwtAuth
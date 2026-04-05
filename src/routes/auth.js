// ici c'est toutes les routes liees a l'authentification
// connexion github, callback, profil, deconnexion
// la liste des routes definies ici :
//    GET /auth/github = demarre la connexion oauth github
//    GET /auth/github/callback = github renvoie l'utilisateur ici apres auth
//    GET /auth/failure = page d'erreur si la connexion echoue
//    GET /auth/me = retourne le profil de l'utilisateur connecte
//    GET /auth/logout = deconnexion (cote client)

const express = require('express')

// on importe passport directement (pas notre fichier de config)
// car ici on utilise passport.authenticate() qui est une methode
// de la librairie passport elle-meme
const passport = require('passport')

// jsonwebtoken pour generer le token jwt apres connexion reussie
const jwt = require('jsonwebtoken')

// notre middleware de verification de token jwt
// on l'utilise sur /auth/me pour proteger cette route
const jwtAuth = require('../middleware/jwtAuth')

// express.Router() cree un mini-routeur independant
// on y branche toutes nos routes puis on exporte le tout
// app.js l'enregistre ensuite avec app.use(authRouter)
const router = express.Router()

// route : GET /auth/github
// le point de depart du flux oauth
//     quand l'utilisateur visite cette url,
//     passport le redirige automatiquement vers github
//     github lui montre alors une page "autoriser cette app ?"
router.get('/auth/github',
  // passport.authenticate('github', ...) est un middleware
  // il construit l'url github et fait la redirection
  passport.authenticate('github', {
    // scope definit les permissions qu'on demande a l'utilisateur
    // 'user:email' : lire l'adresse email du compte
    // 'repo' : lire les depots (meme les prives)
    scope: ['user:email', 'repo'],

    // session: false signifie qu'on ne veut pas de session serveur
    // on utilise des tokens jwt a la place
    // ca rend l'api stateless (sans etat cote serveur)
    session: false
  })
)

// route : GET /auth/github/callback
// github renvoie l'utilisateur ici apres qu'il a
//  accepte (ou refuse) la connexion
//  c'est l'url qu'on a configure dans callbackURL
//  dans le fichier passport.js
router.get('/auth/github/callback',
  // premier middleware : passport verifie le "code" envoye par github
  // echange ce code contre un accessToken
  // appelle notre fonction dans passport.js pour upsert l'utilisateur
  // si ca echoue, redirige vers /auth/failure
  passport.authenticate('github', {
    failureRedirect: '/auth/failure',
    session: false
  }),

  // deuxieme middleware : si passport a reussi, req.user est disponible
  // on genere un token jwt et on le renvoie au client
  (req, res) => {
    // jwt.sign() cree un token signe avec trois arguments :
    //   1. le payload : les donnees qu'on veut stocker dans le token
    //    on met uniquement l'id pour garder le token leger
    //   2. la cle secrete : pour signer et verifier plus tard
    //   3. les options : ici on definit une expiration de 7 jours
    //    apres 7 jours le token ne sera plus accepte par jwtAuth.js
    const token = jwt.sign(
      { userId: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // on renvoie le token et les infos de base de l'utilisateur
    // le client devra stocker ce token (localStorage, cookie, etc.)
    // et l'envoyer dans chaque requete suivante via le header Authorization
    res.json({
      message: 'login successful',
      token,
      user: {
        id: req.user.id,
        username: req.user.username,
        avatarUrl: req.user.avatarUrl
      }
    })
  }
)

// route : GET /auth/failure
// role : page de secours si la connexion github echoue
// par exemple si l'utilisateur clique sur "annuler"
// sur la page github
router.get('/auth/failure', (req, res) => {
  res.status(401).json({ message: 'authentication failed' })
})

// route : GET /auth/me
// renvoyer les informations de l'utilisateur connecte
// route protegee : il faut envoyer le token jwt
//  dans le header Authorization: Bearer <token>
router.get('/auth/me', jwtAuth, (req, res) => {
  // jwtAuth a deja verifie le token et mis l'utilisateur dans req.user
  // on renvoie juste ses informations publiques
  // on ne renvoie pas accessToken ni email par securite
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      avatarUrl: req.user.avatarUrl
    }
  })
})

// route : GET /auth/logout
// deconnexion de l'utilisateur
// comme on utilise des tokens jwt et pas de sessions,
// il n'y a rien a effacer cote serveur
// c'est le client qui doit supprimer son token
router.get('/auth/logout', (req, res) => {
  // on informe simplement le client qu'il doit supprimer le token
  // de son cote (localStorage, cookie, etc.)
  res.json({ message: 'logout successful. delete your token.' })
})

// export pour que app.js puisse le brancher
module.exports = router
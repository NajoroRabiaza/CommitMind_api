// On configure de l'authentification oauth via github
// oauth c'est un protocole qui permet a un utilisateur
// de se connecter avec son compte github sans qu'on
// ait jamais a stocker son mot de passe
//
// le flux oauth github fonctionne en 4 etapes :
// 1. on redirige l'utilisateur vers github (/auth/github)
// 2. github lui demande d'autoriser notre application
// 3. si il accepte, github nous renvoie un "code"
// a l'adresse callbackURL qu'on a configure
// 4. passport echange ce code contre un accessToken
// et appelle la fonction qu'on a ecrite ci-dessous

// passport est la librairie principale qui gere l'authentification
// elle ne sait pas comment parler a github tout seul,
// il faut lui "brancher" une strategie
const passport = require('passport')

// GitHubStrategy est la strategie qui enseigne a passport
// comment faire le flux oauth avec github specifiquement
// elle vient du package "passport-github2"
const GitHubStrategy = require('passport-github2').Strategy

// on a besoin de prisma pour sauvegarder (ou mettre a jour)
// l'utilisateur dans notre base de donnees apres connexion
const prisma = require('../utils/prisma')

// passport.use() enregistre la strategie github dans passport
// on lui passe deux choses :
// 1. un objet de configuration (clientID, clientSecret, callbackURL)
// 2. une fonction callback qui s'execute apres que github
// a confirme l'identite de l'utilisateur
passport.use(
  new GitHubStrategy(
    {
      // clientID et clientSecret sont les identifiants de notre
      // "application github" qu'on a cree sur github.com
      // ils prouvent a github que c'est bien notre app qui demande
      // ces valeurs sont dans le fichier .env pour ne pas les
      // exposer dans le code source
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,

      // callbackURL est l'adresse ou github va renvoyer l'utilisateur
      // apres qu'il ait accepte (ou refuse) la connexion
      // on utilise la variable d'env si elle existe,
      // sinon on utilise localhost pour le developpement local
      callbackURL: process.env.CALLBACK_URL || 'http://localhost:3000/auth/github/callback'
    },

    // cette fonction est appelee par passport apres le retour de github
    // github nous donne :
    //   accessToken  : le token pour appeler l'api github au nom de l'user
    //   refreshToken : pour renouveler le token (souvent null avec github)
    //   profile      : les infos publiques du compte github de l'utilisateur
    //   done         : une fonction a appeler pour dire a passport si ca a marche
    async (accessToken, refreshToken, profile, done) => {
      try {
        // on utilise upsert pour gerer les deux cas en une seule requete :
        // cas 1 : l'utilisateur se connecte pour la premiere fois
        // → on cree un nouvel enregistrement (bloc "create")
        // cas 2 : l'utilisateur s'est deja connecte avant
        // → on met a jour ses infos (bloc "update")
        // le critere de recherche est le githubId (unique par compte github)
        const user = await prisma.user.upsert({
          where: { githubId: profile.id.toString() },

          // si l'utilisateur existe deja, on rafraichit ses donnees
          // car son pseudo ou sa photo peuvent avoir change sur github
          // on met aussi a jour l'accessToken car github en genere
          // un nouveau a chaque connexion
          update: {
            username: profile.username,
            // profile.photos?.[0]?.value : le ?. s'appelle "optional chaining"
            // ca evite une erreur si photos est vide ou undefined
            // on prend la premiere photo du tableau si elle existe
            avatarUrl: profile.photos?.[0]?.value,
            accessToken: accessToken
          },

          // si l'utilisateur n'existe pas encore, on cree son compte
          create: {
            // profile.id est un nombre, on le convertit en string
            // car notre schema prisma stocke githubId en String
            githubId: profile.id.toString(),
            username: profile.username,
            // l'email peut etre null si le compte github n'en a pas de public
            // profile.emails?.[0]?.value : on prend le premier email si il existe
            email: profile.emails?.[0]?.value,
            avatarUrl: profile.photos?.[0]?.value,
            accessToken: accessToken
          }
        })

        // done(null, user) signifie "tout s'est bien passe"
        // le premier argument est l'erreur (null = pas d'erreur)
        // le second argument est l'utilisateur qu'on passe a passport
        // passport va ensuite le mettre dans req.user
        return done(null, user)
      } catch (error) {
        // done(error, null) signifie "il y a eu une erreur"
        // passport va gerer cette erreur et rediriger vers /auth/failure
        return done(error, null)
      }
    }
  )
)

// on exporte l'objet passport configure
// app.js va l'importer pour appeler passport.initialize()
module.exports = passport
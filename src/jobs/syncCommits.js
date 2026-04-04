// fichier : src/jobs/syncCommits.js
// tache automatique qui tourne en arriere-plan
// toutes les heures pour synchroniser les nouveaux
// commits de tous les utilisateurs de l'application
//
// pourquoi une tache automatique ?
// quand un utilisateur pousse du code sur github, notre base
// de donnees n'est pas mise a jour automatiquement
// il faudrait qu'il clique manuellement sur "sync" a chaque fois
// cette tache cron le fait pour lui en arriere-plan
// toutes les heures, pour tous les utilisateurs inscrits
//
// qu'est-ce qu'un cron ?
// un "cron job" c'est une tache planifiee qui s'execute
// a intervalles reguliers selon une expression cron
// l'expression "0 * * * *" se lit : "a la minute 0 de chaque heure"
// donc la tache tourne a 01h00, 02h00, 03h00, etc.

// node-cron est la librairie qui permet de planifier des taches
// elle lit les expressions cron et appelle notre fonction au bon moment
const cron = require('node-cron')

// on a besoin du client prisma pour lire les users et repos
// et pour sauvegarder les nouveaux commits trouves
const prisma = require('../utils/prisma')

// on importe uniquement la fonction dont on a besoin
// depuis le service github
const { getRepositoryCommits } = require('../services/githubService')

// fonction : syncAllUsersCommits
// parcourir tous les utilisateurs, puis tous leurs
// depot, et sauvegarder les nouveaux commits trouves
// cette fonction est appelee automatiquement par le cron
// mais on peut aussi l'appeler manuellement pour les tests
const syncAllUsersCommits = async () => {
  // on affiche un message horodate au debut pour pouvoir
  // suivre les executions dans les logs du serveur
  console.log(`[cron] starting sync - ${new Date().toISOString()}`)

  // le try/catch exterieur attrape les erreurs fatales
  // celles qui empeche de recuperer la liste des utilisateurs
  try {
    // on recupere tous les utilisateurs de notre base de donnees
    // pour pouvoir boucler sur chacun d'eux
    const users = await prisma.user.findMany()
    console.log(`[cron] found ${users.length} users to sync`)

    // boucle sur chaque utilisateur
    for (const user of users) {
      console.log(`[cron] syncing user: ${user.username}`)

      // on recupere tous les depots de cet utilisateur
      // on ne prend que ses depots, pas ceux des autres
      const repositories = await prisma.repository.findMany({
        where: { userId: user.id }
      })

      // boucle sur chaque depot de cet utilisateur
      for (const repository of repositories) {
        // ce try/catch interieur est important :
        // si un depot echoue (token expire, repo supprime, etc.)
        // on continue avec les autres depots sans tout arreter
        try {
          // on decoupe fullName ("john/commitmind") en deux parties :
          // owner = "john"
          // repo  = "commitmind"
          // c'est ce que l'api github attend comme arguments separes
          const [owner, repo] = repository.fullName.split('/')

          // on appelle github pour recuperer les commits
          // on passe repository.lastSyncedAt comme date de depart
          // pour ne recuperer que les commits plus recents que
          // la derniere synchronisation
          // si lastSyncedAt est null (jamais synchronise), github
          // renvoie tous les commits depuis le debut
          const commits = await getRepositoryCommits(
            user.accessToken, // le token oauth de cet utilisateur
            owner, // ex: "john"
            repo, // ex: "commitmind"
            repository.lastSyncedAt  // date de la derniere sync (ou null)
          )

          // compteur pour le log final
          let newCommitsCount = 0

          // boucle sur chaque commit recupere depuis github
          for (const commit of commits) {
            // on verifie si ce commit existe deja dans notre base
            // on utilise le sha comme identifiant car il est unique
            // (deux commits ne peuvent pas avoir le meme sha dans git)
            const existing = await prisma.commit.findUnique({
              where: { sha: commit.sha }
            })

            // on ne sauvegarde le commit que s'il n'existe pas encore
            // ca evite les doublons si la tache tourne plusieurs fois
            if (!existing) {
              await prisma.commit.create({
                data: {
                  sha: commit.sha,
                  message: commit.message,
                  authorName: commit.authorName,
                  authorEmail: commit.authorEmail,
                  committedAt: commit.committedAt,
                  url: commit.url,
                  repositoryId: repository.id  // lien vers le depot parent
                }
              })
              // on incremente le compteur seulement si on a vraiment ajoute
              newCommitsCount++
            }
          }

          // on met a jour la date de derniere synchronisation du depot
          // a la prochaine execution, on ne recuperera que les commits
          // posterieurs a cette nouvelle date
          await prisma.repository.update({
            where: { id: repository.id },
            data: { lastSyncedAt: new Date() }
          })

          // on affiche un resume pour ce depot dans les logs
          console.log(`[cron] ${repository.fullName} = ${newCommitsCount} new commits`)

        } catch (repoError) {
          // si ce depot specifique a echoue, on log l'erreur
          // mais on continue avec le depot suivant (on ne plante pas tout)
          console.error(`[cron] error syncing ${repository.fullName}: ${repoError.message}`)
        }
      }
    }

    // log de fin avec horodatage pour mesurer la duree
    console.log(`[cron] sync completed - ${new Date().toISOString()}`)

  } catch (error) {
    // erreur fatale : on n'a meme pas pu recuperer les utilisateurs
    // on log le probleme mais le serveur continue de tourner
    // la prochaine execution du cron reessaiera automatiquement
    console.error(`[cron] fatal error: ${error.message}`)
  }
}

// fonction : startSyncJob
// enregistrer la tache cron et la demarrer
// appelee une seule fois dans server.js au demarrage
const startSyncJob = () => {
  // cron.schedule() prend deux arguments :
  // 1. l'expression cron qui definit la frequence
  // 2. la fonction a executer
  //
  // l'expression "0 * * * *" se decompose comme ca :
  // 0 = minute 0
  // * = toutes les heures
  // * = tous les jours du mois
  // * = tous les mois
  // * = tous les jours de la semaine
  // resultat : la fonction s'execute a xx:00 chaque heure
  cron.schedule('0 * * * *', syncAllUsersCommits)

  // on confirme que la planification est en place
  console.log('[cron] sync job scheduled - runs every hour')
}

// on exporte les deux fonctions :
// startSyncJob = appelee au demarrage du serveur (server.js)
// syncAllUsersCommits  = exportee pour pouvoir la tester manuellement
module.exports = { startSyncJob, syncAllUsersCommits }
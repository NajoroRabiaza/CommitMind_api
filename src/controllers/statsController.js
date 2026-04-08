// calculer et renvoyer toutes les statistiques
// de l'utilisateur connecte en une seule requete
// c'est ce qui permet d'afficher un tableau de bord
//
// ce controller fait plusieurs requetes prisma independantes
// et assemble leurs resultats dans un seul objet de reponse :
//  - compteurs globaux (commits, depots, concepts)
//  - evolution des commits par mois
//  - top 5 des concepts les plus utilises
//  - top 5 des depots les plus actifs

// client prisma pour toutes les requetes en base
const prisma = require('../utils/prisma')

// fonction : getStats
// route : GET /stats
//  assembler toutes les statistiques de l'utilisateur
//  et les renvoyer dans un seul objet json structure
const getStats = async (req, res) => {
  try {

    // compteur 1 : nombre total de commits
    // on ne peut pas filtrer directement sur userId pour les commits
    // car commits n'a pas de champ userId direct dans le schema
    // les commits appartiennent a des depots, et les depots a des users
    // on filtre donc par relation : "les commits dont le depot appartient a cet user"
    // prisma traduit ca en une jointure sql automatiquement
    const totalCommits = await prisma.commit.count({
      where: {
        repository: { userId: req.user.id }
      }
    })

    // compteur 2 : nombre total de depots
    // les depots ont un userId direct, la requete est plus simple
    const totalRepositories = await prisma.repository.count({
      where: { userId: req.user.id }
    })

    // compteur 3 : nombre total de concepts
    // meme chose, concepts a un userId direct
    const totalConcepts = await prisma.concept.count({
      where: { userId: req.user.id }
    })

    // calcul des commits par mois
    // on recupere uniquement la date de chaque commit (pas tout l'objet)
    // "select" en prisma permet de ne recuperer que certains champs
    // c'est plus efficace que de charger toutes les donnees si on
    // n'a besoin que de la date
    const commits = await prisma.commit.findMany({
      where: {
        repository: { userId: req.user.id }
      },
      select: {
        committedAt: true  // on ne prend que la date, rien d'autre
      }
    })

    // on va construire un objet de comptage par mois
    // la cle sera le mois au format "YYYY-MM" (ex: "2026-03")
    // la valeur sera le nombre de commits ce mois-la
    const commitsByMonth = {}

    for (const commit of commits) {
      // on convertit la date en objet Date javascript
      const date = new Date(commit.committedAt)

      // on construit la cle du mois :
      //  date.getFullYear() retourne l'annee (ex: 2026)
      //  date.getMonth() retourne 0 a 11, donc on ajoute 1 pour avoir 1 a 12
      //  String(...).padStart(2, '0') ajoute un zero devant si besoin
      //  ex: mars => getMonth() = 2 => +1 = 3 => padStart => "03"
      //  resultat final : "2026-03"
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      // si ce mois n'existe pas encore dans l'objet, on l'initialise a 0
      // puis on l'incremente de 1
      // (commitsByMonth[monthKey] || 0) retourne 0 si la cle n'existe pas
      commitsByMonth[monthKey] = (commitsByMonth[monthKey] || 0) + 1
    }

    // top 5 des concepts les plus utilises
    // on utilise include avec _count pour compter les relations
    // sans avoir a faire une requete separee par concept
    // _count.commits nous donne le nombre de liaisons commitconcept
    // pour chaque concept, c'est a dire combien de commits y sont lies
    const topConcepts = await prisma.concept.findMany({
      where: { userId: req.user.id },
      include: {
        // _count est une fonctionnalite speciale de prisma
        // elle ajoute un champ "._count" a chaque resultat
        // avec le nombre de relations associees
        _count: {
          select: { commits: true }  // on compte uniquement les commits lies
        }
      },
      // on trie par nombre de commits lies, du plus grand au plus petit
      orderBy: {
        commits: {
          _count: 'desc' // "desc" = descendant = du plus grand au plus petit
        }
      },
      take: 5  // on ne prend que les 5 premiers
    })

    // top 5 des depots les plus actifs
    // meme logique que pour les concepts, mais sur les depots
    // on compte le nombre de commits par depot
    const topRepositories = await prisma.repository.findMany({
      where: { userId: req.user.id },
      include: {
        _count: {
          select: { commits: true }  // nombre de commits dans chaque depot
        }
      },
      orderBy: {
        commits: {
          _count: 'desc'
        }
      },
      take: 5  // top 5 seulement
    })

    // construction et envoi de la reponse finale
    res.json({
      // chiffres globaux pour le resume en haut du tableau de bord
      overview: {
        totalCommits,
        totalRepositories,
        totalConcepts
      },

      // graphique d'evolution des commits dans le temps
      // Object.entries() transforme l'objet en tableau de paires [cle, valeur]
      // ex: { "2026-03": 12 } => [["2026-03", 12]]
      // .map() restructure chaque paire en objet { month, count }
      // .sort() trie par ordre chronologique (les plus anciens en premier)
      // localeCompare compare les chaines "2026-01" < "2026-03" correctement
      commitsByMonth: Object.entries(commitsByMonth)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month)),

      // on reformate les concepts pour ne garder que ce qu'on veut afficher
      // c._count.commits est le nombre de commits lies a ce concept
      topConcepts: topConcepts.map(c => ({
        id: c.id,
        name: c.name,
        totalCommits: c._count.commits  // on renomme _count.commits en totalCommits
      })),

      // meme reformatage pour les depots
      topRepositories: topRepositories.map(r => ({
        id: r.id,
        name: r.name,
        totalCommits: r._count.commits
      }))
    })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// on exporte la fonction pour que le fichier de routes puisse l'utiliser
module.exports = { getStats }
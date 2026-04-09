// construire l'historique filtre et groupe par mois
// de tous les commits de l'utilisateur connecte
// c'est la vue "journal de bord" de commitmind
//
// ce controller :
//   il construit un filtre prisma dynamiquement selon
//   les query params envoyes par le client
//   si aucun filtre n'est fourni = on renvoie tout
//   si des filtres sont fournis = on les applique a la requete
//
// query params supportés :
//   ?search=fix = cherche dans les messages de commits
//   ?month=2026-03  = filtre sur un mois precis
//   ?concept=jwt  = filtre sur les commits lies a un concept

// client prisma pour toutes les requetes en base
const prisma = require('../utils/prisma')

// fonction : getHistory
// route : GET /history
// recuperer tous les commits de l'utilisateur,
// filtres selon les query params,
//  et les grouper par mois pour former une timeline
const getHistory = async (req, res) => {
  try {
    // on extrait les trois filtres optionnels depuis l'url
    // si un parametre n'est pas fourni, sa valeur sera undefined
    // ex: GET /history?search=fix&month=2026-03
    //  search = "fix", month = "2026-03", concept = undefined
    const { search, month, concept } = req.query

    // construction du filtre de base
    // on commence avec un filtre minimal : seulement les commits
    // dont le depot appartient a l'utilisateur connecte
    // les commits n'ont pas de userId direct, donc on filtre
    // via la relation "repository" qui elle a un userId
    const where = {
      repository: {
        userId: req.user.id  // securite : on ne voit que ses propres commits
      }
    }

    // ajout conditionnel du filtre de recherche
    // on n'ajoute ce filtre que si search est fourni et non vide
    // "contains" est l'equivalent du LIKE '%...%' en sql
    // "mode: insensitive" rend la recherche insensible a la casse
    // ex: "fix" matchera "Fix", "FIX", "fix login bug", etc.
    if (search) {
      where.message = {
        contains: search,
        mode: 'insensitive'
      }
    }

    // ajout conditionnel du filtre par mois
    // l'utilisateur envoie un mois au format "YYYY-MM" (ex: "2026-03")
    // on doit le convertir en une plage de dates pour prisma
    // car prisma ne comprend pas le format "YYYY-MM" directement
    if (month) {
      // on decoupe "2026-03" en ["2026", "03"]
      const [year, monthNumber] = month.split('-')

      // on cree la date de debut du mois :
      // new Date(annee, mois - 1, jour)
      // attention : les mois javascript vont de 0 a 11
      // donc mars = monthNumber 3 = on fait -1 = index 2
      // ex: new Date(2026, 2, 1) = 1er mars 2026 a minuit
      const start = new Date(parseInt(year), parseInt(monthNumber) - 1, 1)

      // on cree la date de debut du mois suivant comme borne exclusive
      // ex: new Date(2026, 3, 1) = 1er avril 2026 a minuit
      // utiliser le debut du mois suivant plutot que la fin du mois
      // evite les problemes avec les heures (23:59:59 vs 00:00:00)
      const end = new Date(parseInt(year), parseInt(monthNumber), 1)

      // "gte" = greater than or equal (>=)  = a partir du debut du mois
      // "lt"  = less than (<)  = avant le debut du mois suivant
      // ensemble ils definissent une plage exclusive precise
      where.committedAt = {
        gte: start,
        lt: end
      }
    }

    // ajout conditionnel du filtre par concept
    // on veut les commits qui ont AU MOINS UN concept
    // dont le nom contient la valeur cherchee
    // la structure imbrique traduit une jointure complexe :
    //   commit = commitconcept (liaison) = concept = name
    if (concept) {
      where.concepts = {
        // "some" signifie "au moins un des elements doit correspondre"
        // c'est l'equivalent d'un EXISTS en sql
        some: {
          concept: {
            name: {
              contains: concept,
              mode: 'insensitive' // insensible a la casse ici aussi
            }
          }
        }
      }
    }

    // requete principale avec toutes les relations
    // on recupere les commits avec les filtres construits ci-dessus
    const commits = await prisma.commit.findMany({
      where, // le filtre dynamique qu'on a construit

      // "include" charge les relations associees en meme temps
      // sans include, concepts, files et repository seraient undefined
      include: {
        // on charge les liaisons commitconcept avec le concept complet
        // "concepts" ici c'est la relation dans commit (table commitconcept)
        concepts: {
          include: {
            concept: true  // on veut l'objet concept complet (nom, id, etc.)
          }
        },
        // on charge tous les fichiers modifies de chaque commit
        files: true,
        // on charge le nom du depot sans charger tout l'objet
        // "select" dans include permet de choisir les champs
        repository: {
          select: {
            name: true  // on prend seulement le nom, pas les autres champs
          }
        }
      },
      // on trie du plus recent au plus ancien
      orderBy: {
        committedAt: 'desc'
      }
    })

    // groupement par mois
    // on transforme le tableau plat de commits en un objet
    // organise par cle "YYYY-MM"
    // c'est ce groupement qui cree la structure "timeline"
    const history = {}

    for (const commit of commits) {
      // on calcule la cle du mois pour ce commit
      const date = new Date(commit.committedAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      // si ce mois n'existe pas encore dans notre objet,
      // on cree une entree avec la structure attendue
      if (!history[monthKey]) {
        history[monthKey] = {
          month: monthKey, // la cle du mois (ex: "2026-03")
          totalCommits: 0, // compteur qu'on incrementera
          commits: []  // tableau vide qu'on remplira
        }
      }

      // on reformate le commit pour ne garder que ce qui est utile
      // et pour aplatir les structures imbriquees
      const formattedCommit = {
        id: commit.id,
        sha: commit.sha,
        message: commit.message,
        committedAt: commit.committedAt,

        // on ne prend que le nom du depot, pas tout l'objet
        repository: commit.repository.name,

        // on transforme le tableau de liaisons commitconcept
        // en tableau simple de concepts { id, name }
        // commit.concepts est un tableau de commitconcept
        // chaque element a un champ "concept" qui contient le vrai concept
        concepts: commit.concepts.map(cc => ({
          id: cc.concept.id,
          name: cc.concept.name
        })),

        // on ne renvoie pas les fichiers en detail mais juste le compte
        // .length donne la taille du tableau
        totalFiles: commit.files.length
      }

      // on ajoute le commit formate dans son groupe de mois
      history[monthKey].commits.push(formattedCommit)

      // on incremente le compteur de commits pour ce mois
      history[monthKey].totalCommits++
    }

    // Object.values() transforme l'objet { "2026-03": {...}, ... }
    // en tableau d'objets [{month: "2026-03", ...}, ...]
    // c'est plus facile a parcourir pour le client
    const timeline = Object.values(history)

    // on renvoie la reponse complete avec les filtres appliques,
    // les compteurs globaux et la timeline groupee par mois
    res.json({
      // on renvoie les filtres utilises pour que le client sache
      // ce qui a ete applique (utile pour l'affichage)
      filters: { search, month, concept },
      totalMonths: timeline.length, // nombre de mois differents
      totalCommits: commits.length, // nombre total de commits trouves
      timeline  // la liste groupee par mois
    })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// on exporte la fonction pour que le fichier de routes puisse l'utiliser
module.exports = { getHistory }
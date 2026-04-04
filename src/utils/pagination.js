// src/utils/pagination.js
// fonctions utilitaires pour paginer les resultats
// quand on a beaucoup de donnees (ex: 500 commits),
// on ne les renvoie pas toutes en une seule fois
// on les decoupe en "pages" comme dans un livre
//
// exemple concret :
// GET /commits?page=2&limit=10
// => renvoie les commits 11 a 20 (la deuxieme page de 10)
//
// ce fichier exporte deux fonctions :
// getPagination : lit les parametres de la requete et calcule le skip
// paginatedResponse : formate la reponse avec les metadonnees de pagination

// getPagination
// extraire et securiser les parametres de pagination
// depuis les query params de la requete (req.query)
// query = c'est req.query, qui contient les parametres
// passes dans l'url apres le "?" (ex: ?page=2&limit=10)
// un objet { page, limit, skip }
const getPagination = (query) => {
  // parseInt() convertit la valeur string de l'url en nombre entier
  // ex: "2" devient 2
  // si query.page est absent ou invalide, parseInt retourne NaN
  // "|| 1" remplace NaN par 1 (page par defaut = premiere page)
  // Math.max(1, ...) garantit qu'on ne peut pas demander la page 0
  // ou une page negative, la valeur minimale sera toujours 1
  const page = Math.max(1, parseInt(query.page) || 1)

  // on securise aussi la limite avec deux bornes :
  // Math.max(1, ...) : minimum 1 resultat par page (pas 0 ni negatif)
  // Math.min(100, ...) : maximum 100 resultats par page
  // ca evite qu'un client demande limit=99999 et charge toute la base
  // valeur par defaut : 20 resultats par page si non specifie
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20))

  // skip est le nombre d'enregistrements a sauter avant de commencer
  // c'est ce que prisma utilise avec l'option "skip" dans findMany()
  // formule : (page - 1) * limit
  // page 1 : skip = 0  = on commence depuis le debut
  // page 2 : skip = 20 = on saute les 20 premiers
  // page 3 : skip = 40 = on saute les 40 premiers
  const skip = (page - 1) * limit

  // on retourne les trois valeurs dont on a besoin :
  // page  = pour savoir ou on est
  // limit = pour le "take" de prisma (combien on prend)
  // skip  = pour le "skip" de prisma (combien on saute)
  return { page, limit, skip }
}


// fonction : paginatedResponse
// construire l'objet de reponse standard avec les
// donnees et toutes les metadonnees de pagination
// data = le tableau de resultats de la requete prisma
// total = le nombre total d'enregistrements en base
// page = la page actuelle
// limit = le nombre de resultats par page
// retourne : un objet structure avec data + pagination
const paginatedResponse = (data, total, page, limit) => {
  // Math.ceil() arrondit au superieur
  // ex: 25 resultats / 10 par page = 2.5 = 3 pages
  // sans Math.ceil on perdrait la derniere page incomplete
  const totalPages = Math.ceil(total / limit)

  return {
    // les donnees de la page demandee (tableau de commits, concepts, etc.)
    data,

    // metadonnees de pagination utiles pour le client
    // le client peut s'en servir pour afficher "page 2 sur 5"
    // ou pour savoir s'il doit afficher un bouton "page suivante"
    pagination: {
      total, // nombre total d'enregistrements dans la base
      page, // page actuelle
      limit, // nombre de resultats par page
      totalPages, // nombre total de pages disponibles

      // true si on n'est pas encore a la derniere page
      // le client peut s'en servir pour activer/desactiver le bouton "suivant"
      hasNextPage: page < totalPages,

      // true si on n'est pas sur la premiere page
      // le client peut s'en servir pour activer/desactiver le bouton "precedent"
      hasPreviousPage: page > 1
    }
  }
}

// on exporte les deux fonctions pour les utiliser dans les controllers
module.exports = { getPagination, paginatedResponse }
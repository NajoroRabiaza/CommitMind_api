/**
 * Utilitaires de chiffrement symétrique AES-256-GCM.
 *
 * Utilisé pour chiffrer les accessToken GitHub avant stockage en base
 * et les déchiffrer au moment de leur utilisation.
 *
 * AES-256-GCM est choisi car il offre à la fois la confidentialité
 * et l'authenticité des données (mode AEAD) : toute modification
 * du texte chiffré sera détectée au déchiffrement.
 *
 * Format du texte chiffré stocké en base :
 *   iv:authTag:encryptedData  (chaque partie encodée en hex)
 *
 * La clé ENCRYPTION_KEY doit être une chaîne hexadécimale de 64
 * caractères (= 32 octets = 256 bits). Générer avec :
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const crypto = require('crypto')

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const KEY_LENGTH = 32

const getKey = () => {
  const hex = process.env.ENCRYPTION_KEY

  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY doit etre une chaine hexadecimale de 64 caracteres')
  }

  return Buffer.from(hex, 'hex')
}

/**
 * Chiffre une chaîne de caractères avec AES-256-GCM.
 * Retourne une chaîne au format "iv:authTag:encrypted" encodée en hex.
 */
const encrypt = (text) => {
  const key = getKey()
  // Un IV (vecteur d'initialisation) aléatoire est généré à chaque chiffrement
  // pour garantir que deux chiffrements du même texte donnent des résultats différents
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ])

  // L'authTag permet de vérifier l'intégrité des données au déchiffrement
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Déchiffre une chaîne produite par encrypt().
 * Lève une erreur si les données ont été altérées (authTag invalide).
 */
const decrypt = (encryptedText) => {
  const key = getKey()
  const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':')

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]).toString('utf8')
}

module.exports = { encrypt, decrypt }
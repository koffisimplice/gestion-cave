package com.gestioncave.utilisateur;

/**
 * Rôles applicatifs.
 * PROPRIETAIRE : accès complet (tous les maquis, marges, bénéfices, charges).
 * GERANT       : saisie stock/ventes de son/ses maquis, sans visibilité financière.
 */
public enum Role {
    PROPRIETAIRE,
    GERANT
}

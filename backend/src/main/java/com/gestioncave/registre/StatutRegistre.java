package com.gestioncave.registre;

/** État d'une ligne de registre journalier. */
public enum StatutRegistre {
    /** Journée en cours : commande et stock restant encore modifiables. */
    OUVERT,
    /** « Point arrêté » : journée verrouillée, plus aucune modification possible. */
    CLOTURE
}

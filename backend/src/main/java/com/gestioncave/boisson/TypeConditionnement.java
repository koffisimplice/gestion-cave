package com.gestioncave.boisson;

/**
 * Type de conditionnement dans lequel une boisson est achetée.
 * Chaque type porte un libellé au singulier et au pluriel pour l'affichage
 * dynamique (« Nombre de cartons », « Prix d'achat du pack »…).
 */
public enum TypeConditionnement {

    CASIER("casier", "casiers"),
    CARTON("carton", "cartons"),
    PACK("pack", "packs"),
    FUT("fût", "fûts"),
    UNITE("unité", "unités");

    private final String libelle;
    private final String libellePluriel;

    TypeConditionnement(String libelle, String libellePluriel) {
        this.libelle = libelle;
        this.libellePluriel = libellePluriel;
    }

    /** Libellé au singulier (ex. « carton »). */
    public String getLibelle() {
        return libelle;
    }

    /** Libellé au pluriel (ex. « cartons »). */
    public String getLibellePluriel() {
        return libellePluriel;
    }
}

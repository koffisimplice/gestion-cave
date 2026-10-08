package com.gestioncave.charge;

/** Catégorie d'une charge, telle que gérée dans le registre papier. */
public enum CategorieCharge {
    VARIABLE,
    FIXE,
    OBLIGATOIRE,
    /** Salaire du personnel — généré automatiquement par le module Personnel & Paie. */
    SALAIRE
}

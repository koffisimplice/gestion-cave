package com.gestioncave.charge.dto;

import com.gestioncave.charge.Charge;
import com.gestioncave.charge.CategorieCharge;
import com.gestioncave.charge.Periodicite;

import java.math.BigDecimal;

public record ChargeResponse(
        Long id,
        Long etablissementId,
        String etablissementNom,
        CategorieCharge categorie,
        String libelle,
        BigDecimal montant,
        Periodicite periodicite,
        int annee,
        int mois
) {
    public static ChargeResponse from(Charge c) {
        return new ChargeResponse(
                c.getId(),
                c.getEtablissement().getId(),
                c.getEtablissement().getNom(),
                c.getCategorie(),
                c.getLibelle(),
                c.getMontant(),
                c.getPeriodicite(),
                c.getAnnee(),
                c.getMois());
    }
}

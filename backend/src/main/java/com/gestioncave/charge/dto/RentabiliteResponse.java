package com.gestioncave.charge.dto;

import com.gestioncave.charge.CategorieCharge;

import java.math.BigDecimal;
import java.util.List;

/**
 * Synthèse de rentabilité d'un mois pour un établissement ou en consolidé.
 * Réservé au propriétaire.
 */
public record RentabiliteResponse(
        Long etablissementId, // null = vue consolidée
        int annee,
        int mois,
        BigDecimal chiffreAffaires,
        BigDecimal beneficeBrut,
        BigDecimal totalCharges,
        List<TotalCategorie> chargesParCategorie,
        BigDecimal beneficeNet,
        boolean beneficiaire,
        BigDecimal tauxMarge,
        /** CA à réaliser pour couvrir les charges ; null si non atteignable (marge nulle/négative). */
        BigDecimal chiffreAffairesSeuil,
        List<ChargeResponse> charges
) {
    public record TotalCategorie(CategorieCharge categorie, BigDecimal montant) {
    }
}

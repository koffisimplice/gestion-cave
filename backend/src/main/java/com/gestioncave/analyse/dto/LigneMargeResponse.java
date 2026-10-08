package com.gestioncave.analyse.dto;

import java.math.BigDecimal;

/**
 * Analyse d'une boisson sur une période : ventes, coûts, marge, bénéfice et
 * valorisation du stock restant. Réservé au propriétaire.
 */
public record LigneMargeResponse(
        Long boissonId,
        String designation,
        String categorie,
        int quantiteVendue,
        BigDecimal chiffreAffaires,
        BigDecimal prixRevientUnitaire,
        BigDecimal prixVenteUnitaire,
        BigDecimal margeUnitaire,
        BigDecimal benefice,
        int stockRestant,
        BigDecimal valorisationStockRevient,
        BigDecimal valorisationStockVente
) {
}

package com.gestioncave.analyse.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Synthèse des marges et bénéfices sur une période, pour un établissement ou consolidée
 * (tous les maquis). Réservé au propriétaire.
 */
public record AnalyseMargeResponse(
        Long etablissementId, // null = vue consolidée
        LocalDate debut,
        LocalDate fin,
        int totalQuantiteVendue,
        BigDecimal chiffreAffaires,
        BigDecimal beneficeBrut,
        BigDecimal valorisationStockRevient,
        BigDecimal valorisationStockVente,
        List<LigneMargeResponse> lignes
) {
}

package com.gestioncave.tableaubord.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Synthèse du tableau de bord pour un établissement ou en consolidé.
 * Les champs financiers (bénéfice, charges, net) ne sont renseignés que pour
 * le propriétaire — {@code null} pour un gérant (confidentialité).
 */
public record TableauBordResponse(
        Long etablissementId, // null = vue consolidée
        LocalDate date,
        int annee,
        int mois,

        // Opérationnel (tous rôles)
        VenteResume ventesDuJour,
        VenteResume ventesDuMois,
        int stockTotal,
        int nbBoissons,
        int nbStockBas,
        int nbRuptures,
        List<BoissonVendueResume> meilleuresVentes,

        // Financier (propriétaire uniquement, sinon null)
        BigDecimal beneficeBrutMois,
        BigDecimal totalChargesMois,
        BigDecimal beneficeNetMois,
        Boolean beneficiaire
) {
}

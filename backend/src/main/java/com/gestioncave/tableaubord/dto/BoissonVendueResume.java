package com.gestioncave.tableaubord.dto;

import java.math.BigDecimal;

/** Une boisson dans le classement des meilleures ventes. */
public record BoissonVendueResume(
        Long boissonId,
        String designation,
        int quantiteVendue,
        BigDecimal chiffreAffaires
) {
}

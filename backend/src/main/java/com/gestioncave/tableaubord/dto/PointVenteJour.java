package com.gestioncave.tableaubord.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Un point de la courbe de tendance : total vendu et chiffre d'affaires d'une
 * journée. Les journées sans vente sont incluses avec des valeurs à zéro pour
 * que la courbe reste continue.
 */
public record PointVenteJour(
        LocalDate date,
        int quantite,
        BigDecimal chiffreAffaires
) {
}

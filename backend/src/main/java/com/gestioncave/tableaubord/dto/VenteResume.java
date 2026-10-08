package com.gestioncave.tableaubord.dto;

import java.math.BigDecimal;

/** Résumé de ventes : quantité de bouteilles vendues et chiffre d'affaires. */
public record VenteResume(int quantite, BigDecimal chiffreAffaires) {
}

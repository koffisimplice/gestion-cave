package com.gestioncave.tableaubord.dto;

import com.gestioncave.registre.RegistreJournalier;
import com.gestioncave.registre.StatutRegistre;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Une ligne d'historique du registre (archive consultable et filtrable). */
public record LigneHistoriqueResponse(
        Long id,
        LocalDate date,
        Long etablissementId,
        String etablissementNom,
        Long boissonId,
        String designation,
        int ancienStock,
        int commandeDuJour,
        int nouveauStock,
        Integer stockRestant,
        Integer stockVendu,
        BigDecimal prixUnitaire,
        BigDecimal prixVenteTotal,
        StatutRegistre statut
) {
    public static LigneHistoriqueResponse from(RegistreJournalier r) {
        return new LigneHistoriqueResponse(
                r.getId(),
                r.getDate(),
                r.getEtablissement().getId(),
                r.getEtablissement().getNom(),
                r.getBoisson().getId(),
                r.getBoisson().getDesignation(),
                r.getAncienStock(),
                r.getCommandeDuJour(),
                r.getNouveauStock(),
                r.getStockRestant(),
                r.getStockVendu(),
                r.getPrixUnitaire(),
                r.getPrixVenteTotal(),
                r.getStatut());
    }
}

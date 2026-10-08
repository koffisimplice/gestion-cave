package com.gestioncave.registre.dto;

import com.gestioncave.registre.RegistreJournalier;
import com.gestioncave.registre.StatutRegistre;

import java.math.BigDecimal;

/** Une ligne du registre, reprenant les colonnes du registre papier + alertes de stock. */
public record LigneRegistreResponse(
        Long id,
        Long boissonId,
        String designation,
        String categorie,
        int ancienStock,
        int commandeDuJour,
        int nouveauStock,
        Integer stockRestant,
        Integer stockVendu,
        int stockPerdu,
        String motifPerte,
        BigDecimal prixUnitaire,
        BigDecimal prixVenteTotal,
        int seuilAlerte,
        StatutRegistre statut,
        boolean alerteStockBas,
        boolean rupture
) {
    public static LigneRegistreResponse from(RegistreJournalier r) {
        int stockActuel = r.getStockRestant() != null ? r.getStockRestant() : r.getNouveauStock();
        boolean rupture = stockActuel == 0;
        boolean alerteBas = stockActuel > 0 && stockActuel <= r.getBoisson().getSeuilAlerte();

        return new LigneRegistreResponse(
                r.getId(),
                r.getBoisson().getId(),
                r.getBoisson().getDesignation(),
                r.getBoisson().getCategorie(),
                r.getAncienStock(),
                r.getCommandeDuJour(),
                r.getNouveauStock(),
                r.getStockRestant(),
                r.getStockVendu(),
                r.getStockPerdu(),
                r.getMotifPerte(),
                r.getPrixUnitaire(),
                r.getPrixVenteTotal(),
                r.getBoisson().getSeuilAlerte(),
                r.getStatut(),
                alerteBas,
                rupture);
    }
}

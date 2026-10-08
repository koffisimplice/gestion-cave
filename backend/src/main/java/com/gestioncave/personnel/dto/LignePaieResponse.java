package com.gestioncave.personnel.dto;

import com.gestioncave.personnel.Employe;
import com.gestioncave.personnel.PaiementSalaire;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * État de paie d'un employé pour un mois : son salaire de base et, s'il a été payé,
 * le paiement correspondant (montant réellement versé, date, identifiant pour annuler).
 */
public record LignePaieResponse(
        Long employeId,
        String nom,
        String poste,
        Long etablissementId,
        String etablissementNom,
        BigDecimal salaireMensuel,
        boolean paye,
        Long paiementId,
        BigDecimal montantPaye,
        LocalDate datePaiement
) {
    public static LignePaieResponse from(Employe e, PaiementSalaire p) {
        return new LignePaieResponse(
                e.getId(),
                e.getNom(),
                e.getPoste(),
                e.getEtablissement().getId(),
                e.getEtablissement().getNom(),
                e.getSalaireMensuel(),
                p != null,
                p != null ? p.getId() : null,
                p != null ? p.getMontant() : null,
                p != null ? p.getDatePaiement() : null);
    }
}

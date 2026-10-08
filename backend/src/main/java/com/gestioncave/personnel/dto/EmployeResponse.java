package com.gestioncave.personnel.dto;

import com.gestioncave.personnel.Employe;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EmployeResponse(
        Long id,
        Long etablissementId,
        String etablissementNom,
        String nom,
        String poste,
        BigDecimal salaireMensuel,
        String telephone,
        LocalDate dateEmbauche,
        boolean actif
) {
    public static EmployeResponse from(Employe e) {
        return new EmployeResponse(
                e.getId(),
                e.getEtablissement().getId(),
                e.getEtablissement().getNom(),
                e.getNom(),
                e.getPoste(),
                e.getSalaireMensuel(),
                e.getTelephone(),
                e.getDateEmbauche(),
                e.isActif());
    }
}

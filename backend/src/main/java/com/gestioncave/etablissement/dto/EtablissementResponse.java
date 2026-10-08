package com.gestioncave.etablissement.dto;

import com.gestioncave.etablissement.Etablissement;

public record EtablissementResponse(
        Long id,
        String nom,
        String adresse,
        String responsable,
        boolean actif
) {
    public static EtablissementResponse from(Etablissement e) {
        return new EtablissementResponse(
                e.getId(), e.getNom(), e.getAdresse(), e.getResponsable(), e.isActif());
    }
}

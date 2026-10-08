package com.gestioncave.utilisateur.dto;

import com.gestioncave.auth.dto.EtablissementResume;
import com.gestioncave.utilisateur.Role;
import com.gestioncave.utilisateur.Utilisateur;

import java.util.List;

/** Vue d'administration d'un utilisateur (téléphone et statut inclus, sans le hash). */
public record UtilisateurAdminResponse(
        Long id,
        String nom,
        String email,
        String telephone,
        Role role,
        boolean actif,
        List<EtablissementResume> etablissements
) {
    public static UtilisateurAdminResponse from(Utilisateur u) {
        List<EtablissementResume> ets = u.getEtablissements().stream()
                .map(e -> new EtablissementResume(e.getId(), e.getNom()))
                .sorted((a, b) -> a.nom().compareToIgnoreCase(b.nom()))
                .toList();
        return new UtilisateurAdminResponse(
                u.getId(), u.getNom(), u.getEmail(), u.getTelephone(),
                u.getRole(), u.isActif(), ets);
    }
}

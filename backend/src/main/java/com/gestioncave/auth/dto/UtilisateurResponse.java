package com.gestioncave.auth.dto;

import com.gestioncave.utilisateur.Role;
import com.gestioncave.utilisateur.Utilisateur;

import java.util.List;

/** Profil de l'utilisateur connecté (sans données sensibles). */
public record UtilisateurResponse(
        Long id,
        String nom,
        String email,
        Role role,
        List<EtablissementResume> etablissements
) {
    public static UtilisateurResponse from(Utilisateur u) {
        List<EtablissementResume> ets = u.getEtablissements().stream()
                .map(e -> new EtablissementResume(e.getId(), e.getNom()))
                .sorted((a, b) -> a.nom().compareToIgnoreCase(b.nom()))
                .toList();
        return new UtilisateurResponse(u.getId(), u.getNom(), u.getEmail(), u.getRole(), ets);
    }
}

package com.gestioncave.audit.dto;

import com.gestioncave.audit.JournalAudit;

import java.time.Instant;

/** Vue d'une entrée du journal d'audit. */
public record JournalAuditResponse(
        Long id,
        Instant dateHeure,
        Long utilisateurId,
        String acteur,
        String action,
        String cible,
        String details
) {
    public static JournalAuditResponse from(JournalAudit j) {
        return new JournalAuditResponse(
                j.getId(),
                j.getDateHeure(),
                j.getUtilisateurId(),
                j.getActeur(),
                j.getAction(),
                j.getCible(),
                j.getDetails());
    }
}

package com.gestioncave.registre.dto;

import com.gestioncave.registre.RegistreJournalier;
import com.gestioncave.registre.StatutRegistre;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

/** Le « point » d'une journée pour un établissement : l'ensemble des lignes + totaux. */
public record PointJournalierResponse(
        Long etablissementId,
        LocalDate date,
        StatutRegistre statut,
        int totalVendu,
        int totalPerdu,
        BigDecimal totalPrixVenteTotal,
        List<LigneRegistreResponse> lignes
) {
    public static PointJournalierResponse from(Long etablissementId, LocalDate date,
                                               List<RegistreJournalier> lignes) {
        List<LigneRegistreResponse> lignesDto = lignes.stream()
                .sorted(Comparator.comparing(r -> r.getBoisson().getDesignation(), String.CASE_INSENSITIVE_ORDER))
                .map(LigneRegistreResponse::from)
                .toList();

        int totalVendu = lignes.stream()
                .map(RegistreJournalier::getStockVendu)
                .filter(v -> v != null)
                .mapToInt(Integer::intValue)
                .sum();

        int totalPerdu = lignes.stream()
                .mapToInt(RegistreJournalier::getStockPerdu)
                .sum();

        BigDecimal totalPvt = lignes.stream()
                .map(RegistreJournalier::getPrixVenteTotal)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // La journée est clôturée si elle contient des lignes et qu'elles le sont toutes.
        StatutRegistre statut = !lignes.isEmpty()
                && lignes.stream().allMatch(r -> r.getStatut() == StatutRegistre.CLOTURE)
                ? StatutRegistre.CLOTURE
                : StatutRegistre.OUVERT;

        return new PointJournalierResponse(
                etablissementId, date, statut, totalVendu, totalPerdu, totalPvt, lignesDto);
    }
}

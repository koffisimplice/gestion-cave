package com.gestioncave.registre;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RegistreJournalierRepository extends JpaRepository<RegistreJournalier, Long> {

    List<RegistreJournalier> findByEtablissementIdAndDate(Long etablissementId, LocalDate date);

    Optional<RegistreJournalier> findByBoissonIdAndEtablissementIdAndDate(
            Long boissonId, Long etablissementId, LocalDate date);

    /** Dernière ligne connue pour une boisson dans un établissement, avant une date donnée. */
    Optional<RegistreJournalier> findFirstByBoissonIdAndEtablissementIdAndDateBeforeOrderByDateDesc(
            Long boissonId, Long etablissementId, LocalDate date);

    /** Dernière ligne connue pour une boisson dans un établissement, jusqu'à une date incluse. */
    Optional<RegistreJournalier> findFirstByBoissonIdAndEtablissementIdAndDateLessThanEqualOrderByDateDesc(
            Long boissonId, Long etablissementId, LocalDate date);

    boolean existsByEtablissementIdAndDate(Long etablissementId, LocalDate date);

    /** Lignes d'un établissement sur une période (bornes incluses). */
    List<RegistreJournalier> findByEtablissementIdAndDateBetween(
            Long etablissementId, LocalDate debut, LocalDate fin);

    /** Lignes de plusieurs établissements sur une période (bornes incluses). */
    List<RegistreJournalier> findByEtablissementIdInAndDateBetween(
            List<Long> etablissementIds, LocalDate debut, LocalDate fin);
}

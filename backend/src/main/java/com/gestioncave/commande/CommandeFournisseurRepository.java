package com.gestioncave.commande;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface CommandeFournisseurRepository extends JpaRepository<CommandeFournisseur, Long> {

    List<CommandeFournisseur> findByEtablissementIdOrderByDateDescIdDesc(Long etablissementId);

    List<CommandeFournisseur> findByEtablissementIdInOrderByDateDescIdDesc(List<Long> etablissementIds);

    List<CommandeFournisseur> findAllByOrderByDateDescIdDesc();

    /** Nombre d'achats rattachés à une fiche fournisseur. */
    long countByFournisseurRefId(Long fournisseurId);

    /** Empêche la suppression d'un fournisseur encore référencé par des achats. */
    boolean existsByFournisseurRefId(Long fournisseurId);

    /** Montant total dépensé auprès d'un fournisseur (0 si aucun achat). */
    @Query("SELECT COALESCE(SUM(c.montantTotal), 0) FROM CommandeFournisseur c "
            + "WHERE c.fournisseurRef.id = :fournisseurId")
    BigDecimal montantTotalParFournisseur(@Param("fournisseurId") Long fournisseurId);
}

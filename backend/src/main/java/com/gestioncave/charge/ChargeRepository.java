package com.gestioncave.charge;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChargeRepository extends JpaRepository<Charge, Long> {

    List<Charge> findByEtablissementIdAndAnneeAndMoisOrderByCategorieAscLibelleAsc(
            Long etablissementId, int annee, int mois);

    List<Charge> findByEtablissementIdInAndAnneeAndMoisOrderByCategorieAscLibelleAsc(
            List<Long> etablissementIds, int annee, int mois);
}

package com.gestioncave.personnel;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaiementSalaireRepository extends JpaRepository<PaiementSalaire, Long> {

    Optional<PaiementSalaire> findByEmployeIdAndAnneeAndMois(Long employeId, int annee, int mois);

    List<PaiementSalaire> findByAnneeAndMoisAndEmploye_Etablissement_Id(int annee, int mois, Long etablissementId);

    List<PaiementSalaire> findByAnneeAndMois(int annee, int mois);

    boolean existsByEmployeId(Long employeId);
}

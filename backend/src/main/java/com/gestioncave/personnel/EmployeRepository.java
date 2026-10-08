package com.gestioncave.personnel;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeRepository extends JpaRepository<Employe, Long> {

    List<Employe> findAllByOrderByNomAsc();

    List<Employe> findByEtablissementIdOrderByNomAsc(Long etablissementId);

    List<Employe> findByEtablissementIdInOrderByNomAsc(List<Long> etablissementIds);

    boolean existsByEtablissementIdAndNomIgnoreCase(Long etablissementId, String nom);

    boolean existsByEtablissementIdAndNomIgnoreCaseAndIdNot(Long etablissementId, String nom, Long id);
}

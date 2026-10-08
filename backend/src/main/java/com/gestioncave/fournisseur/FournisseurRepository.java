package com.gestioncave.fournisseur;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FournisseurRepository extends JpaRepository<Fournisseur, Long> {

    List<Fournisseur> findAllByOrderByNomAsc();

    boolean existsByNomIgnoreCase(String nom);

    boolean existsByNomIgnoreCaseAndIdNot(String nom, Long id);
}

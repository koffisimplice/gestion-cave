package com.gestioncave.etablissement;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EtablissementRepository extends JpaRepository<Etablissement, Long> {

    List<Etablissement> findByActifTrue();
}

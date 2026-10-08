package com.gestioncave.boisson;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BoissonRepository extends JpaRepository<Boisson, Long> {

    List<Boisson> findByActifTrue();

    /** Boissons actives disponibles dans l'établissement donné. */
    @Query("""
            select distinct b from Boisson b
            join b.etablissements e
            where b.actif = true and e.id = :etablissementId
            """)
    List<Boisson> findActivesParEtablissement(@Param("etablissementId") Long etablissementId);

    /** Boissons actives disponibles dans au moins un des établissements donnés. */
    @Query("""
            select distinct b from Boisson b
            join b.etablissements e
            where b.actif = true and e.id in :etablissementIds
            """)
    List<Boisson> findActivesParEtablissements(@Param("etablissementIds") List<Long> etablissementIds);
}

package com.gestioncave.audit;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JournalAuditRepository extends JpaRepository<JournalAudit, Long> {

    List<JournalAudit> findAllByOrderByDateHeureDesc(Pageable pageable);

    List<JournalAudit> findByActionOrderByDateHeureDesc(String action, Pageable pageable);
}

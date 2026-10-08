package com.gestioncave.audit;

import com.gestioncave.audit.dto.JournalAuditResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
@PreAuthorize("hasRole('PROPRIETAIRE')")
@Tag(name = "Journal d'audit", description = "Traçabilité des actions sensibles (propriétaire uniquement)")
public class AuditController {

    private final AuditService service;

    public AuditController(AuditService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Dernières entrées du journal d'audit, filtrables par action")
    public List<JournalAuditResponse> lister(
            @RequestParam(required = false) String action,
            @RequestParam(required = false, defaultValue = "200") int limite) {
        return service.lister(action, limite);
    }
}

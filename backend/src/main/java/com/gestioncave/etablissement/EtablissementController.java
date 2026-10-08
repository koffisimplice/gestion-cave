package com.gestioncave.etablissement;

import com.gestioncave.etablissement.dto.EtablissementRequest;
import com.gestioncave.etablissement.dto.EtablissementResponse;
import com.gestioncave.security.AppUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/etablissements")
@Tag(name = "Établissements", description = "Gestion des maquis (multi-établissements)")
public class EtablissementController {

    private final EtablissementService service;

    public EtablissementController(EtablissementService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Liste des établissements accessibles à l'utilisateur connecté")
    public List<EtablissementResponse> lister(@AuthenticationPrincipal AppUserDetails user) {
        return service.lister(user);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détail d'un établissement")
    public EtablissementResponse obtenir(@PathVariable Long id,
                                         @AuthenticationPrincipal AppUserDetails user) {
        return service.obtenir(id, user);
    }

    @PostMapping
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    @Operation(summary = "Créer un établissement (propriétaire uniquement)")
    public ResponseEntity<EtablissementResponse> creer(@Valid @RequestBody EtablissementRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.creer(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    @Operation(summary = "Modifier un établissement (propriétaire uniquement)")
    public EtablissementResponse modifier(@PathVariable Long id,
                                          @Valid @RequestBody EtablissementRequest req) {
        return service.modifier(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    @Operation(summary = "Désactiver un établissement (propriétaire uniquement)")
    public ResponseEntity<Void> desactiver(@PathVariable Long id) {
        service.desactiver(id);
        return ResponseEntity.noContent().build();
    }
}

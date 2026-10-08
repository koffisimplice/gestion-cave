package com.gestioncave.boisson;

import com.gestioncave.boisson.dto.BoissonRequest;
import com.gestioncave.boisson.dto.BoissonResponse;
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
@RequestMapping("/api/boissons")
@Tag(name = "Boissons", description = "Catalogue des produits, partagé entre établissements")
public class BoissonController {

    private final BoissonService service;

    public BoissonController(BoissonService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lister les boissons (filtrables par établissement)")
    public List<BoissonResponse> lister(
            @AuthenticationPrincipal AppUserDetails user,
            @RequestParam(name = "etablissementId", required = false) Long etablissementId) {
        return service.lister(user, etablissementId);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détail d'une boisson")
    public BoissonResponse obtenir(@PathVariable Long id,
                                   @AuthenticationPrincipal AppUserDetails user) {
        return service.obtenir(id, user);
    }

    @PostMapping
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    @Operation(summary = "Créer une boisson (propriétaire uniquement)")
    public ResponseEntity<BoissonResponse> creer(@Valid @RequestBody BoissonRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.creer(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    @Operation(summary = "Modifier une boisson, dont ses établissements de partage (propriétaire uniquement)")
    public BoissonResponse modifier(@PathVariable Long id, @Valid @RequestBody BoissonRequest req) {
        return service.modifier(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    @Operation(summary = "Désactiver une boisson (propriétaire uniquement)")
    public ResponseEntity<Void> desactiver(@PathVariable Long id) {
        service.desactiver(id);
        return ResponseEntity.noContent().build();
    }
}

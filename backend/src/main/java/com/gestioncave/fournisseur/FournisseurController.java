package com.gestioncave.fournisseur;

import com.gestioncave.fournisseur.dto.FournisseurRequest;
import com.gestioncave.fournisseur.dto.FournisseurResponse;
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
@RequestMapping("/api/fournisseurs")
@Tag(name = "Fournisseurs", description = "Répertoire des fournisseurs et historique d'achats")
public class FournisseurController {

    private final FournisseurService service;

    public FournisseurController(FournisseurService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Liste des fournisseurs (montant total réservé au propriétaire)")
    public List<FournisseurResponse> lister(@AuthenticationPrincipal AppUserDetails user) {
        return service.lister(user.isProprietaire());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détail d'un fournisseur")
    public FournisseurResponse obtenir(@PathVariable Long id,
                                       @AuthenticationPrincipal AppUserDetails user) {
        return service.obtenir(id, user.isProprietaire());
    }

    @PostMapping
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    @Operation(summary = "Créer un fournisseur (propriétaire uniquement)")
    public ResponseEntity<FournisseurResponse> creer(@Valid @RequestBody FournisseurRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.creer(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    @Operation(summary = "Modifier un fournisseur (propriétaire uniquement)")
    public FournisseurResponse modifier(@PathVariable Long id,
                                        @Valid @RequestBody FournisseurRequest req) {
        return service.modifier(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    @Operation(summary = "Supprimer un fournisseur, ou le désactiver s'il a des achats (propriétaire uniquement)")
    public ResponseEntity<Void> supprimer(@PathVariable Long id) {
        service.supprimer(id);
        return ResponseEntity.noContent().build();
    }
}

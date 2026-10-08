package com.gestioncave.commande;

import com.gestioncave.commande.dto.CommandeRequest;
import com.gestioncave.commande.dto.CommandeResponse;
import com.gestioncave.security.AppUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/commandes")
@Tag(name = "Achats", description = "Commandes fournisseurs et entrées de stock")
public class CommandeFournisseurController {

    private final CommandeFournisseurService service;

    public CommandeFournisseurController(CommandeFournisseurService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Historique des achats (filtrable par établissement)")
    public List<CommandeResponse> lister(
            @AuthenticationPrincipal AppUserDetails user,
            @RequestParam(name = "etablissementId", required = false) Long etablissementId) {
        return service.lister(user, etablissementId);
    }

    @PostMapping
    @Operation(summary = "Enregistrer un achat : casiers convertis en bouteilles ajoutées au stock du jour")
    public ResponseEntity<CommandeResponse> creer(
            @AuthenticationPrincipal AppUserDetails user,
            @Valid @RequestBody CommandeRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.creer(user, req));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un achat et retrancher les bouteilles du stock du jour")
    public ResponseEntity<Void> supprimer(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable Long id) {
        service.supprimer(user, id);
        return ResponseEntity.noContent().build();
    }
}

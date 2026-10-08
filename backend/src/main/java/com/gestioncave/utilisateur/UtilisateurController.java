package com.gestioncave.utilisateur;

import com.gestioncave.security.AppUserDetails;
import com.gestioncave.utilisateur.dto.UtilisateurAdminResponse;
import com.gestioncave.utilisateur.dto.UtilisateurRequest;
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
@RequestMapping("/api/utilisateurs")
@PreAuthorize("hasRole('PROPRIETAIRE')")
@Tag(name = "Utilisateurs", description = "Gestion des comptes (propriétaire uniquement)")
public class UtilisateurController {

    private final UtilisateurService service;

    public UtilisateurController(UtilisateurService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lister les utilisateurs")
    public List<UtilisateurAdminResponse> lister() {
        return service.lister();
    }

    @PostMapping
    @Operation(summary = "Créer un utilisateur")
    public ResponseEntity<UtilisateurAdminResponse> creer(@Valid @RequestBody UtilisateurRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.creer(req));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier un utilisateur (mot de passe vide = inchangé)")
    public UtilisateurAdminResponse modifier(@PathVariable Long id,
                                             @Valid @RequestBody UtilisateurRequest req) {
        return service.modifier(id, req);
    }

    @PutMapping("/{id}/activation")
    @Operation(summary = "Activer ou désactiver un compte")
    public UtilisateurAdminResponse changerActivation(@PathVariable Long id,
                                                      @RequestParam boolean actif,
                                                      @AuthenticationPrincipal AppUserDetails user) {
        return service.changerActivation(id, actif, user.getId());
    }
}

package com.gestioncave.personnel;

import com.gestioncave.personnel.dto.EmployeRequest;
import com.gestioncave.personnel.dto.EmployeResponse;
import com.gestioncave.personnel.dto.LignePaieResponse;
import com.gestioncave.personnel.dto.PaiementRequest;
import com.gestioncave.security.AppUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/personnel")
@Tag(name = "Personnel & Paie", description = "Employés et paiement des salaires — propriétaire uniquement")
@PreAuthorize("hasRole('PROPRIETAIRE')")
public class PersonnelController {

    private final PersonnelService service;

    public PersonnelController(PersonnelService service) {
        this.service = service;
    }

    // ----- Employés -----------------------------------------------------------

    @GetMapping("/employes")
    @Operation(summary = "Lister les employés (par maquis ou consolidé)")
    public List<EmployeResponse> listerEmployes(
            @AuthenticationPrincipal AppUserDetails user,
            @RequestParam(required = false) Long etablissementId) {
        return service.listerEmployes(user, etablissementId);
    }

    @PostMapping("/employes")
    @Operation(summary = "Créer un employé")
    public ResponseEntity<EmployeResponse> creerEmploye(
            @AuthenticationPrincipal AppUserDetails user,
            @Valid @RequestBody EmployeRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.creerEmploye(user, req));
    }

    @PutMapping("/employes/{id}")
    @Operation(summary = "Modifier un employé")
    public EmployeResponse modifierEmploye(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable Long id,
            @Valid @RequestBody EmployeRequest req) {
        return service.modifierEmploye(user, id, req);
    }

    @DeleteMapping("/employes/{id}")
    @Operation(summary = "Supprimer un employé (désactivé s'il a déjà des salaires versés)")
    public ResponseEntity<Void> supprimerEmploye(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable Long id) {
        service.supprimerEmploye(user, id);
        return ResponseEntity.noContent().build();
    }

    // ----- Paie ---------------------------------------------------------------

    @GetMapping("/paie")
    @Operation(summary = "État de paie d'un mois : employés actifs et statut payé / non payé")
    public List<LignePaieResponse> etatPaie(
            @AuthenticationPrincipal AppUserDetails user,
            @RequestParam(required = false) Long etablissementId,
            @RequestParam(required = false) Integer annee,
            @RequestParam(required = false) Integer mois) {
        LocalDate now = LocalDate.now();
        int a = annee != null ? annee : now.getYear();
        int m = mois != null ? mois : now.getMonthValue();
        return service.etatPaie(user, etablissementId, a, m);
    }

    @PostMapping("/paie")
    @Operation(summary = "Marquer un salaire comme payé (génère la charge du mois)")
    public ResponseEntity<LignePaieResponse> payer(
            @AuthenticationPrincipal AppUserDetails user,
            @Valid @RequestBody PaiementRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.payer(user, req));
    }

    @DeleteMapping("/paie/{paiementId}")
    @Operation(summary = "Annuler un paiement de salaire (supprime la charge associée)")
    public ResponseEntity<Void> annulerPaiement(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable Long paiementId) {
        service.annulerPaiement(user, paiementId);
        return ResponseEntity.noContent().build();
    }
}

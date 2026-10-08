package com.gestioncave.charge;

import com.gestioncave.charge.dto.ChargeRequest;
import com.gestioncave.charge.dto.ChargeResponse;
import com.gestioncave.charge.dto.RentabiliteResponse;
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
@RequestMapping("/api/charges")
@Tag(name = "Charges & rentabilité", description = "Charges d'exploitation — propriétaire uniquement")
@PreAuthorize("hasRole('PROPRIETAIRE')")
public class ChargeController {

    private final ChargeService chargeService;
    private final RentabiliteService rentabiliteService;

    public ChargeController(ChargeService chargeService, RentabiliteService rentabiliteService) {
        this.chargeService = chargeService;
        this.rentabiliteService = rentabiliteService;
    }

    @GetMapping
    @Operation(summary = "Lister les charges d'un mois (par établissement ou consolidé)")
    public List<ChargeResponse> lister(
            @AuthenticationPrincipal AppUserDetails user,
            @RequestParam(required = false) Long etablissementId,
            @RequestParam(required = false) Integer annee,
            @RequestParam(required = false) Integer mois) {
        LocalDate now = LocalDate.now();
        int a = annee != null ? annee : now.getYear();
        int m = mois != null ? mois : now.getMonthValue();
        return chargeService.lister(user, etablissementId, a, m);
    }

    @PostMapping
    @Operation(summary = "Créer une charge")
    public ResponseEntity<ChargeResponse> creer(
            @AuthenticationPrincipal AppUserDetails user,
            @Valid @RequestBody ChargeRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chargeService.creer(user, req));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier une charge")
    public ChargeResponse modifier(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable Long id,
            @Valid @RequestBody ChargeRequest req) {
        return chargeService.modifier(user, id, req);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une charge")
    public ResponseEntity<Void> supprimer(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable Long id) {
        chargeService.supprimer(user, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/rentabilite")
    @Operation(summary = "Rentabilité nette d'un mois : bénéfice net, charges par catégorie, seuil de rentabilité")
    public RentabiliteResponse rentabilite(
            @AuthenticationPrincipal AppUserDetails user,
            @RequestParam(required = false) Long etablissementId,
            @RequestParam(required = false) Integer annee,
            @RequestParam(required = false) Integer mois) {
        LocalDate now = LocalDate.now();
        int a = annee != null ? annee : now.getYear();
        int m = mois != null ? mois : now.getMonthValue();
        return rentabiliteService.rentabilite(user, etablissementId, a, m);
    }
}

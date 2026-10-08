package com.gestioncave.registre;

import com.gestioncave.registre.dto.MajLigneRequest;
import com.gestioncave.registre.dto.PointJournalierResponse;
import com.gestioncave.security.AppUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/registre")
@Tag(name = "Registre journalier", description = "Point quotidien de stock et de ventes")
public class RegistreController {

    private final RegistreService service;

    public RegistreController(RegistreService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Point du jour d'un établissement (initialise les lignes manquantes)")
    public PointJournalierResponse pointDuJour(
            @AuthenticationPrincipal AppUserDetails user,
            @RequestParam Long etablissementId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate jour = date != null ? date : LocalDate.now();
        return service.pointDuJour(user, etablissementId, jour);
    }

    @PutMapping("/lignes/{ligneId}")
    @Operation(summary = "Saisir la commande du jour et/ou le stock vendu d'une ligne")
    public PointJournalierResponse majLigne(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable Long ligneId,
            @Valid @RequestBody MajLigneRequest req) {
        return service.majLigne(user, ligneId, req);
    }

    @PostMapping("/lignes/{ligneId}/vente")
    @Operation(summary = "Enregistrer une vente (bouton +1) : incrémente le stock vendu")
    public PointJournalierResponse enregistrerVente(
            @AuthenticationPrincipal AppUserDetails user,
            @PathVariable Long ligneId,
            @RequestParam(defaultValue = "1") int quantite) {
        return service.enregistrerVente(user, ligneId, quantite);
    }

    @PostMapping("/cloturer")
    @Operation(summary = "Arrêter le point : verrouille la journée et prépare l'ancien stock du lendemain")
    public PointJournalierResponse cloturer(
            @AuthenticationPrincipal AppUserDetails user,
            @RequestParam Long etablissementId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate jour = date != null ? date : LocalDate.now();
        return service.cloturer(user, etablissementId, jour);
    }
}

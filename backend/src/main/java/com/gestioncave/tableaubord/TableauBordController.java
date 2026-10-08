package com.gestioncave.tableaubord;

import com.gestioncave.security.AppUserDetails;
import com.gestioncave.tableaubord.dto.LigneHistoriqueResponse;
import com.gestioncave.tableaubord.dto.PointVenteJour;
import com.gestioncave.tableaubord.dto.TableauBordResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/tableau-de-bord")
@Tag(name = "Tableau de bord & rapports", description = "Synthèse, historique et exports")
public class TableauBordController {

    private final TableauBordService service;
    private final RapportService rapportService;

    public TableauBordController(TableauBordService service, RapportService rapportService) {
        this.service = service;
        this.rapportService = rapportService;
    }

    @GetMapping
    @Operation(summary = "Synthèse du tableau de bord (financier réservé au propriétaire)")
    public TableauBordResponse synthese(
            @AuthenticationPrincipal AppUserDetails user,
            @RequestParam(required = false) Long etablissementId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.synthese(user, etablissementId, date);
    }

    @GetMapping("/historique")
    @Operation(summary = "Historique du registre, filtrable par période, établissement et boisson")
    public List<LigneHistoriqueResponse> historique(
            @AuthenticationPrincipal AppUserDetails user,
            @RequestParam(required = false) Long etablissementId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate debut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin,
            @RequestParam(required = false) Long boissonId) {
        return service.historique(user, etablissementId, debut, fin, boissonId);
    }

    @GetMapping("/tendance")
    @Operation(summary = "Ventes quotidiennes (quantité + CA) sur les N derniers jours, pour la courbe de tendance")
    public List<PointVenteJour> tendance(
            @AuthenticationPrincipal AppUserDetails user,
            @RequestParam(required = false) Long etablissementId,
            @RequestParam(required = false, defaultValue = "30") int jours) {
        return service.tendance(user, etablissementId, jours);
    }

    @GetMapping("/rapport/excel")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    @Operation(summary = "Exporter le rapport mensuel en Excel (propriétaire uniquement)")
    public ResponseEntity<ByteArrayResource> excel(
            @AuthenticationPrincipal AppUserDetails user,
            @RequestParam(required = false) Long etablissementId,
            @RequestParam int annee,
            @RequestParam int mois) {
        byte[] contenu = rapportService.excel(user, etablissementId, annee, mois);
        return telecharger(contenu, rapportService.nomFichier(annee, mois, "xlsx"),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    @GetMapping("/rapport/pdf")
    @PreAuthorize("hasRole('PROPRIETAIRE')")
    @Operation(summary = "Exporter le rapport mensuel en PDF (propriétaire uniquement)")
    public ResponseEntity<ByteArrayResource> pdf(
            @AuthenticationPrincipal AppUserDetails user,
            @RequestParam(required = false) Long etablissementId,
            @RequestParam int annee,
            @RequestParam int mois) {
        byte[] contenu = rapportService.pdf(user, etablissementId, annee, mois);
        return telecharger(contenu, rapportService.nomFichier(annee, mois, "pdf"),
                MediaType.APPLICATION_PDF_VALUE);
    }

    private ResponseEntity<ByteArrayResource> telecharger(byte[] contenu, String nom, String type) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nom + "\"")
                .contentType(MediaType.parseMediaType(type))
                .contentLength(contenu.length)
                .body(new ByteArrayResource(contenu));
    }
}

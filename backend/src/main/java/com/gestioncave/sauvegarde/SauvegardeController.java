package com.gestioncave.sauvegarde;

import com.gestioncave.common.BusinessException;
import com.gestioncave.sauvegarde.dto.SauvegardeFichier;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Sauvegarde et restauration des données — réservé au propriétaire.
 * La restauration REMPLACE l'intégralité des données existantes.
 */
@RestController
@RequestMapping("/api/sauvegardes")
@Tag(name = "Sauvegarde & restauration", description = "Sauvegarde des données — propriétaire uniquement")
@PreAuthorize("hasRole('PROPRIETAIRE')")
public class SauvegardeController {

    private final SauvegardeService service;

    public SauvegardeController(SauvegardeService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lister les sauvegardes stockées sur le serveur")
    public List<SauvegardeFichier> lister() {
        return service.listerFichiers();
    }

    @PostMapping
    @Operation(summary = "Déclencher une sauvegarde immédiate (stockée sur le serveur)")
    public SauvegardeFichier sauvegarderMaintenant() {
        return service.sauvegarderSurDisque();
    }

    @GetMapping("/export")
    @Operation(summary = "Télécharger une sauvegarde fraîche (JSON) sans la stocker")
    public ResponseEntity<ByteArrayResource> exporter() {
        byte[] contenu = service.exporterJson();
        String nom = "sauvegarde-" + LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")) + ".json";
        return telecharger(contenu, nom);
    }

    @GetMapping("/{nom}")
    @Operation(summary = "Télécharger une sauvegarde stockée")
    public ResponseEntity<ByteArrayResource> telechargerFichier(@PathVariable String nom) {
        return telecharger(service.lireFichier(nom), nom);
    }

    @PostMapping("/restaurer")
    @Operation(summary = "Restaurer depuis un fichier importé (REMPLACE toutes les données)")
    public ResponseEntity<Map<String, String>> restaurer(@RequestParam("fichier") MultipartFile fichier) {
        if (fichier == null || fichier.isEmpty()) {
            throw new BusinessException("Aucun fichier de sauvegarde fourni.");
        }
        try {
            service.restaurer(fichier.getBytes());
        } catch (IOException e) {
            throw new BusinessException("Impossible de lire le fichier importé.");
        }
        return ResponseEntity.ok(Map.of("message", "Restauration effectuée avec succès."));
    }

    @PostMapping("/restaurer/{nom}")
    @Operation(summary = "Restaurer depuis une sauvegarde stockée (REMPLACE toutes les données)")
    public ResponseEntity<Map<String, String>> restaurerStockee(@PathVariable String nom) {
        service.restaurerDepuisFichier(nom);
        return ResponseEntity.ok(Map.of("message", "Restauration effectuée avec succès."));
    }

    private ResponseEntity<ByteArrayResource> telecharger(byte[] contenu, String nom) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nom + "\"")
                .contentType(MediaType.APPLICATION_JSON)
                .contentLength(contenu.length)
                .body(new ByteArrayResource(contenu));
    }
}

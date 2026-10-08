package com.gestioncave.analyse;

import com.gestioncave.analyse.dto.AnalyseMargeResponse;
import com.gestioncave.security.AppUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/analyse")
@Tag(name = "Marges & bénéfices", description = "Analyse financière — propriétaire uniquement")
@PreAuthorize("hasRole('PROPRIETAIRE')")
public class AnalyseController {

    private final AnalyseService service;

    public AnalyseController(AnalyseService service) {
        this.service = service;
    }

    @GetMapping("/marges")
    @Operation(summary = "Marges, bénéfices et valorisation du stock sur une période "
            + "(par établissement ou consolidé)")
    public AnalyseMargeResponse marges(
            @AuthenticationPrincipal AppUserDetails user,
            @RequestParam(required = false) Long etablissementId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate debut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {
        return service.analyserMarges(user, etablissementId, debut, fin);
    }
}

package com.gestioncave.auth;

import com.gestioncave.auth.dto.LoginRequest;
import com.gestioncave.auth.dto.LoginResponse;
import com.gestioncave.auth.dto.UtilisateurResponse;
import com.gestioncave.security.AppUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentification", description = "Connexion et profil de l'utilisateur courant")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "Connexion par email / mot de passe, renvoie un jeton JWT")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    @Operation(summary = "Profil de l'utilisateur connecté")
    public ResponseEntity<UtilisateurResponse> me(@AuthenticationPrincipal AppUserDetails principal) {
        return ResponseEntity.ok(UtilisateurResponse.from(principal.getUtilisateur()));
    }
}

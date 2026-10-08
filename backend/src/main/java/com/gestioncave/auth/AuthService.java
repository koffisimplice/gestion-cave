package com.gestioncave.auth;

import com.gestioncave.audit.AuditService;
import com.gestioncave.auth.dto.LoginRequest;
import com.gestioncave.auth.dto.LoginResponse;
import com.gestioncave.auth.dto.UtilisateurResponse;
import com.gestioncave.common.TropDeTentativesException;
import com.gestioncave.security.AppUserDetails;
import com.gestioncave.security.JwtService;
import com.gestioncave.security.LoginAttemptService;
import com.gestioncave.utilisateur.Utilisateur;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttemptService;
    private final AuditService auditService;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService,
                       LoginAttemptService loginAttemptService, AuditService auditService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.loginAttemptService = loginAttemptService;
        this.auditService = auditService;
    }

    public LoginResponse login(LoginRequest request) {
        String identifiant = request.email();

        if (loginAttemptService.estBloque(identifiant)) {
            long minutes = loginAttemptService.minutesRestantes(identifiant);
            auditService.enregistrer(identifiant, null, "CONNEXION_BLOQUEE", identifiant,
                    "Compte temporairement bloqué (trop de tentatives).");
            throw new TropDeTentativesException(
                    "Trop de tentatives de connexion. Réessayez dans " + minutes + " minute(s).");
        }

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(identifiant, request.motDePasse()));
        } catch (AuthenticationException ex) {
            loginAttemptService.echec(identifiant);
            auditService.enregistrer(identifiant, null, "CONNEXION_ECHOUEE", identifiant, null);
            throw ex;
        }

        loginAttemptService.succes(identifiant);

        AppUserDetails principal = (AppUserDetails) authentication.getPrincipal();
        Utilisateur utilisateur = principal.getUtilisateur();

        auditService.enregistrer(utilisateur.getEmail(), utilisateur.getId(), "CONNEXION", null, null);

        Map<String, Object> claims = Map.of(
                "role", utilisateur.getRole().name(),
                "nom", utilisateur.getNom(),
                "uid", utilisateur.getId());

        String token = jwtService.generateToken(utilisateur.getEmail(), claims);

        return LoginResponse.of(token, jwtService.getExpirationMs(), UtilisateurResponse.from(utilisateur));
    }
}

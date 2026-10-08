package com.gestioncave.auth.dto;

public record LoginResponse(
        String token,
        String typeToken,
        long expiresInMs,
        UtilisateurResponse utilisateur
) {
    public static LoginResponse of(String token, long expiresInMs, UtilisateurResponse utilisateur) {
        return new LoginResponse(token, "Bearer", expiresInMs, utilisateur);
    }
}

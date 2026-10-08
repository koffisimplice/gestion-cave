package com.gestioncave.security;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private static final String SECRET =
            "Y2hhbmdlLW1lLXRoaXMtaXMtYS1kZXYtc2VjcmV0LWtleS1nZXN0aW9uLWNhdmUtMjAyNg==";

    @Test
    void genere_et_relit_le_sujet_du_token() {
        JwtService service = new JwtService(SECRET, 60_000);
        String token = service.generateToken("proprietaire@gestioncave.local", Map.of("role", "PROPRIETAIRE"));

        assertThat(service.extractEmail(token)).isEqualTo("proprietaire@gestioncave.local");
        assertThat(service.isValid(token, "proprietaire@gestioncave.local")).isTrue();
    }

    @Test
    void token_invalide_pour_un_autre_email() {
        JwtService service = new JwtService(SECRET, 60_000);
        String token = service.generateToken("a@b.local", Map.of());

        assertThat(service.isValid(token, "autre@b.local")).isFalse();
    }

    @Test
    void token_expire_est_rejete() {
        JwtService service = new JwtService(SECRET, -1_000); // déjà expiré
        String token = service.generateToken("a@b.local", Map.of());

        assertThat(service.isValid(token, "a@b.local")).isFalse();
    }

    @Test
    void token_falsifie_est_rejete() {
        JwtService service = new JwtService(SECRET, 60_000);
        String token = service.generateToken("a@b.local", Map.of());
        String falsifie = token.substring(0, token.length() - 2) + "xx";

        assertThat(service.isValid(falsifie, "a@b.local")).isFalse();
    }
}

package com.gestioncave.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestioncave.utilisateur.Role;
import com.gestioncave.utilisateur.Utilisateur;
import com.gestioncave.utilisateur.UtilisateurRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LoginBruteForceTest {

    @Autowired MockMvc mockMvc;
    @Autowired UtilisateurRepository utilisateurRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired ObjectMapper objectMapper;

    // Identifiant dédié à ce test pour ne pas bloquer les autres (blocage par identifiant).
    private static final String ID = "brute-force@test.local";

    @BeforeEach
    void setUp() {
        utilisateurRepository.save(Utilisateur.builder()
                .nom("Cible").email(ID)
                .motDePasseHash(passwordEncoder.encode("bonMotDePasse"))
                .role(Role.PROPRIETAIRE).etablissements(Set.of()).build());
    }

    @AfterEach
    void tearDown() {
        utilisateurRepository.deleteAll();
    }

    private int tenter(String motDePasse) throws Exception {
        String body = "{\"email\":\"%s\",\"motDePasse\":\"%s\"}".formatted(ID, motDePasse);
        return mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse().getStatus();
    }

    @Test
    void blocage_apres_cinq_echecs() throws Exception {
        // 5 tentatives erronées -> 401 à chaque fois
        for (int i = 0; i < 5; i++) {
            org.assertj.core.api.Assertions.assertThat(tenter("mauvais")).isEqualTo(401);
        }
        // 6e tentative (même avec le bon mot de passe) -> 429 Too Many Requests
        org.assertj.core.api.Assertions.assertThat(tenter("bonMotDePasse")).isEqualTo(429);
    }
}

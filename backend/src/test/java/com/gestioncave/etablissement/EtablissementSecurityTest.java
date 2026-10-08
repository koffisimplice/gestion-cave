package com.gestioncave.etablissement;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gestioncave.utilisateur.Role;
import com.gestioncave.utilisateur.Utilisateur;
import com.gestioncave.utilisateur.UtilisateurRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EtablissementSecurityTest {

    @Autowired MockMvc mockMvc;
    @Autowired UtilisateurRepository utilisateurRepository;
    @Autowired EtablissementRepository etablissementRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired ObjectMapper objectMapper;

    private Etablissement maquisA;

    @BeforeEach
    void setUp() {
        utilisateurRepository.deleteAll();
        etablissementRepository.deleteAll();

        maquisA = etablissementRepository.save(Etablissement.builder().nom("Maquis A").build());
        Etablissement maquisB = etablissementRepository.save(Etablissement.builder().nom("Maquis B").build());

        utilisateurRepository.save(Utilisateur.builder()
                .nom("Proprio").email("proprio@test.local")
                .motDePasseHash(passwordEncoder.encode("secret"))
                .role(Role.PROPRIETAIRE)
                .etablissements(Set.of(maquisA, maquisB))
                .build());

        utilisateurRepository.save(Utilisateur.builder()
                .nom("Gerant").email("gerant@test.local")
                .motDePasseHash(passwordEncoder.encode("secret"))
                .role(Role.GERANT)
                .etablissements(Set.of(maquisA))
                .build());
    }

    private String login(String email) throws Exception {
        String body = """
                {"email":"%s","motDePasse":"secret"}
                """.formatted(email);
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode node = objectMapper.readTree(response);
        return node.get("token").asText();
    }

    @Test
    void gerant_ne_peut_pas_creer_un_etablissement() throws Exception {
        String token = login("gerant@test.local");
        mockMvc.perform(post("/api/etablissements")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nom\":\"Nouveau\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void proprietaire_peut_creer_un_etablissement() throws Exception {
        String token = login("proprio@test.local");
        mockMvc.perform(post("/api/etablissements")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nom\":\"Nouveau Maquis\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nom").value("Nouveau Maquis"))
                .andExpect(jsonPath("$.actif").value(true));
    }

    @Test
    void gerant_ne_voit_que_ses_etablissements() throws Exception {
        String token = login("gerant@test.local");
        String response = mockMvc.perform(get("/api/etablissements")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode arr = objectMapper.readTree(response);
        assertThat(arr).hasSize(1);
        assertThat(arr.get(0).get("nom").asText()).isEqualTo("Maquis A");
    }

    @Test
    void gerant_ne_peut_pas_ouvrir_un_autre_maquis() throws Exception {
        String token = login("gerant@test.local");
        Etablissement autre = etablissementRepository.findByActifTrue().stream()
                .filter(e -> !e.getId().equals(maquisA.getId())).findFirst().orElseThrow();
        mockMvc.perform(get("/api/etablissements/" + autre.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }
}

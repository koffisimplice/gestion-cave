package com.gestioncave.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Protection anti-force-brute du login : compte les échecs par identifiant et
 * bloque temporairement au-delà d'un seuil. Suivi en mémoire (par instance) —
 * suffisant pour un déploiement mono-instance ; à porter en base/Redis si
 * l'application est répliquée.
 */
@Service
public class LoginAttemptService {

    private final int maxTentatives;
    private final long blocageMs;
    private final Map<String, Compteur> parIdentifiant = new ConcurrentHashMap<>();

    public LoginAttemptService(
            @Value("${app.security.login.max-tentatives:5}") int maxTentatives,
            @Value("${app.security.login.blocage-minutes:15}") long blocageMinutes) {
        this.maxTentatives = maxTentatives;
        this.blocageMs = blocageMinutes * 60_000L;
    }

    private static final class Compteur {
        int echecs;
        long blocageJusqua; // epoch ms, 0 = non bloqué
    }

    /** Minutes de blocage restantes (0 si non bloqué). */
    public long minutesRestantes(String identifiant) {
        Compteur c = parIdentifiant.get(normaliser(identifiant));
        long now = System.currentTimeMillis();
        if (c == null || c.blocageJusqua <= now) {
            return 0;
        }
        return Math.max(1, (c.blocageJusqua - now + 59_999) / 60_000);
    }

    public boolean estBloque(String identifiant) {
        return minutesRestantes(identifiant) > 0;
    }

    /** Enregistre un échec de connexion et déclenche le blocage au seuil atteint. */
    public void echec(String identifiant) {
        Compteur c = parIdentifiant.computeIfAbsent(normaliser(identifiant), k -> new Compteur());
        synchronized (c) {
            long now = System.currentTimeMillis();
            if (c.blocageJusqua > now) {
                return; // déjà bloqué : on n'empile pas
            }
            if (c.blocageJusqua != 0) { // blocage expiré : on repart de zéro
                c.echecs = 0;
                c.blocageJusqua = 0;
            }
            c.echecs++;
            if (c.echecs >= maxTentatives) {
                c.blocageJusqua = now + blocageMs;
            }
        }
    }

    /** Réinitialise le compteur après une connexion réussie. */
    public void succes(String identifiant) {
        parIdentifiant.remove(normaliser(identifiant));
    }

    private String normaliser(String identifiant) {
        return identifiant == null ? "" : identifiant.trim().toLowerCase();
    }
}

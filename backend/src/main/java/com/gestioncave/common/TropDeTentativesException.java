package com.gestioncave.common;

/**
 * Levée quand un identifiant a dépassé le nombre de tentatives de connexion
 * autorisées et se trouve temporairement bloqué (HTTP 429).
 */
public class TropDeTentativesException extends RuntimeException {
    public TropDeTentativesException(String message) {
        super(message);
    }
}

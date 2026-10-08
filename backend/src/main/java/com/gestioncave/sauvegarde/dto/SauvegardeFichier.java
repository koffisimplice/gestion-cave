package com.gestioncave.sauvegarde.dto;

import java.time.Instant;

/** Métadonnées d'un fichier de sauvegarde stocké sur le serveur. */
public record SauvegardeFichier(String nom, long tailleOctets, Instant creeLe) {
}

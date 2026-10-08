package com.gestioncave.utilisateur;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {

    Optional<Utilisateur> findByEmailIgnoreCase(String email);

    /** Résout un utilisateur par son email OU son numéro de téléphone (identifiant de connexion). */
    Optional<Utilisateur> findByEmailIgnoreCaseOrTelephone(String email, String telephone);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    boolean existsByTelephone(String telephone);

    boolean existsByTelephoneAndIdNot(String telephone, Long id);

    long countByRoleAndActifTrue(Role role);
}

package com.gestioncave.security;

import com.gestioncave.utilisateur.Role;
import com.gestioncave.utilisateur.Utilisateur;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/** Adapte l'entité Utilisateur au modèle de Spring Security. */
public class AppUserDetails implements UserDetails {

    private final Utilisateur utilisateur;

    public AppUserDetails(Utilisateur utilisateur) {
        this.utilisateur = utilisateur;
    }

    public Utilisateur getUtilisateur() {
        return utilisateur;
    }

    public Long getId() {
        return utilisateur.getId();
    }

    public boolean isProprietaire() {
        return utilisateur.getRole() == Role.PROPRIETAIRE;
    }

    /** Vrai si l'utilisateur peut accéder à l'établissement donné (propriétaire = tout). */
    public boolean peutAccederEtablissement(Long etablissementId) {
        return isProprietaire() || getEtablissementIds().contains(etablissementId);
    }

    public Set<Long> getEtablissementIds() {
        return utilisateur.getEtablissements().stream()
                .map(e -> e.getId())
                .collect(Collectors.toSet());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + utilisateur.getRole().name()));
    }

    @Override
    public String getPassword() {
        return utilisateur.getMotDePasseHash();
    }

    @Override
    public String getUsername() {
        return utilisateur.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return utilisateur.isActif();
    }
}

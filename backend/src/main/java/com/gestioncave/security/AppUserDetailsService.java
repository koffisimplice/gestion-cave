package com.gestioncave.security;

import com.gestioncave.utilisateur.UtilisateurRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UtilisateurRepository utilisateurRepository;

    public AppUserDetailsService(UtilisateurRepository utilisateurRepository) {
        this.utilisateurRepository = utilisateurRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String identifiant) throws UsernameNotFoundException {
        // L'identifiant peut être un email ou un numéro de téléphone.
        return utilisateurRepository.findByEmailIgnoreCaseOrTelephone(identifiant, identifiant)
                .map(AppUserDetails::new)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable : " + identifiant));
    }
}

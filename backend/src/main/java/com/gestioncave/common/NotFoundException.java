package com.gestioncave.common;

/** Ressource inexistante -> HTTP 404. */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}

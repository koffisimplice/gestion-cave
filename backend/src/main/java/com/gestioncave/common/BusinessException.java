package com.gestioncave.common;

/** Violation d'une règle métier -> HTTP 409/400. */
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}

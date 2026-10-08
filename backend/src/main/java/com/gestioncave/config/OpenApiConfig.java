package com.gestioncave.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI gestionCaveOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("API Gestion Cave / Maquis")
                        .description("API REST de gestion de stock, ventes, marges, bénéfices et charges.")
                        .version("v1")
                        .contact(new Contact().name("Gestion Cave")))
                .addSecurityItem(new SecurityRequirement().addList(SCHEME_NAME))
                .components(new Components().addSecuritySchemes(SCHEME_NAME,
                        new SecurityScheme()
                                .name(SCHEME_NAME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}

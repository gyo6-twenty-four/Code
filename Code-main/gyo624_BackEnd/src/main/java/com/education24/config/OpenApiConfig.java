package com.education24.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    OpenAPI education24OpenApi() {
        String scheme = "bearerAuth";
        return new OpenAPI()
                .info(new Info().title("Education24 API").version("v1"))
                .components(new Components().addSecuritySchemes(scheme,
                        new SecurityScheme().name(scheme).type(SecurityScheme.Type.HTTP)
                                .scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(scheme));
    }

    @Bean
    OpenApiCustomizer pageableSortCustomizer() {
        return openApi -> {
            if (openApi.getPaths() == null) {
                return;
            }
            openApi.getPaths().values().forEach(path ->
                    path.readOperations().forEach(operation -> {
                        if (operation.getParameters() == null) {
                            return;
                        }
                        operation.getParameters().stream()
                                .filter(parameter -> "sort".equals(parameter.getName()))
                                .forEach(parameter -> {
                                    parameter.setExample("id");
                                    Schema<?> schema = parameter.getSchema();
                                    if (schema != null) {
                                        schema.setExample("id");
                                        schema.setDefault(null);
                                        if (schema.getItems() != null) {
                                            schema.getItems().setExample("id");
                                        }
                                    }
                                });
                    }));
        };
    }
}

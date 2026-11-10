package com.education24.config;

import com.education24.service.NarrativeGenerator;
import com.education24.service.UnconfiguredNarrativeGenerator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class NarrativeGeneratorConfig {
    @Bean
    @ConditionalOnMissingBean(NarrativeGenerator.class)
    NarrativeGenerator narrativeGenerator() {
        return new UnconfiguredNarrativeGenerator();
    }
}

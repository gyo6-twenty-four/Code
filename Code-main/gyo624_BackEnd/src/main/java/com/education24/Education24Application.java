package com.education24;

import com.education24.config.BootstrapAdminProperties;
import com.education24.config.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({JwtProperties.class, BootstrapAdminProperties.class})
public class Education24Application {
    public static void main(String[] args) {
        SpringApplication.run(Education24Application.class, args);
    }
}

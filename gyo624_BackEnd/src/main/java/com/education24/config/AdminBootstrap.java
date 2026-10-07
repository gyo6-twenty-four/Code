package com.education24.config;

import com.education24.domain.User;
import com.education24.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
public class AdminBootstrap implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
    private final BootstrapAdminProperties properties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminBootstrap(BootstrapAdminProperties properties, UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.enabled()) {
            return;
        }
        if (!StringUtils.hasText(properties.email()) || !StringUtils.hasText(properties.password())
                || properties.password().length() < 12 || !StringUtils.hasText(properties.name())) {
            throw new IllegalStateException(
                    "관리자 부트스트랩에는 BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD(12자 이상)/BOOTSTRAP_ADMIN_NAME이 필요합니다.");
        }
        String email = User.normalizeEmail(properties.email());
        if (userRepository.existsByEmail(email)) {
            log.info("Bootstrap admin already exists: {}", email);
            return;
        }
        userRepository.save(new User(email, passwordEncoder.encode(properties.password()),
                properties.name(), User.Role.ADMIN));
        log.info("Bootstrap admin created: {}", email);
    }
}

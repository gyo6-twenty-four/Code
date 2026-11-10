package com.education24.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class SensitiveResponseHeaderFilterTest {
    @Test
    void preventsCachingApiResponses() throws Exception {
        SensitiveResponseHeaderFilter filter = new SensitiveResponseHeaderFilter();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(new MockHttpServletRequest("GET", "/api/v1/students"), response,
                new MockFilterChain());

        assertThat(response.getHeader("Cache-Control")).isEqualTo("no-store");
        assertThat(response.getHeader("Pragma")).isEqualTo("no-cache");
    }
}

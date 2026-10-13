package com.circle.oog;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
class CoreWebConfiguration implements WebMvcConfigurer {
    private final CoreAuthorizationInterceptor authorization;
    CoreWebConfiguration(CoreAuthorizationInterceptor authorization){this.authorization=authorization;}
    @Override public void addInterceptors(InterceptorRegistry registry) {registry.addInterceptor(authorization).addPathPatterns("/api/**");}
}

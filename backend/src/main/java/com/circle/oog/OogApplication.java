package com.circle.oog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(exclude=org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class)
public class OogApplication {
    public static void main(String[] args) { SpringApplication.run(OogApplication.class, args); }
}

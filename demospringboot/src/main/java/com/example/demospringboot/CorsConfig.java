package com.example.demospringboot;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

	private static final String[] DEMO_UI_ORIGINS = {
			"http://localhost:5500",
			"http://127.0.0.1:5500"
	};

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/api/**")
				.allowedOrigins(DEMO_UI_ORIGINS)
				.allowedMethods("GET", "OPTIONS")
				.allowedHeaders("*")
				.maxAge(3600);
	}
}

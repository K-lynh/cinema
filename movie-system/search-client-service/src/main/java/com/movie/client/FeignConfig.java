package com.movie.client;

import feign.Logger;
import feign.Request;
import feign.codec.ErrorDecoder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class FeignConfig {

    @Bean
    public Logger.Level feignLoggerLevel() {
        return Logger.Level.BASIC;
    }

    @Bean
    public Request.Options requestOptions() {
        return new Request.Options(
            3, TimeUnit.SECONDS,   // connectTimeout
            5, TimeUnit.SECONDS,   // readTimeout
            true                   // followRedirects
        );
    }

    @Bean
    public ErrorDecoder errorDecoder() {
        return (methodKey, response) -> {
            if (response.status() == 503) {
                return new RuntimeException("AI service không sẵn sàng (503)");
            }
            return new RuntimeException("Feign error [" + methodKey + "]: " + response.status());
        };
    }
}

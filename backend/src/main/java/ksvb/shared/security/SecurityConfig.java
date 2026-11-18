package ksvb.shared.security;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import ksvb.config.KsvbProperties;
import ksvb.shared.error.ProblemResponses;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Xac thuc bang JWT do Keycloak cap.
 * Quyen lay tu resource_access.{ksvb.security.role-client}.roles, giu nguyen ten lam authority
 * (vd "employee.view") - xem {@link Permissions}.
 * Khi ksvb.security.enabled=false: bo qua xac thuc va gan san tat ca quyen (chi dung khi dev).
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final KsvbProperties props;
    private final Environment env;
    private final DevUserResolver devUsers;

    public SecurityConfig(KsvbProperties props, Environment env, DevUserResolver devUsers) {
        this.props = props;
        this.env = env;
        this.devUsers = devUsers;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(c -> c.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        if (!props.security().enabled()) {
            if (env.acceptsProfiles(Profiles.of("prod"))) {
                throw new IllegalStateException(
                        "ksvb.security.enabled=false không được phép khi chạy profile prod (bỏ qua đăng nhập)");
            }
            http.authorizeHttpRequests(a -> a.anyRequest().permitAll())
                .addFilterAfter(new DevUserFilter(devUsers), AnonymousAuthenticationFilter.class);
            return http.build();
        }

        http.authorizeHttpRequests(a -> a
                // /error: de loi that (500...) khong bi denyAll bien thanh 403 rong
                .requestMatchers("/error", "/actuator/health", "/actuator/health/liveness", "/actuator/health/readiness", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                // chi so pool/thread, thread dump: chi danh cho nguoi van hanh
                .requestMatchers("/actuator/**").hasAuthority(Permissions.SYSTEM_MONITOR)
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll())
            .oauth2ResourceServer(o -> o
                .jwt(j -> j.jwtAuthenticationConverter(jwtConverter()))
                .authenticationEntryPoint(ProblemResponses::unauthorized)
                .accessDeniedHandler(ProblemResponses::forbidden))
            .exceptionHandling(e -> e
                .authenticationEntryPoint(ProblemResponses::unauthorized)
                .accessDeniedHandler(ProblemResponses::forbidden));
        return http.build();
    }

    private Converter<Jwt, AbstractAuthenticationToken> jwtConverter() {
        return jwt -> new JwtAuthenticationToken(jwt, extractAuthorities(jwt), jwt.getClaimAsString("preferred_username"));
    }

    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        List<String> roles = new ArrayList<>();
        Map<String, Object> resource = jwt.getClaimAsMap("resource_access");
        if (resource != null && resource.get(props.security().roleClient()) instanceof Map<?, ?> client
                && client.get("roles") instanceof Collection<?> r) {
            r.forEach(x -> roles.add(String.valueOf(x)));
        }
        return roles.stream().distinct()
                .map(r -> (GrantedAuthority) new SimpleGrantedAuthority(r))
                .toList();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(props.cors().allowedOrigins());
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("*"));
        c.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", c);
        return src;
    }
}

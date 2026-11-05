package vn.vbi.ksvb.config;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
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
import vn.vbi.ksvb.domain.Permissions;
import vn.vbi.ksvb.repo.UserRepository;
import vn.vbi.ksvb.security.DevUserFilter;

/**
 * Giống HRM: xác thực bằng JWT Keycloak, quyền lấy từ resource_access.{roleClient}.roles và giữ nguyên tên
 * làm authority (xem {@link Permissions}); kiểm bằng {@code @PreAuthorize}.
 * ksvb.security.enabled=false chỉ dành cho dev/test và bị chặn khi chạy profile prod.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, KsvbProperties props, UserRepository users, Environment env)
            throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        if (!props.security().enabled()) {
            if (env.acceptsProfiles(Profiles.of("prod"))) {
                throw new IllegalStateException(
                        "ksvb.security.enabled=false không được phép khi chạy profile prod (bỏ qua đăng nhập)");
            }
            http.authorizeHttpRequests(a -> a.anyRequest().permitAll())
                    .addFilterAfter(new DevUserFilter(users), AnonymousAuthenticationFilter.class);
            return http.build();
        }

        String roleClient = props.security().roleClient();
        http.authorizeHttpRequests(a -> a
                        // /error: để lỗi thật (500...) không bị denyAll biến thành 403 rỗng; Swagger mở như HRM
                        .requestMatchers("/error", "/actuator/health/**", "/v3/api-docs/**", "/swagger-ui/**",
                                "/swagger-ui.html").permitAll()
                        .requestMatchers("/actuator/**").hasAuthority(Permissions.SYSTEM_MONITOR)
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().denyAll())
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwtConverter(roleClient))));
        return http.build();
    }

    private static Converter<Jwt, AbstractAuthenticationToken> jwtConverter(String roleClient) {
        return jwt -> new JwtAuthenticationToken(jwt, extractAuthorities(jwt, roleClient),
                jwt.getClaimAsString("preferred_username"));
    }

    static Collection<GrantedAuthority> extractAuthorities(Jwt jwt, String roleClient) {
        List<String> roles = new ArrayList<>();
        Map<String, Object> resource = jwt.getClaimAsMap("resource_access");
        if (resource != null && resource.get(roleClient) instanceof Map<?, ?> client
                && client.get("roles") instanceof Collection<?> r) {
            r.forEach(x -> roles.add(String.valueOf(x)));
        }
        return roles.stream().distinct().map(r -> (GrantedAuthority) new SimpleGrantedAuthority(r)).toList();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(KsvbProperties props) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(props.cors().allowedOrigins());
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("*"));
        c.setExposedHeaders(List.of("Content-Disposition"));
        c.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", c);
        return source;
    }
}

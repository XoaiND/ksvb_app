package vn.vbi.ksvb.config;

import io.swagger.v3.oas.models.media.Schema;
import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.filter.AssignableTypeFilter;
import org.springframework.util.ClassUtils;

/**
 * Spec OpenAPI chính xác để FE sinh kiểu TypeScript (docs/kien-truc-chuan.md): mọi thành phần của record DTO là bắt buộc
 * ({@code required}), trừ thành phần gắn {@link Nullable} (JSON bỏ trường khi null, xem
 * {@code spring.jackson.default-property-inclusion}). {@code PageResponse<T>} luôn đủ 5 trường.
 */
@Configuration
public class OpenApiConfig {

    private static final String BASE_PACKAGE = "vn.vbi.ksvb";

    @Bean
    OpenApiCustomizer requiredRecordComponents() {
        Map<String, List<String>> required = scanRecords();
        return openApi -> {
            if (openApi.getComponents() == null || openApi.getComponents().getSchemas() == null) {
                return;
            }
            openApi.getComponents().getSchemas().forEach((name, schema) -> {
                List<String> req = name.startsWith("PageResponse") ? propertyNames(schema) : required.get(name);
                if (req != null && schema.getProperties() != null) {
                    schema.setRequired(req.stream().filter(schema.getProperties()::containsKey).toList());
                }
            });
        };
    }

    private static List<String> propertyNames(Schema<?> schema) {
        return schema.getProperties() == null ? List.of() : new ArrayList<>(schema.getProperties().keySet());
    }

    /** Tên record → các thành phần không {@code @Nullable}. */
    private static Map<String, List<String>> scanRecords() {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AssignableTypeFilter(Record.class));
        Map<String, List<String>> out = new HashMap<>();
        ClassLoader cl = OpenApiConfig.class.getClassLoader();
        for (var bd : scanner.findCandidateComponents(BASE_PACKAGE)) {
            Class<?> type = ClassUtils.resolveClassName(bd.getBeanClassName(), cl);
            if (!type.isRecord()) {
                continue;
            }
            List<String> names = new ArrayList<>();
            for (RecordComponent c : type.getRecordComponents()) {
                boolean nullable = c.isAnnotationPresent(Nullable.class)
                        || c.getAnnotatedType().isAnnotationPresent(Nullable.class);
                if (!nullable) {
                    names.add(c.getName());
                }
            }
            out.put(type.getSimpleName(), names);
        }
        return out;
    }
}

package vn.vbi.ksvb.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.jspecify.annotations.Nullable;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.filter.AssignableTypeFilter;
import org.springframework.util.ClassUtils;

/**
 * Spec OpenAPI chính xác để frontend sinh kiểu TypeScript (docs/kien-truc-chuan.md): JSON trả cả trường {@code null}
 * nên mọi thành phần của record DTO phản hồi đều có mặt ({@code required}); thành phần gắn {@link Nullable} có kiểu
 * {@code T | null}. Record dùng làm thân request (schema của {@code requestBody} trong spec, không theo tên) chỉ bắt buộc
 * các thành phần có {@code @NotNull/@NotBlank/@NotEmpty} hoặc kiểu nguyên thuỷ và không {@link Nullable}.
 * {@code PageResponse<T>} luôn đủ 5 trường.
 */
@Configuration
public class OpenApiConfig {

    /** Gói gốc của ứng dụng = gói chứa package {@code config} này. */
    private static final String BASE_PACKAGE = basePackage();

    private static String basePackage() {
        String p = OpenApiConfig.class.getPackageName();
        return p.substring(0, p.lastIndexOf('.'));
    }

    private record Spec(List<String> response, List<String> request, List<String> nullable) {}

    @Bean
    OpenApiCustomizer requiredRecordComponents() {
        Map<String, Spec> specs = scanRecords();
        return openApi -> {
            Set<String> requestSchemas = requestBodySchemas(openApi);
            if (openApi.getComponents() == null || openApi.getComponents().getSchemas() == null) {
                return;
            }
            openApi.getComponents().getSchemas().forEach((name, schema) -> {
                if (schema.getProperties() == null) {
                    return;
                }
                Spec spec = name.startsWith("PageResponse") ? null : specs.get(name);
                List<String> req = spec == null
                        ? propertyNames(schema)
                        : (requestSchemas.contains(name) ? spec.request() : spec.response());
                schema.setRequired(req.stream().filter(schema.getProperties()::containsKey).toList());
                if (spec != null) {
                    spec.nullable().forEach(n -> markNullable((Schema<?>) schema.getProperties().get(n)));
                }
            });
        };
    }

    /** Tên schema được dùng làm thân request (kể cả phần tử của mảng) ở bất kỳ operation nào. */
    private static Set<String> requestBodySchemas(OpenAPI openApi) {
        Set<String> out = new HashSet<>();
        if (openApi.getPaths() == null) {
            return out;
        }
        openApi.getPaths().values().forEach(item -> item.readOperations().forEach(op -> {
            if (op.getRequestBody() == null || op.getRequestBody().getContent() == null) {
                return;
            }
            op.getRequestBody().getContent().values().forEach(mt -> collectRefs(mt.getSchema(), out));
        }));
        return out;
    }

    private static void collectRefs(Schema<?> schema, Set<String> out) {
        if (schema == null) {
            return;
        }
        if (schema.get$ref() != null) {
            String ref = schema.get$ref();
            out.add(ref.substring(ref.lastIndexOf('/') + 1));
        }
        collectRefs(schema.getItems(), out);
    }

    private static void markNullable(Schema<?> property) {
        if (property != null && property.getTypes() != null && !property.getTypes().contains("null")) {
            property.addType("null");
        }
    }

    private static List<String> propertyNames(Schema<?> schema) {
        return new ArrayList<>(schema.getProperties().keySet());
    }

    /** Tên record → các thành phần bắt buộc / cho phép null. */
    private static Map<String, Spec> scanRecords() {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AssignableTypeFilter(Record.class));
        Map<String, Spec> out = new HashMap<>();
        ClassLoader cl = OpenApiConfig.class.getClassLoader();
        for (var bd : scanner.findCandidateComponents(BASE_PACKAGE)) {
            Class<?> type = ClassUtils.resolveClassName(bd.getBeanClassName(), cl);
            if (!type.isRecord()) {
                continue;
            }
            List<String> response = new ArrayList<>();
            List<String> request = new ArrayList<>();
            List<String> nullable = new ArrayList<>();
            for (RecordComponent c : type.getRecordComponents()) {
                boolean isNullable = c.isAnnotationPresent(Nullable.class)
                        || c.getAnnotatedType().isAnnotationPresent(Nullable.class);
                if (isNullable) {
                    nullable.add(c.getName());
                    continue;
                }
                response.add(c.getName());
                if (c.getType().isPrimitive() || mustHaveValue(c)) {
                    request.add(c.getName());
                }
            }
            out.put(type.getSimpleName(), new Spec(response, request, nullable));
        }
        return out;
    }

    private static boolean mustHaveValue(RecordComponent c) {
        return c.isAnnotationPresent(NotNull.class)
                || c.isAnnotationPresent(NotBlank.class)
                || c.isAnnotationPresent(NotEmpty.class);
    }
}

package vn.vbi.ksvb;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import org.springframework.web.bind.annotation.RestController;

/**
 * Luật cấu trúc theo tính năng (docs/kien-truc-chuan.md): {@code <feature>/{api,application,domain,infra}} + {@code shared/}.
 * Phụ thuộc một chiều {@code api → application → domain}, {@code infra → domain}; domain không phụ thuộc Spring.
 */
@AnalyzeClasses(packages = "vn.vbi.ksvb", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    @ArchTest
    static final ArchRule domainKhongPhuThuocTangKhacVaSpring = noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat()
            .resideInAnyPackage("..api..", "..application..", "..infra..", "org.springframework..")
            .because("domain chứa luật nghiệp vụ thuần, test được bằng unit test không cần Spring");

    @ArchTest
    static final ArchRule applicationKhongPhuThuocApi = noClasses().that().resideInAPackage("..application..")
            .should().dependOnClassesThat().resideInAPackage("..api..");

    @ArchTest
    static final ArchRule infraChiPhuThuocDomain = noClasses().that().resideInAPackage("..infra..")
            .should().dependOnClassesThat().resideInAnyPackage("..api..", "..application..");

    @ArchTest
    static final ArchRule apiKhongGoiThangInfra = noClasses().that().resideInAPackage("..api..")
            .should().dependOnClassesThat().resideInAPackage("..infra..")
            .because("controller mỏng, đi qua application");

    @ArchTest
    static final ArchRule controllerNamTrongApi = classes().that().areAnnotatedWith(RestController.class)
            .should().resideInAPackage("..api..");

    @ArchTest
    static final ArchRule sharedKhongPhuThuocApiCuaTinhNang = noClasses().that().resideInAPackage("..shared..")
            .should().dependOnClassesThat().resideInAnyPackage("..api..");
}

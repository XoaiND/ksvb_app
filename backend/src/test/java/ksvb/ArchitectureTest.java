package ksvb;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import jakarta.persistence.Entity;
import org.springframework.data.repository.Repository;
import org.springframework.web.bind.annotation.RestController;

/**
 * Chiều phụ thuộc theo ECOSYSTEM.md 12.1: {@code <feature>/{api,application,domain,infra}} + {@code shared/}.
 * api → application → domain, infra → domain; domain không phụ thuộc Spring; shared không phụ thuộc tính năng.
 * DTO request/response nằm ở application (ADR hệ sinh thái 0002, ../../docs/adr/).
 */
@AnalyzeClasses(packages = "ksvb", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    private static final String[] FEATURES = {
        "ksvb.orgunit..",
        "ksvb.position..",
        "ksvb.employee..",
        "ksvb.dashboard..",
        "ksvb.sync..",
        "ksvb.iam..",
        "ksvb.me.."
    };

    @ArchTest
    static final ArchRule domainIsPure = noClasses()
            .that()
            .resideInAPackage("..domain..")
            .should()
            .dependOnClassesThat()
            .resideInAnyPackage("..api..", "..application..", "..infra..", "org.springframework..")
            .because("domain chỉ chứa entity và luật nghiệp vụ, test được bằng unit test thuần");

    @ArchTest
    static final ArchRule applicationDoesNotUseApi = noClasses()
            .that()
            .resideInAPackage("..application..")
            .should()
            .dependOnClassesThat()
            .resideInAPackage("..api..");

    @ArchTest
    static final ArchRule infraDoesNotUseUpperLayers = noClasses()
            .that()
            .resideInAPackage("..infra..")
            .should()
            .dependOnClassesThat()
            .resideInAnyPackage("..api..", "..application..");

    @ArchTest
    static final ArchRule apiDoesNotUseInfra = noClasses()
            .that()
            .resideInAPackage("..api..")
            .should()
            .dependOnClassesThat()
            .resideInAPackage("..infra..")
            .because("controller mỏng: gọi service, không gọi thẳng repository");

    @ArchTest
    static final ArchRule apiDoesNotExposeEntities = noClasses()
            .that()
            .resideInAPackage("..api..")
            .should()
            .dependOnClassesThat()
            .areAnnotatedWith(Entity.class)
            .because("không trả entity ra ngoài: controller nhận/trả DTO (record)");

    @ArchTest
    static final ArchRule sharedDoesNotUseFeatures = noClasses()
            .that()
            .resideInAPackage("ksvb.shared..")
            .should()
            .dependOnClassesThat()
            .resideInAnyPackage(FEATURES);

    @ArchTest
    static final ArchRule controllersLiveInApi = classes()
            .that()
            .areAnnotatedWith(RestController.class)
            .should()
            .resideInAPackage("..api..");

    @ArchTest
    static final ArchRule repositoriesLiveInInfra = classes()
            .that()
            .areAssignableTo(Repository.class)
            .and()
            .areInterfaces()
            .should()
            .resideInAnyPackage("..infra..", "ksvb.shared.outbox..", "ksvb.shared.audit..");
}

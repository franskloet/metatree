package io.fairspace.saturn.config;

import io.fairspace.saturn.services.collections.CollectionsApp;
import io.fairspace.saturn.services.health.HealthApp;
import io.fairspace.saturn.services.metadata.ChangeableMetadataApp;
import io.fairspace.saturn.services.metadata.ReadableMetadataApp;
import io.fairspace.saturn.services.permissions.PermissionsApp;
import io.fairspace.saturn.services.projects.ProjectsApp;
import io.fairspace.saturn.services.users.UserApp;
import io.fairspace.saturn.webdav.WebDAVApp;

import javax.servlet.Filter;

public class ApiFilterFactory {
    public static Filter createApiFilter(String apiPathPrefix, Services svc, Config config) {
        return new SaturnSparkFilter(apiPathPrefix,
                new ChangeableMetadataApp("/projects/:project/metadata", svc.getMetadataService(), config.jena.metadataBaseIRI),
                new ChangeableMetadataApp("/projects/:project/vocabulary", svc.getUserVocabularyService(), config.jena.vocabularyBaseIRI),
                new ReadableMetadataApp("/projects/:project/meta-vocabulary", svc.getMetaVocabularyService()),
                new CollectionsApp("/projects/:project/collections", svc.getCollectionsService()),
                new PermissionsApp("/projects/:project/permissions", svc.getPermissionsService()),
                new UserApp("/projects/:project/users", svc.getUserService()),
                new WebDAVApp(svc),
                new HealthApp("/health"),
                new ProjectsApp("/projects"));
    }
}

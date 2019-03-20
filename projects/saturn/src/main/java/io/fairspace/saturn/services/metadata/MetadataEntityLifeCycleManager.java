package io.fairspace.saturn.services.metadata;

import io.fairspace.saturn.services.permissions.PermissionsService;
import lombok.AllArgsConstructor;
import org.apache.jena.graph.Node;
import org.apache.jena.rdf.model.Literal;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.rdf.model.ResourceFactory;
import org.apache.jena.rdfconnection.RDFConnection;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.GregorianCalendar;
import java.util.HashSet;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import static io.fairspace.saturn.rdf.SparqlUtils.storedQuery;
import static io.fairspace.saturn.rdf.dao.LifecycleAwarePersistentEntity.CREATED_BY_IRI;
import static io.fairspace.saturn.rdf.dao.LifecycleAwarePersistentEntity.DATE_CREATED_IRI;
import static org.apache.jena.graph.NodeFactory.createURI;
import static org.apache.jena.rdf.model.ResourceFactory.createTypedLiteral;

@AllArgsConstructor
public
class MetadataEntityLifeCycleManager {
    private final RDFConnection rdf;
    private final Node graph;
    private final Supplier<Node> userIriSupplier;
    private final PermissionsService permissionsService;

    private static final Property createdBy = ResourceFactory.createProperty(CREATED_BY_IRI);
    private static final Property dateCreated = ResourceFactory.createProperty(DATE_CREATED_IRI);


    /**
     * Stores statements regarding the lifecycle of the entities in this model
     *
     * The lifecycle statements consist of:
     *   - a triple for the creator of an entity (see {@value io.fairspace.saturn.rdf.dao.LifecycleAwarePersistentEntity#CREATED_BY_IRI})
     *   - a triple for the date this entity was created (see {@value io.fairspace.saturn.rdf.dao.LifecycleAwarePersistentEntity#DATE_CREATED_IRI})
     *
     * In addition, the current user will get manage permissions on this entity as well, through the {@link PermissionsService}
     *
     * Please note that this method will check the database for existence of the entities. For that reason, this method must be called
     * before actually inserting new triples.
     *
     * @param model
     */
    void updateLifecycleMetadata(Model model) {
        if(model == null || model.isEmpty()) {
            return;
        }

        // Determine whether the model to add contains new entities
        // for which new information should be stored
        Set<String> newEntities = determineNewEntities(model);

        // If there are new entities, updateLifecycleMetadata creation information for them
        // as well as permissions
        if (!newEntities.isEmpty()) {
            rdf.load(graph.getURI(), generateCreationInformation(newEntities));

            if(permissionsService != null) {
                newEntities.forEach(uri ->
                        permissionsService.createResource(createURI(uri))
                );
            }
        }
    }

    /**
     * Generates a model with creation information for the list of entities given
     * @param entities
     * @return
     */
    private Model generateCreationInformation(Set<String> entities) {
        Model model = ModelFactory.createDefaultModel();
        Resource user = model.createResource(userIriSupplier.get().getURI());
        Literal now = now();

        entities.forEach(uri -> {
            Resource resource = model.createResource(uri);
            model.add(resource, createdBy, user);
            model.add(resource, dateCreated, now);
        });

        return model;
    }

    /**
     * Returns a literal representing the current time
     * @return
     */
    private Literal now() {
        var zdt = ZonedDateTime.ofInstant(Instant.now(), ZoneId.systemDefault());
        var call = GregorianCalendar.from(zdt);
        return createTypedLiteral(call);
    }

    /**
     * Returns a list of all entities in the model that are not known in the graph yet
     * @return
     */
    private Set<String> determineNewEntities(Model model) {
        Set<String> allUris = getAllUris(model);

        // Filter the list of Uris that we already know
        // in the current graph
        return allUris.stream()
                .filter(uri -> !exists(uri))
                .collect(Collectors.toSet());
    }

    /**
     * Verifies whether a certain entity exists in the database
     *
     * An entity exists if there is any triples with the given URI as subject
     * @param uri
     * @return
     */
    private boolean exists(String uri) {
        return rdf.queryAsk(storedQuery("exists", graph, createURI(uri), null, null));
    }

    /**
     * Returns a set of all URIs that are used in the model
     * @param model
     * @return
     */
    private Set<String> getAllUris(Model model) {
        Set<String> modelUris = new HashSet<>();

        model.listStatements().forEachRemaining(statement -> {
            modelUris.add(statement.getSubject().getURI());
            if(statement.getObject().isURIResource()) {
                modelUris.add(statement.getResource().getURI());
            }
        });

        return modelUris;
    }
}

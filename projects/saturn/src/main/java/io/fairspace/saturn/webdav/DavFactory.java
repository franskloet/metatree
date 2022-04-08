package io.fairspace.saturn.webdav;

import io.fairspace.saturn.rdf.ModelUtils;
import io.fairspace.saturn.services.users.UserService;
import io.fairspace.saturn.vocabulary.FS;
import io.milton.http.ResourceFactory;
import io.milton.http.exceptions.BadRequestException;
import io.milton.http.exceptions.NotAuthorizedException;
import io.milton.resource.Resource;
import org.apache.jena.sparql.util.Context;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;

import java.net.URI;
import java.util.Optional;

import static io.fairspace.saturn.auth.RequestContext.getUserURI;
import static io.fairspace.saturn.rdf.SparqlUtils.generateMetadataIri;
import static io.fairspace.saturn.util.EnumUtils.max;
import static io.fairspace.saturn.util.EnumUtils.min;
import static io.fairspace.saturn.webdav.AccessMode.DataPublished;
import static io.fairspace.saturn.webdav.AccessMode.MetadataPublished;
import static io.fairspace.saturn.webdav.DavUtils.*;
import static io.fairspace.saturn.webdav.PathUtils.encodePath;
import static io.fairspace.saturn.webdav.WebDAVServlet.*;
import static org.apache.jena.rdf.model.ResourceFactory.createResource;

public class DavFactory implements ResourceFactory {
    // Represents the root URI, not stored in the database
    final org.apache.jena.rdf.model.Resource rootSubject;
    final BlobStore store;
    final UserService userService;
    final Context context;
    private final String baseUri;
    public final RootResource root = new RootResource(this);

    public DavFactory(org.apache.jena.rdf.model.Resource rootSubject, BlobStore store, UserService userService, Context context) {
        this.rootSubject = rootSubject;
        this.store = store;
        this.userService = userService;
        this.context = context;
        var uri = URI.create(rootSubject.getURI());
        this.baseUri = URI.create(uri.getScheme() + "://" + uri.getHost() + (uri.getPort() > 0 ? ":" + uri.getPort() : "")).toString();
    }

    @Override
    public Resource getResource(String host, String path) throws NotAuthorizedException {
        return getResource(rootSubject.getModel().createResource(baseUri + "/" + encodePath(path)));
    }

    public Resource getResource(org.apache.jena.rdf.model.Resource subject) {
        if (subject.equals(rootSubject)) {
            return root;
        }

        if (!subject.getModel().containsResource(subject)
                || subject.hasProperty(FS.movedTo)) {
            return null;
        }

        return getResource(subject, getAccess(subject));
    }

    public Access getAccess(org.apache.jena.rdf.model.Resource subject) {
        var uri = subject.getURI();
        var nextSeparatorPos = uri.indexOf('/', rootSubject.getURI().length() + 1);
        var coll = rootSubject.getModel().createResource(nextSeparatorPos < 0 ? uri : uri.substring(0, nextSeparatorPos));

        var user = currentUserResource();
        var deleted = coll.hasProperty(FS.dateDeleted);

        var access = getGrantedPermission(coll, user);


        if (coll.hasLiteral(FS.accessMode, DataPublished.name()) && (userService.currentUser().isCanViewPublicData() || access.canRead())) {
            return Access.Read;
        }
        if (!access.canList() && userService.currentUser().isCanViewPublicMetadata()
                && (coll.hasLiteral(FS.accessMode, MetadataPublished.name()) || coll.hasLiteral(FS.accessMode, DataPublished.name()))) {
            access = Access.List;
        }

        if (deleted) {
            if (!showDeleted() && !isMetadataRequest()) {
                return Access.None;
            } else {
                access = min(access, Access.List);
            }
        } else if (coll.hasProperty(FS.status, Status.ReadOnly.name())) {
            access = min(access, Access.Read);
        } else if (coll.hasProperty(FS.status, Status.Archived.name())) {
            access = min(access, Access.List);
        }

        if(access == Access.None && userService.currentUser().isAdmin()) {
            return Access.Write;
        }

        return access;
    }

    protected static Access getGrantedPermission(org.apache.jena.rdf.model.Resource resource, org.apache.jena.rdf.model.Resource principal) {
        if (principal.hasProperty(FS.canManage, resource)) {
            return Access.Manage;
        }
        if (principal.hasProperty(FS.canWrite, resource)) {
            return Access.Write;
        }
        if (principal.hasProperty(FS.canRead, resource)) {
            return Access.Read;
        }
        if (principal.hasProperty(FS.canList, resource)) {
            return Access.List;
        }
        return Access.None;
    }

    Resource getResource(org.apache.jena.rdf.model.Resource subject, Access access) {
        if (subject.hasProperty(FS.dateDeleted) && !showDeleted()) {
            return null;
        }
        if (subject.hasProperty(FS.movedTo)) {
            return null;
        }
        return getResourceByType(subject, access);
    }

    Resource getResourceByType(org.apache.jena.rdf.model.Resource subject, Access access) {
        if (subject.hasProperty(RDF.type, FS.File)) {
            return new FileResource(this, subject, access);
        }
        if (subject.hasProperty(RDF.type, FS.Directory)) {
            return new DirectoryResource(this, subject, access);
        }

        return null;
    }

    public org.apache.jena.rdf.model.Resource createDavResource(String name, org.apache.jena.rdf.model.Resource parentSubject) {
        var subject = childSubject(parentSubject, name);
        subject.getModel()
                .removeAll(subject, null, null)
                .removeAll(null, null, subject);

        subject.addProperty(RDFS.label, name)
                .addProperty(RDFS.comment, "")
                .addProperty(FS.createdBy, currentUserResource())
                .addProperty(FS.dateCreated, timestampLiteral())
                .addProperty(FS.belongsTo, parentSubject);
        return subject;
    }

    org.apache.jena.rdf.model.Resource currentUserResource() {
        return rootSubject.getModel().createResource(getUserURI().getURI());
    }

    public boolean isFileSystemResource(org.apache.jena.rdf.model.Resource resource) {
        return resource.getURI().startsWith(rootSubject.getURI());
    }

    public void linkEntityToSubject(org.apache.jena.rdf.model.Resource subject) throws BadRequestException {
        var linkedEntity = getLinkedEntity(subject);
        subject.addProperty(FS.linkedEntity, linkedEntity);
        subject.addProperty(FS.linkedEntityType, linkedEntity.getPropertyResourceValue(RDF.type));
    }

    private org.apache.jena.rdf.model.Resource getLinkedEntity(org.apache.jena.rdf.model.Resource subject) throws BadRequestException {
        var linkedEntityIri = linkedEntityIri();
        if (linkedEntityIri != null && !linkedEntityIri.isBlank()) {
            return getExistingEntityToLink(subject, linkedEntityIri);
        } else {
            var type = entityType();
            if (type == null || type.isBlank()) {
                var message = "The linked entity type and the linked entity IRI are empty.";
                setErrorMessage(message);
                throw new BadRequestException(message);
            }
            var typeResource = createResource(type);
            validateLinkedEntityType(typeResource);
            var parentType = Optional.ofNullable(subject.getPropertyResourceValue(FS.belongsTo))
                    .map(r -> r.getPropertyResourceValue(FS.linkedEntity))
                    .map(ModelUtils::getType)
                    .orElse(null);
            validateIfTypeIsValidForParent(typeResource, parentType);
            return createNewLinkedEntity(typeResource, subject.getProperty(RDFS.label).getString());
        }
    }

    private org.apache.jena.rdf.model.Resource getExistingEntityToLink(org.apache.jena.rdf.model.Resource subject, String entityIri) throws BadRequestException {
        var existing = rootSubject.getModel().getResource(entityIri);
        if (existing == null) {
            var message = "No entity found for the given entity IRI.";
            setErrorMessage(message);
            throw new BadRequestException(message);
        }
        if (existing.hasProperty(FS.dateDeleted)) {
            var message = "Entity with the given IRI is marked as deleted.";
            setErrorMessage(message);
            throw new BadRequestException(message);
        }

        var parent = subject.getPropertyResourceValue(FS.belongsTo);
        var parentType = Optional.ofNullable(parent).map(p -> p.getPropertyResourceValue(FS.linkedEntityType)).orElse(null);
        validateIfTypeIsValidForParent(existing.getPropertyResourceValue(RDF.type), parentType);

        return existing;
    }

    private org.apache.jena.rdf.model.Resource createNewLinkedEntity(org.apache.jena.rdf.model.Resource type, String name) {
        return rootSubject.getModel()
                .createResource(generateMetadataIri().getURI())
                .addProperty(RDF.type, type)
                .addProperty(RDFS.label, name)
                .addProperty(FS.createdBy, currentUserResource())
                .addProperty(FS.dateCreated, timestampLiteral());
    }
}

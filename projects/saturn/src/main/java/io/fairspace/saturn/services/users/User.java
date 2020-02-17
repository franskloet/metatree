package io.fairspace.saturn.services.users;

import io.fairspace.saturn.rdf.dao.PersistentEntity;
import io.fairspace.saturn.rdf.dao.RDFProperty;
import io.fairspace.saturn.rdf.dao.RDFType;
import lombok.Getter;
import lombok.Setter;
import org.apache.jena.vocabulary.RDFS;

import java.util.EnumSet;
import java.util.Set;

import static io.fairspace.saturn.vocabulary.FS.*;

@RDFType(USER_URI)
@Getter @Setter
public class User extends PersistentEntity {
    @RDFProperty(value = ID_URI, required = true)
    private String id;

    @RDFProperty(value = RDFS.uri + "label", required = true)
    private String name;

    @RDFProperty(EMAIL_URI)
    private String email;

    private final Set<Role> roles = EnumSet.noneOf(Role.class);
}

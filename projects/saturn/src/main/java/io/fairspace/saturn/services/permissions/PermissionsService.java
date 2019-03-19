package io.fairspace.saturn.services.permissions;

import org.apache.jena.graph.Node;

import java.util.Map;


public interface PermissionsService {
    void createResource(Node resource);

    void setPermission(Node resource, Node user, Access access);

    Access getPermission(Node resource);

    Map<Node, Access> getPermissions(Node resource);

    boolean isWriteRestricted(Node resource);

    void setWriteRestricted(Node resource, boolean restricted);
}

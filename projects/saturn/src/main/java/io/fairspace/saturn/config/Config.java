package io.fairspace.saturn.config;


import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import io.fairspace.saturn.services.users.Role;
import org.apache.jena.atlas.json.JSON;
import org.apache.jena.query.text.es.ESSettings;
import org.apache.jena.tdb2.params.StoreParams;
import org.apache.jena.tdb2.params.StoreParamsCodec;

import java.io.File;
import java.io.IOException;
import java.util.*;

public class Config {
    static final ObjectMapper MAPPER = new ObjectMapper(new YAMLFactory())
            .registerModule(new SimpleModule()
                    .addSerializer(new StoreParamsSerializer())
                    .addDeserializer(StoreParams.class, new StoreParamsDeserializer()));

    public int port = 8080;

    public String publicUrl = "http://localhost:3000";

    public String privateUrl = "http://localhost:8080";

    public final Jena jena = new Jena();

    public final Auth auth = new Auth();

    public final WebDAV webDAV = new WebDAV();

    public final Properties mail = new Properties();

    public static class Jena {
        public String metadataBaseIRI = "http://localhost/iri/";
        public String vocabularyBaseIRI = "http://localhost/vocabulary/";

        public File datasetPath = new File("data/db");

        public final StoreParams storeParams = StoreParams.getDftStoreParams();

        public File transactionLogPath = new File("data/log");

        public long maxTriplesToReturn = 50000;

        public ElasticSearch elasticSearch = new ElasticSearch();

        public static class ElasticSearch {
            public boolean enabled = false;
            public boolean required = false;
            public ESSettings settings = new ESSettings.Builder()
                    .clusterName("fairspace")
                    .hostAndPort("127.0.0.1", 9300)
                    .build();
            public Map<String, String> advancedSettings = new HashMap<>();
        }
    }

    public static class Auth {
        public boolean enabled = false;

        public Set<Role> developerRoles = EnumSet.of(Role.CanRead, Role.CanWrite, Role.DataSteward, Role.SparqlUser, Role.Coordinator);

        public String fullAccessRole = "organisation-admin";

        public String userUrl = "http://localhost:5100/auth/admin/realms/fairspace/users/";
    }

    public static class WebDAV {
        public String blobStorePath = "data/blobs";
    }

    @Override
    public String toString() {
        try {
            return MAPPER.writeValueAsString(this);
        } catch (JsonProcessingException e) {
            return super.toString();
        }
    }

    public static class StoreParamsSerializer extends StdSerializer<StoreParams> {
        public StoreParamsSerializer() {
            super(StoreParams.class);
        }

        @Override
        public void serialize(StoreParams value, JsonGenerator gen, SerializerProvider provider) throws IOException {
            var node = MAPPER.readTree(StoreParamsCodec.encodeToJson(value).toString());
            gen.writeObject(node);
        }
    }

    public static class StoreParamsDeserializer extends StdDeserializer<StoreParams> {
        protected StoreParamsDeserializer() {
            super(StoreParams.class);
        }

        @Override
        public StoreParams deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
            return StoreParamsCodec.decode(JSON.parse(p.readValueAsTree().toString()));
        }
    }
}

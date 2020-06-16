package io.fairspace.saturn.webdav;

import io.milton.http.ResourceFactory;
import io.milton.resource.FolderResource;
import org.apache.jena.query.TxnType;
import org.apache.jena.sparql.core.Transactional;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import javax.servlet.ServletInputStream;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Vector;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@RunWith(MockitoJUnitRunner.class)
public class WebDAVServletTest {
    @Mock
    ResourceFactory factory;
    @Mock
    Transactional txn;
    @Mock
    BlobStore store;
    @Mock
    HttpServletRequest req;
    @Mock
    HttpServletResponse res;
    @Mock
    ServletInputStream in;
    @Mock
    ServletOutputStream out;
    @Mock
    FolderResource resource;

    WebDAVServlet servlet;


    @Before
    public void before() throws Exception {
        servlet = new WebDAVServlet(factory, txn, store);

        when(req.getRequestURL()).thenReturn(new StringBuffer("http://ex.com/api/v1/webdav/resource"));
        when(req.getInputStream()).thenReturn(in);
        when(req.getParameterNames()).thenReturn(new Vector<String>().elements());
        when(req.getHeaderNames()).thenReturn(new Vector<String>().elements());
        when(res.getOutputStream()).thenReturn(out);
        when(factory.getResource(any(), any())).thenReturn(resource);
        when(resource.authorise(any(), any(), any())).thenReturn(true);
        when(resource.createNew(any(), any(), any(), any())).thenReturn(resource);
        when(txn.isInTransaction()).thenReturn(false).thenReturn(true);
    }

    @Test
    public void testReadTxn() throws IOException {
        when(req.getMethod()).thenReturn("GET");

        servlet.service(req, res);

        verify(txn).begin(TxnType.READ);
        verify(txn).commit();
    }

    @Test
    public void testWriteTxn() throws IOException {
        when(req.getMethod()).thenReturn("DELETE");

        servlet.service(req, res);

        verify(txn).begin(TxnType.WRITE);
        verify(txn).commit();
    }

    @Test
    public void testPutConsumesPayloadOutsideTransaction() throws IOException {
        var blob = new BlobInfo("id", 1, "md5");

        when(req.getMethod()).thenReturn("PUT");
        when(store.store(in)).thenReturn(blob);

        servlet.service(req, res);

        var order = inOrder(store, req, txn);

        order.verify(store).store(in);
        order.verify(req).setAttribute("BLOB", blob);
        // Transaction is executed afterwards
        verify(txn).begin(TxnType.WRITE);
        verify(txn).commit();
    }

    @Test
    public void testGetPayloadIsReadOutsideTransaction() throws Exception {
        when(req.getMethod()).thenReturn("GET");

        servlet.service(req, res);

        var order = inOrder(txn, resource);

        order.verify(txn).begin(TxnType.READ);
        order.verify(txn).commit();
        // Called after the transaction is finished
        order.verify(resource).sendContent(eq(out), any(), any(), any());
    }
}
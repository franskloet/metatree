package nl.fairspace.pluto.auth;

import lombok.extern.slf4j.*;
import org.springframework.http.*;

import javax.servlet.http.*;
import java.io.*;

@Slf4j
public class AuthorizationFailedHandler {
    public static final String ACCEPT_HEADER = "Accept";
    public static final String WWW_AUTHENTICATE_HEADER = "WWW-Authenticate";
    public static final String BEARER_AUTH = "Bearer";
    public static final String BASIC_AUTH = "Basic realm=\"Metatree\"";
    public static final String X_REQUESTED_WITH_HEADER = "X-Requested-With";
    public static final String XHR_VALUE = "XMLHttpRequest";
    public static final String LOGIN_PATH = "/login";
    public static final String LOGIN_PATH_HEADER = "X-Login-Path";
    public static final String STATIC_PATH = "/static/";

    public void handleFailedAuthorization(HttpServletRequest request, HttpServletResponse response) throws IOException {
        log.info("Authentication failed for request {}", request.getRequestURI());

        if (shouldRedirect(request)) {
            request.getSession().setAttribute(AuthConstants.PREVIOUS_REQUEST_SESSION_ATTRIBUTE, request.getRequestURI());
            response.sendRedirect(LOGIN_PATH);
        } else {
            response.addHeader(LOGIN_PATH_HEADER, LOGIN_PATH);
            response.addHeader(WWW_AUTHENTICATE_HEADER, BEARER_AUTH);
            if (!XHR_VALUE.equals(request.getHeader(X_REQUESTED_WITH_HEADER)) && !isStaticResourceRequest(request)) {
                response.addHeader(WWW_AUTHENTICATE_HEADER, BASIC_AUTH);
            }
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        }
    }

    private boolean shouldRedirect(HttpServletRequest request) {
        String acceptHeader = request.getHeader(ACCEPT_HEADER);
        return HttpMethod.GET.matches(request.getMethod()) && acceptHeader != null &&
                acceptHeader.contains("text/html") &&
                !XHR_VALUE.equals(request.getHeader(X_REQUESTED_WITH_HEADER));
    }

    private boolean isStaticResourceRequest(HttpServletRequest request) {
        return request.getRequestURI().startsWith(STATIC_PATH);
    }
}

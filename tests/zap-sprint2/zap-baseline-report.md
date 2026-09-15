# ZAP Scanning Report

ZAP by [Checkmarx](https://checkmarx.com/).


## Summary of Alerts

| Risk Level | Number of Alerts |
| --- | --- |
| High | 0 |
| Medium | 3 |
| Low | 7 |
| Informational | 4 |




## Insights

| Level | Reason | Site | Description | Statistic |
| --- | --- | --- | --- | --- |
| Low | Warning |  | ZAP warnings logged - see the zap.log file for details | 3    |
| Info | Informational | https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io | Percentage of responses with status code 2xx | 100 % |
| Info | Informational | https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io | Percentage of endpoints with content type application/javascript | 20 % |
| Info | Informational | https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io | Percentage of endpoints with content type image/svg+xml | 20 % |
| Info | Informational | https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io | Percentage of endpoints with content type text/css | 20 % |
| Info | Informational | https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io | Percentage of endpoints with content type text/html | 40 % |
| Info | Informational | https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io | Percentage of endpoints with method GET | 100 % |
| Info | Informational | https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io | Count of total endpoints | 5    |
| Info | Informational | https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io | Percentage of slow responses | 85 % |







## Alerts

| Name | Risk Level | Number of Instances |
| --- | --- | --- |
| Content Security Policy (CSP) Header Not Set | Medium | 3 |
| Missing Anti-clickjacking Header | Medium | 3 |
| Sub Resource Integrity Attribute Missing | Medium | 3 |
| Cross-Origin-Embedder-Policy Header Missing or Invalid | Low | 3 |
| Cross-Origin-Opener-Policy Header Missing or Invalid | Low | 3 |
| Cross-Origin-Resource-Policy Header Missing or Invalid | Low | 4 |
| Permissions Policy Header Not Set | Low | 4 |
| Server Leaks Version Information via "Server" HTTP Response Header Field | Low | Systemic |
| Strict-Transport-Security Header Not Set | Low | Systemic |
| X-Content-Type-Options Header Missing | Low | Systemic |
| Information Disclosure - Suspicious Comments | Informational | 1 |
| Modern Web Application | Informational | 3 |
| Re-examine Cache-control Directives | Informational | 3 |
| Storable and Cacheable Content | Informational | Systemic |




## Alert Detail



### [ Content Security Policy (CSP) Header Not Set ](https://www.zaproxy.org/docs/alerts/10038/)



##### Medium (High)

### Description

Content Security Policy (CSP) is an added layer of security that helps to detect and mitigate certain types of attacks, including Cross Site Scripting (XSS) and data injection attacks. These attacks are used for everything from data theft to site defacement or distribution of malware. CSP provides a set of standard HTTP headers that allow website owners to declare approved sources of content that browsers should be allowed to load on that page — covered types are JavaScript, CSS, HTML frames, fonts, images and embeddable objects such as Java applets, ActiveX, audio and video files.

* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``


Instances: 3

### Solution

Ensure that your web server, application server, load balancer, etc. is configured to set the Content-Security-Policy header.

### Reference


* [ https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP ](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
* [ https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html ](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
* [ https://www.w3.org/TR/CSP/ ](https://www.w3.org/TR/CSP/)
* [ https://w3c.github.io/webappsec-csp/ ](https://w3c.github.io/webappsec-csp/)
* [ https://web.dev/articles/csp ](https://web.dev/articles/csp)
* [ https://caniuse.com/#feat=contentsecuritypolicy ](https://caniuse.com/#feat=contentsecuritypolicy)
* [ https://content-security-policy.com/ ](https://content-security-policy.com/)


#### CWE Id: [ 693 ](https://cwe.mitre.org/data/definitions/693.html)


#### WASC Id: 15

#### Source ID: 3

### [ Missing Anti-clickjacking Header ](https://www.zaproxy.org/docs/alerts/10020/)



##### Medium (Medium)

### Description

The response does not protect against 'ClickJacking' attacks. It should include either Content-Security-Policy with 'frame-ancestors' directive or X-Frame-Options.

* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io`
  * Method: `GET`
  * Parameter: `x-frame-options`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt`
  * Method: `GET`
  * Parameter: `x-frame-options`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml`
  * Method: `GET`
  * Parameter: `x-frame-options`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``


Instances: 3

### Solution

Modern Web browsers support the Content-Security-Policy and X-Frame-Options HTTP headers. Ensure one of them is set on all web pages returned by your site/app.
If you expect the page to be framed only by pages on your server (e.g. it's part of a FRAMESET) then you'll want to use SAMEORIGIN, otherwise if you never expect the page to be framed, you should use DENY. Alternatively consider implementing Content Security Policy's "frame-ancestors" directive.

### Reference


* [ https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options ](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options)


#### CWE Id: [ 1021 ](https://cwe.mitre.org/data/definitions/1021.html)


#### WASC Id: 15

#### Source ID: 3

### [ Sub Resource Integrity Attribute Missing ](https://www.zaproxy.org/docs/alerts/90003/)



##### Medium (High)

### Description

The integrity attribute is missing on a script or link tag served by an external server. The integrity tag prevents an attacker who have gained access to this server from injecting a malicious content.

* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `<link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />`
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `<link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />`
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `<link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />`
  * Other Info: ``


Instances: 3

### Solution

Provide a valid integrity attribute to the tag.

### Reference


* [ https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity ](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity)


#### CWE Id: [ 345 ](https://cwe.mitre.org/data/definitions/345.html)


#### WASC Id: 15

#### Source ID: 3

### [ Cross-Origin-Embedder-Policy Header Missing or Invalid ](https://www.zaproxy.org/docs/alerts/90004/)



##### Low (Medium)

### Description

Cross-Origin-Embedder-Policy header is a response header that prevents a document from loading any cross-origin resources that don't explicitly grant the document permission (using CORP or CORS).

* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io`
  * Method: `GET`
  * Parameter: `Cross-Origin-Embedder-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt`
  * Method: `GET`
  * Parameter: `Cross-Origin-Embedder-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml`
  * Method: `GET`
  * Parameter: `Cross-Origin-Embedder-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``


Instances: 3

### Solution

Ensure that the application/web server sets the Cross-Origin-Embedder-Policy header appropriately, and that it sets the Cross-Origin-Embedder-Policy header to 'require-corp' for documents.
If possible, ensure that the end user uses a standards-compliant and modern web browser that supports the Cross-Origin-Embedder-Policy header (https://caniuse.com/mdn-http_headers_cross-origin-embedder-policy).

### Reference


* [ https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy ](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy)


#### CWE Id: [ 693 ](https://cwe.mitre.org/data/definitions/693.html)


#### WASC Id: 14

#### Source ID: 3

### [ Cross-Origin-Opener-Policy Header Missing or Invalid ](https://www.zaproxy.org/docs/alerts/90004/)



##### Low (Medium)

### Description

Cross-Origin-Opener-Policy header is a response header that allows a site to control if others included documents share the same browsing context. Sharing the same browsing context with untrusted documents might lead to data leak.

* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io`
  * Method: `GET`
  * Parameter: `Cross-Origin-Opener-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt`
  * Method: `GET`
  * Parameter: `Cross-Origin-Opener-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml`
  * Method: `GET`
  * Parameter: `Cross-Origin-Opener-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``


Instances: 3

### Solution

Ensure that the application/web server sets the Cross-Origin-Opener-Policy header appropriately, and that it sets the Cross-Origin-Opener-Policy header to 'same-origin' for documents.
'same-origin-allow-popups' is considered as less secured and should be avoided.
If possible, ensure that the end user uses a standards-compliant and modern web browser that supports the Cross-Origin-Opener-Policy header (https://caniuse.com/mdn-http_headers_cross-origin-opener-policy).

### Reference


* [ https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy ](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy)


#### CWE Id: [ 693 ](https://cwe.mitre.org/data/definitions/693.html)


#### WASC Id: 14

#### Source ID: 3

### [ Cross-Origin-Resource-Policy Header Missing or Invalid ](https://www.zaproxy.org/docs/alerts/90004/)



##### Low (Medium)

### Description

Cross-Origin-Resource-Policy header is an opt-in header designed to counter side-channels attacks like Spectre. Resource should be specifically set as shareable amongst different origins.

* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io`
  * Method: `GET`
  * Parameter: `Cross-Origin-Resource-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/favicon.svg
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/favicon.svg`
  * Method: `GET`
  * Parameter: `Cross-Origin-Resource-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt`
  * Method: `GET`
  * Parameter: `Cross-Origin-Resource-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml`
  * Method: `GET`
  * Parameter: `Cross-Origin-Resource-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``


Instances: 4

### Solution

Ensure that the application/web server sets the Cross-Origin-Resource-Policy header appropriately, and that it sets the Cross-Origin-Resource-Policy header to 'same-origin' for all web pages.
'same-site' is considered as less secured and should be avoided.
If resources must be shared, set the header to 'cross-origin'.
If possible, ensure that the end user uses a standards-compliant and modern web browser that supports the Cross-Origin-Resource-Policy header (https://caniuse.com/mdn-http_headers_cross-origin-resource-policy).

### Reference


* [ https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy ](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy)


#### CWE Id: [ 693 ](https://cwe.mitre.org/data/definitions/693.html)


#### WASC Id: 14

#### Source ID: 3

### [ Permissions Policy Header Not Set ](https://www.zaproxy.org/docs/alerts/10063/)



##### Low (Medium)

### Description

Permissions Policy Header is an added layer of security that helps to restrict from unauthorized access or usage of browser/client features by web resources. This policy ensures the user privacy by limiting or specifying the features of the browsers can be used by the web resources. Permissions Policy provides a set of standard HTTP headers that allow website owners to limit which features of browsers can be used by the page such as camera, microphone, location, full screen etc.

* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/assets/index-CxQ5LRXS.js
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/assets/index-CxQ5LRXS.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``


Instances: 4

### Solution

Ensure that your web server, application server, load balancer, etc. is configured to set the Permissions-Policy header.

### Reference


* [ https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy ](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy)
* [ https://developer.chrome.com/blog/feature-policy/ ](https://developer.chrome.com/blog/feature-policy/)
* [ https://scotthelme.co.uk/a-new-security-header-feature-policy/ ](https://scotthelme.co.uk/a-new-security-header-feature-policy/)
* [ https://w3c.github.io/webappsec-feature-policy/ ](https://w3c.github.io/webappsec-feature-policy/)
* [ https://www.smashingmagazine.com/2018/12/feature-policy/ ](https://www.smashingmagazine.com/2018/12/feature-policy/)


#### CWE Id: [ 693 ](https://cwe.mitre.org/data/definitions/693.html)


#### WASC Id: 15

#### Source ID: 3

### [ Server Leaks Version Information via "Server" HTTP Response Header Field ](https://www.zaproxy.org/docs/alerts/10036/)



##### Low (High)

### Description

The web/application server is leaking version information via the "Server" HTTP response header. Access to such information may facilitate attackers identifying other vulnerabilities your web/application server is subject to.

* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.31.5`
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/assets/index-CbnvDB4F.css
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/assets/index-CbnvDB4F.css`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.31.5`
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/favicon.svg
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/favicon.svg`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.31.5`
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.31.5`
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.31.5`
  * Other Info: ``

Instances: Systemic


### Solution

Ensure that your web server, application server, load balancer, etc. is configured to suppress the "Server" header or provide generic details.

### Reference


* [ https://httpd.apache.org/docs/current/mod/core.html#servertokens ](https://httpd.apache.org/docs/current/mod/core.html#servertokens)
* [ https://learn.microsoft.com/en-us/previous-versions/msp-n-p/ff648552(v=pandp.10) ](https://learn.microsoft.com/en-us/previous-versions/msp-n-p/ff648552(v=pandp.10))
* [ https://www.troyhunt.com/shhh-dont-let-your-response-headers/ ](https://www.troyhunt.com/shhh-dont-let-your-response-headers/)


#### CWE Id: [ 497 ](https://cwe.mitre.org/data/definitions/497.html)


#### WASC Id: 13

#### Source ID: 3

### [ Strict-Transport-Security Header Not Set ](https://www.zaproxy.org/docs/alerts/10035/)



##### Low (High)

### Description

HTTP Strict Transport Security (HSTS) is a web security policy mechanism whereby a web server declares that complying user agents (such as a web browser) are to interact with it using only secure HTTPS connections (i.e. HTTP layered over TLS/SSL). HSTS is an IETF standards track protocol and is specified in RFC 6797.

* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/assets/index-CbnvDB4F.css
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/assets/index-CbnvDB4F.css`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/favicon.svg
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/favicon.svg`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: ``

Instances: Systemic


### Solution

Ensure that your web server, application server, load balancer, etc. is configured to enforce Strict-Transport-Security.

### Reference


* [ https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html ](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html)
* [ https://owasp.org/www-community/Security_Headers ](https://owasp.org/www-community/Security_Headers)
* [ https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security ](https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security)
* [ https://caniuse.com/stricttransportsecurity ](https://caniuse.com/stricttransportsecurity)
* [ https://datatracker.ietf.org/doc/html/rfc6797 ](https://datatracker.ietf.org/doc/html/rfc6797)


#### CWE Id: [ 319 ](https://cwe.mitre.org/data/definitions/319.html)


#### WASC Id: 15

#### Source ID: 3

### [ X-Content-Type-Options Header Missing ](https://www.zaproxy.org/docs/alerts/10021/)



##### Low (Medium)

### Description

The Anti-MIME-Sniffing header X-Content-Type-Options was not set to 'nosniff'. This allows older versions of Internet Explorer and Chrome to perform MIME-sniffing on the response body, potentially causing the response body to be interpreted and displayed as a content type other than the declared content type. Current (early 2014) and legacy versions of Firefox will use the declared content type (if one is set), rather than performing MIME-sniffing.

* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io`
  * Method: `GET`
  * Parameter: `x-content-type-options`
  * Attack: ``
  * Evidence: ``
  * Other Info: `This issue still applies to error type pages (401, 403, 500, etc.) as those pages are often still affected by injection issues, in which case there is still concern for browsers sniffing pages away from their actual content type.
At "High" threshold this scan rule will not alert on client or server error responses.`
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/assets/index-CbnvDB4F.css
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/assets/index-CbnvDB4F.css`
  * Method: `GET`
  * Parameter: `x-content-type-options`
  * Attack: ``
  * Evidence: ``
  * Other Info: `This issue still applies to error type pages (401, 403, 500, etc.) as those pages are often still affected by injection issues, in which case there is still concern for browsers sniffing pages away from their actual content type.
At "High" threshold this scan rule will not alert on client or server error responses.`
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/favicon.svg
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/favicon.svg`
  * Method: `GET`
  * Parameter: `x-content-type-options`
  * Attack: ``
  * Evidence: ``
  * Other Info: `This issue still applies to error type pages (401, 403, 500, etc.) as those pages are often still affected by injection issues, in which case there is still concern for browsers sniffing pages away from their actual content type.
At "High" threshold this scan rule will not alert on client or server error responses.`
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt`
  * Method: `GET`
  * Parameter: `x-content-type-options`
  * Attack: ``
  * Evidence: ``
  * Other Info: `This issue still applies to error type pages (401, 403, 500, etc.) as those pages are often still affected by injection issues, in which case there is still concern for browsers sniffing pages away from their actual content type.
At "High" threshold this scan rule will not alert on client or server error responses.`
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml`
  * Method: `GET`
  * Parameter: `x-content-type-options`
  * Attack: ``
  * Evidence: ``
  * Other Info: `This issue still applies to error type pages (401, 403, 500, etc.) as those pages are often still affected by injection issues, in which case there is still concern for browsers sniffing pages away from their actual content type.
At "High" threshold this scan rule will not alert on client or server error responses.`

Instances: Systemic


### Solution

Ensure that the application/web server sets the Content-Type header appropriately, and that it sets the X-Content-Type-Options header to 'nosniff' for all web pages.
If possible, ensure that the end user uses a standards-compliant and modern web browser that does not perform MIME-sniffing at all, or that can be directed by the web application/web server to not perform MIME-sniffing.

### Reference


* [ https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/compatibility/gg622941(v=vs.85) ](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/compatibility/gg622941(v=vs.85))
* [ https://owasp.org/www-community/Security_Headers ](https://owasp.org/www-community/Security_Headers)


#### CWE Id: [ 693 ](https://cwe.mitre.org/data/definitions/693.html)


#### WASC Id: 15

#### Source ID: 3

### [ Information Disclosure - Suspicious Comments ](https://www.zaproxy.org/docs/alerts/10027/)



##### Informational (Medium)

### Description

The response appears to contain suspicious comments which may help an attacker.

* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/assets/index-CxQ5LRXS.js
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/assets/index-CxQ5LRXS.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `in response to some user interaction or stat`
  * Other Info: `The following pattern was used: \bUSER\b and was detected in likely comment: "//,``).split(`/`);p=`/`+f.replace(/^\//,``).split(`/`).slice(e.length).join(`/`)}let m=n&&n.state.matches.length?n.state.matches", see evidence field for the suspicious comment/snippet.`


Instances: 1

### Solution

Remove all comments that return information that may help an attacker and fix any underlying problems they refer to.

### Reference



#### CWE Id: [ 615 ](https://cwe.mitre.org/data/definitions/615.html)


#### WASC Id: 13

#### Source ID: 3

### [ Modern Web Application ](https://www.zaproxy.org/docs/alerts/10109/)



##### Informational (Medium)

### Description

The application appears to be a modern web application. If you need to explore it automatically then the Client Spider may well be more effective than the standard one.

* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `<script type="module" crossorigin src="/assets/index-CxQ5LRXS.js"></script>`
  * Other Info: `No links have been found while there are scripts, which is an indication that this is a modern web application.`
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `<script type="module" crossorigin src="/assets/index-CxQ5LRXS.js"></script>`
  * Other Info: `No links have been found while there are scripts, which is an indication that this is a modern web application.`
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `<script type="module" crossorigin src="/assets/index-CxQ5LRXS.js"></script>`
  * Other Info: `No links have been found while there are scripts, which is an indication that this is a modern web application.`


Instances: 3

### Solution

This is an informational alert and so no changes are required.

### Reference




#### Source ID: 3

### [ Re-examine Cache-control Directives ](https://www.zaproxy.org/docs/alerts/10015/)



##### Informational (Low)

### Description

The cache-control header has not been set properly or is missing, allowing the browser and proxies to cache content. For static assets like css, js, or image files this might be intended, however, the resources should be reviewed to ensure that no sensitive content will be cached.

* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io`
  * Method: `GET`
  * Parameter: `cache-control`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/robots.txt`
  * Method: `GET`
  * Parameter: `cache-control`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/sitemap.xml`
  * Method: `GET`
  * Parameter: `cache-control`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``


Instances: 3

### Solution

For secure content, ensure the cache-control HTTP header is set with "no-cache, no-store, must-revalidate". If an asset should be cached consider setting the directives "public, max-age, immutable".

### Reference


* [ https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#web-content-caching ](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#web-content-caching)
* [ https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control ](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
* [ https://grayduck.mn/2021/09/13/cache-control-recommendations/ ](https://grayduck.mn/2021/09/13/cache-control-recommendations/)


#### CWE Id: [ 525 ](https://cwe.mitre.org/data/definitions/525.html)


#### WASC Id: 13

#### Source ID: 3

### [ Storable and Cacheable Content ](https://www.zaproxy.org/docs/alerts/10049/)



##### Informational (Medium)

### Description

The response contents are storable by caching components such as proxy servers, and may be retrieved directly from the cache, rather than from the origin server by the caching servers, in response to similar requests from other users. If the response data is sensitive, personal or user-specific, this may result in sensitive information being leaked. In some cases, this may even result in a user gaining complete control of the session of another user, depending on the configuration of the caching components in use in their environment. This is primarily an issue where "shared" caching servers such as "proxy" caches are configured on the local network. This configuration is typically found in corporate or educational environments, for instance.

* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: ``
  * Other Info: `In the absence of an explicitly specified caching lifetime directive in the response, a liberal lifetime heuristic of 1 year was assumed. This is permitted by rfc7234.`
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/assets/index-CbnvDB4F.css
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/assets/index-CbnvDB4F.css`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `max-age=31536000`
  * Other Info: ``
* URL: https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/favicon.svg
  * Node Name: `https://frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io/favicon.svg`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `max-age=31536000`
  * Other Info: ``

Instances: Systemic


### Solution

Validate that the response does not contain sensitive, personal or user-specific information. If it does, consider the use of the following HTTP response headers, to limit, or prevent the content being stored and retrieved from the cache by another user:
Cache-Control: no-cache, no-store, must-revalidate, private
Pragma: no-cache
Expires: 0
This configuration directs both HTTP 1.0 and HTTP 1.1 compliant caching servers to not store the response, and to not retrieve the response (without validation) from the cache, in response to a similar request.

### Reference


* [ https://datatracker.ietf.org/doc/html/rfc7234 ](https://datatracker.ietf.org/doc/html/rfc7234)
* [ https://datatracker.ietf.org/doc/html/rfc7231 ](https://datatracker.ietf.org/doc/html/rfc7231)
* [ https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html ](https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html)


#### CWE Id: [ 524 ](https://cwe.mitre.org/data/definitions/524.html)


#### WASC Id: 13

#### Source ID: 3



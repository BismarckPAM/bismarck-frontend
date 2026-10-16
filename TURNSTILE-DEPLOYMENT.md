# Restore human verification

The screenshot's disabled message means the frontend was built without
`VITE_TURNSTILE_SITEKEY`. Vite embeds this value during the build; setting it
on the running nginx container does not update the JavaScript bundle.

1. In this frontend repository, confirm the GitHub Actions secret is named
   `VITE_TURNSTILE_SITEKEY`. Both frontend image workflows use this exact name.
2. In Cloudflare, confirm the widget allows
   `frontend-ui.mangopond-f3cfcd27.southeastasia.azurecontainerapps.io`.
3. In Azure Container Apps, confirm `identity-svc` has `Turnstile__SecretKey`
   referencing the Azure secret containing that widget's matching secret key.
   Keep this private key out of frontend settings and Docker build arguments.
4. Deploy the backend and frontend changes through their workflows on
   `deploy/production`. The identity workflow sets `Turnstile__Enabled=true`;
   the frontend workflow rebuilds the bundle with the public site key.
5. Open the landing page in a fresh browser tab. Confirm the ticket dialog
   renders Turnstile, blocks submission before verification, and accepts a
   legitimately verified submission. A direct API request with an empty or
   invalid token must return `403 INVALID_CAPTCHA`.

If verification fails after deployment, check the identity service logs for
Cloudflare error codes and confirm the keys belong to the same widget.

For automation, use a separate test deployment and Cloudflare's official
test credentials. Production must keep real server-side verification enabled.
An explicit `Turnstile__Enabled=false` bypass is honored only in Development.
JMeter does not execute the browser widget, so load tests should target the
separate test deployment.

References:
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.cloudflare.com/turnstile/troubleshooting/testing/

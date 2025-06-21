# Identity Platforms | Endpoints

In this document, you may find technical information on NBG’s Identity Platforms.

# Endpoints

## Discovery Endpoint

The discovery endpoint can be used to retrieve metadata about your IdentityServer \- it returns information like the issuer name, key material, supported scopes etc. See the spec for more details.

The discovery endpoint is available via /.well-known/openid-configuration relative to the base address: GET /.well-known/openid-configuration

| Note: You can use the [IdentityModel](https://github.com/IdentityModel/IdentityModel2) client library to programmatically access the userinfo endpoint from .NET code. For more information check the IdentityModel [docs](https://identitymodel.readthedocs.io/en/latest/client/userinfo.html). |
| :---- |

## 

## 

## Authorize Endpoint

The authorize endpoint can be used to request tokens or authorization codes via the browser. This process typically involves authentication of the end-user and optionally consent.

| Note: ΙdentityServer supports a subset of the OpenID Connect and OAuth 2.0 authorize request parameters. For a full list, see [here](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest). |
| :---- |

| Parameters |  |
| :---- | :---- |
| client\_id | identifier of the client (required). |
| request | instead of providing all parameters as individual query string parameters, you can provide a subset or all of them as a JWT |
| request\_uri | URL of a pre-packaged JWT containing request parameters |
| scope  | one or more registered scopes (required) |
| redirect\_uri | must exactly match one of the allowed redirect URIs for that client (required) |
| response\_type |  id\_token requests an identity token (only identity scopes are allowed token requests an access token (only resource scopes are allowed) id\_token token requests an identity token and an access token code  requests an authorization code code id\_toke requests an authorization code and identity token code id\_token token requests an authorization code, identity token and access token  |
| response\_mode |  form\_post sends the token response as a form post instead of a fragment encoded redirect (optional)  |
| state | identityserver will echo back the state value on the token response, this is for round tripping state between client and provider, correlating request and response and CSRF/replay protection. (recommended) |
| nonce | identityserver will echo back the nonce value in the identity token, this is for replay protection) |

| Parameters (*Required for identity tokens via implicit grant.)* |  |
| :---- | :---- |
| prompt |  none  no UI will be shown during the request. If this is not possible (e.g. because the user has to sign in or consent) an error is returned login  the login UI will be shown, even if the user is already signed-in and has a valid session  |
| code\_challenge | sends the code challenge for PKCE |
| code\_challenge\_method |  plain  indicates that the challenge is using plain text (not recommended) indicates the challenge is hashed with SHA256  |
| login\_hint | can be used to pre-fill the username field on the login page |
| ui\_locales | gives a hint about the desired display language of the login UI |
| max\_age | if the user’s logon session exceeds the max age (in seconds), the login UI will be shown |
| acr\_values | allows passing in additional authentication related information \- identityserver special cases the following proprietary acr\_values: idp:name\_of\_idp bypasses the login/home realm screen and forwards the user directly to the selected identity provider (if allowed per client configuration) tenant:name\_of\_tenant  can be used to pass a tenant name to the login UI  |

**Example**  
GET /connect/authorize?   

|   client\_id=client1&  scope=openid email api1&  response\_type=id\_token token&  redirect\_uri=https:*//myapp/callback&*  state=abc&  nonce=xyz |
| :---- |

(URL encoding removed, and line breaks added for readability)

| Note: You can use the [IdentityModel](https://github.com/IdentityModel/IdentityModel2) client library to programmatically create authorize requests .NET code. For more information check the IdentityModel [docs](https://identitymodel.readthedocs.io/en/latest/client/authorize.html). |
| :---- |

## 

## Token Endpoint

The token endpoint can be used to programmatically request tokens. It supports the **password**, **authorization\_code**, **client\_credentials**, and **refresh\_token** grant types. It also supports custom grant types, such as **custom\_credentials**.

| Note: IdentityServer supports a subset of the OpenID Connect and OAuth 2.0 token request parameters. For a full list, see [here](http://openid.net/specs/openid-connect-core-1_0.html#TokenRequest). |
| :---- |

| Parameters |  |
| :---- | :---- |
| client\_id | client identifier (required – Either in the body or as part of the authorization header.) |
| client\_secret | client secret either in the post body, or as a basic authentication header. Optional. |
| grant\_type | authorization\_code, client\_credentials, password, refresh\_token, urn:ietf:params:oauth:grant-type:device\_code or custom |
| scope  | one or more registered scopes. If not specified, a token for all explicitly allowed scopes will be issued. |
| redirect\_uri | required for the authorization\_code grant type |
| code | the authorization code (required for authorization\_code grant type) |
| code\_verifier | PKCE proof key |
| username | resource owner username (required for password grant type) |
| password | resource owner password (required for password grant type) |
| acr\_values | allows passing in additional authentication related information for the password grant type \- identityserver special cases the following proprietary acr\_values: idp:name\_of\_idp bypasses the login/home realm screen and forwards the user directly to the selected identity provider (if allowed per client configuration) tenant:name\_of\_tenant  can be used to pass a tenant name to the token endpoint  |
| refresh\_token | the refresh token (required for refresh\_token grant type) |
| device\_code | the device code (required for urn:ietf:params:oauth:grant-type:device\_code grant type) |

**Example 1: Authorization Code flow**

POST /connect/token

CONTENT-TYPE application/x-www-form-urlencoded

|     client\_id=client1&    client\_secret=secret&    grant\_type=authorization\_code&    code=hdh922&    redirect\_uri=https:*//myapp.com/callback* |
| :---- |

\*(Form-encoding removed and line breaks added for readability)

**Example 2: Client Credentials flow**

POST /connect/token

CONTENT-TYPE application/x-www-form-urlencoded

|     client\_id=clientId&    client\_secret=secret&    grant\_type=client\_credentials&     scope=request\_scope |
| :---- |

\*(Form-encoding removed and line breaks added for readability)

| Note: You can use the [IdentityModel](https://github.com/IdentityModel/IdentityModel) client library to programmatically access the token endpoint from .NET code. For more information check the IdentityModel [docs](https://identitymodel.readthedocs.io/en/latest/client/token.html). |
| :---- |

## 

## Introspection Endpoint

The introspection endpoint is an implementation of [RFC 7662](https://tools.ietf.org/html/rfc7662).

It can be used to validate **reference tokens** (or JWTs if the consumer does not have support for appropriate JWT or cryptographic libraries). The introspection endpoint requires authentication \- since the client of an introspection endpoint is an API, you configure the secret on the ApiResource.

**Example**  
POST /connect/introspect  
Authorization: Basic xxxyyy  
token=\<token\>  
A successful response will return a status code of 200 and either an active or inactive token:

| {    "active": true,    "sub": "123"} |
| :---- |

Unknown or expired tokens will be marked as inactive:

| {    "active": false,} |
| :---- |

An invalid request will return a 400, an unauthorized request 401\.

| Note: You can use the [IdentityModel](https://github.com/IdentityModel/IdentityModel2) client library to programmatically access the introspection endpoint from .NET code. For more information check the IdentityModel [docs](https://identitymodel.readthedocs.io/en/latest/client/introspection.html). |
| :---- |

## 

## Revocation Endpoint

This endpoint allows revoking access tokens (reference tokens only) and refresh token. It implements the token revocation specification [(RFC 7009\)](https://tools.ietf.org/html/rfc7009).

| Parameters |  |
| :---- | :---- |
| token | the token to revoke (required) |
| token\_type\_hint | either access\_token or refresh\_token (optional) |

**Example**

POST /connect/revocation HTTP/1.1

Host: server.example.com

Content-Type: application/x-www-form-urlencoded

Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW

token=45ghiukldjahdnhzdauz\&token\_type\_hint=refresh\_token

| Note: You can use the [IdentityModel](https://github.com/IdentityModel/IdentityModel2) client library to programmatically access the userinfo endpoint from .NET code. For more information check the IdentityModel [docs](https://identitymodel.readthedocs.io/en/latest/client/userinfo.html). |
| :---- |

## 

## End Session Endpoint

The end session endpoint can be used to trigger single sign-out (see [spec](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)).

To use the end session endpoint a client application will redirect the user’s browser to the end session URL. All applications that the user has logged into via the browser during the user’s session can participate in the sign-out.

| Note: The URL for the end session endpoint is available via the [discovery endpoint](https://identityserver4.readthedocs.io/en/latest/endpoints/discovery.html#refdiscovery). |
| :---- |

| Parameters |  |
| :---- | :---- |
| id\_token\_hint | When the user is redirected to the endpoint, they will be prompted if they really want to sign-out. This prompt can be bypassed by a client sending the original id\_token received from authentication. This is passed as a query string parameter called id\_token\_hint. |
| post\_logout\_redirect\_uri | If a valid id\_token\_hint is passed, then the client may also send a post\_logout\_redirect\_uri parameter. This can be used to allow the user to redirect back to the client after sign-out. The value must match one of the client’s pre-configured PostLogoutRedirectUris ([client docs](https://identityserver4.readthedocs.io/en/latest/reference/client.html#refclient)). |
| state | If a valid post\_logout\_redirect\_uri is passed, then the client may also send a state parameter. This will be returned back to the client as a query string parameter after the user redirects back to the client. This is typically used by clients to round-trip state across the redirect. |

**Example**

GET /connect/endsession?id\_token\_hint=eyJhbGciOiJSUzI1NiIsImtpZCI6IjdlOGFkZmMzMjU1OTEyNzI0ZDY4NWZmYmIwOThjNDEyIiwidHlwIjoiSldUIn0.eyJuYmYiOjE0OTE3NjUzMjEsImV4cCI6MTQ5MTc2NTYyMSwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo1MDAwIiwiYXVkIjoianNfb2lkYyIsIm5vbmNlIjoiYTQwNGFjN2NjYWEwNGFmNzkzNmJjYTkyNTJkYTRhODUiLCJpYXQiOjE0OTE3NjUzMjEsInNpZCI6IjI2YTYzNWVmOTQ2ZjRiZGU3ZWUzMzQ2ZjFmMWY1NTZjIiwic3ViIjoiODg0MjExMTMiLCJhdXRoX3RpbWUiOjE0OTE3NjUzMTksImlkcCI6ImxvY2FsIiwiYW1yIjpbInB3ZCJdfQ.STzOWoeVYMtZdRAeRT95cMYEmClixWkmGwVH2Yyiks9BETotbSZiSfgE5kRh72kghN78N3-RgCTUmM2edB3bZx4H5ut3wWsBnZtQ2JLfhTwJAjaLE9Ykt68ovNJySbm8hjZhHzPWKh55jzshivQvTX0GdtlbcDoEA1oNONxHkpDIcr3pRoGi6YveEAFsGOeSQwzT76aId-rAALhFPkyKnVc-uB8IHtGNSyRWLFhwVqAdS3fRNO7iIs5hYRxeFSU7a5ZuUqZ6RRi-bcDhI-djKO5uAwiyhfpbpYcaY\_TxXWoCmq8N8uAw9zqFsQUwcXymfOAi2UF3eFZt02hBu-shKA\&post\_logout\_redirect\_uri=http%3A%2F%2Flocalhost%3A7017%2Findex.html

| Note: You can use the [IdentityModel](https://github.com/IdentityModel/IdentityModel2) client library to programmatically access the userinfo endpoint from .NET code. For more information check the IdentityModel [docs](https://identitymodel.readthedocs.io/en/latest/client/userinfo.html). |
| :---- |

## User Info Endpoint

The UserInfo endpoint can be used to retrieve identity information about a user (see [spec](http://openid.net/specs/openid-connect-core-1_0.html#UserInfo)).

The caller needs to send a valid access token representing the user. Depending on the granted scopes, the UserInfo endpoint will return the mapped claims (at least the openid scope is required).

| ⚠️Attention\! The access token MUST contain user information for this endpoint to return user claims. Otherwise, it returns 401 Unauthorized. In other words, don’t forget to add the openid scope when you request a token. |
| :---- |

**Example**

GET /connect/userinfo

Authorization: Bearer \<access\_token\>

HTTP/1.1 200 OK

Content-Type: application/json

| {    "sub": "248289761001",    "name": "Bob Smith",    "given\_name": "Bob",    "family\_name": "Smith",    "role": \[        "user",        "admin"    \]} |
| :---- |

| Note: You can use the [IdentityModel](https://github.com/IdentityModel/IdentityModel2) client library to programmatically access the userinfo endpoint from .NET code. For more information check the IdentityModel [docs](https://identitymodel.readthedocs.io/en/latest/client/userinfo.html). |
| :---- |

# Making Authenticated Requests

Regardless of which grant type you used or whether you used a client secret, you now have an OAuth 2.0 Bearer Token you can use with the API.

The access token is sent to the service in the HTTP Authorization header prefixed by the text Bearer.

When passing in the access token in an HTTP header, you should make a request like the following:

| POST /resource/1/update HTTP/1.1 Authorization: Bearer RsT5OjbzRn430zqMLgV3Ia" Host: api.authorization-server.com  description=Hello+World |
| :---- |

The access token is not intended to be parsed or understood by your application. The only thing your application should do with it is use it to make API requests.
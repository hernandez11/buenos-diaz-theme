# DNS migration: Cloudflare to GoDaddy

Captured from live public DNS on 2026-08-31, before any changes.

Registrar: GoDaddy (registered 2026-03-15, expires 2029-03-15)
Current nameservers: `deb.ns.cloudflare.com`, `tim.ns.cloudflare.com`
Cloudflare account holding the zone: unknown, not recoverable

## Current live records

| Type | Name | Value | Keep? |
|---|---|---|---|
| A | `@` | `172.66.47.78` | replace |
| A | `@` | `172.66.44.178` | replace |
| AAAA | `@` | `2606:4700:3032::6815:3750` | delete |
| AAAA | `@` | `2606:4700:3037::ac43:aac2` | delete |
| CNAME | `www` | `buenosdiaznyc.com` | replace |
| MX | `@` | `0 buenosdiaznyc-com.mail.protection.outlook.com` | **KEEP** |
| TXT | `@` | `v=spf1 include:secureserver.net -all` | **KEEP** |
| TXT | `@` | `NETORGFT20501016.onmicrosoft.com` | **KEEP** |
| CNAME | `autodiscover` | `autodiscover.outlook.com` | **KEEP** |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` | **KEEP** |

No DKIM selector records are published (`selector1._domainkey` does not resolve).

## Target state at GoDaddy

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `23.227.38.65` | 600 |
| CNAME | `www` | `shops.myshopify.com` | 600 |
| MX | `@` | `buenosdiaznyc-com.mail.protection.outlook.com` priority 0 | 3600 |
| TXT | `@` | `v=spf1 include:secureserver.net -all` | 3600 |
| TXT | `@` | `NETORGFT20501016.onmicrosoft.com` | 3600 |
| CNAME | `autodiscover` | `autodiscover.outlook.com` | 3600 |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` | 3600 |

No AAAA records. Shopify does not publish IPv6 for custom domains.

## Notes

The Microsoft 365 tenant is `NETORGFT20501016.onmicrosoft.com` and SPF points at
`secureserver.net`, which is GoDaddy's mail infrastructure. That means the email was
sold and provisioned by GoDaddy, not bought directly from Microsoft. Moving
nameservers back to GoDaddy should let GoDaddy restore these records itself, but
verify each one against this table rather than assuming.

## Order of operations

1. Log in to GoDaddy
2. Change nameservers from Cloudflare to GoDaddy default
3. Immediately add every record in the target table
4. Verify email still sends and receives
5. Verify the Shopify site answers on the domain
6. Only then remove the domain from the Cloudflare Pages project

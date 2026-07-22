# Janya PCR-3.0 & Meeting - Deployment Guide

## Server Details

| Property | Value |
|----------|-------|
| Server IP | `43.156.76.5` |
| SSH User | `ubuntu` |

---

## Applications

| Application | Domain | Build Output Directory | Port |
|-------------|--------|----------------------|------|
| PCR 3.0 (Producer) | `producer.janya` | `/var/www/pcr-3.0` | `9004` |
| PCR 3.0 Test | `producer-beta.janya.video` | `/var/www/pcr-3.0-test` | `9702` |
| Janya Meeting | `meeting.janya` | `/var/www/janya-meeting` | `9011` |
| Janya Meeting Test | `webrtc-test.janya.video` | `/var/www/janya-meeting-test` | `9701` |

---

## Deployment Steps

### 1. Build the Application

```bash
npm run build
```

This generates the production build in the `dist/` folder.

### 2. Upload Build Files to Server

Copy the contents of the `dist/` folder to the appropriate directory on the server:

- **PCR 3.0**: Upload to `/var/www/pcr-3.0`
- **Janya Meeting**: Upload to `/var/www/janya-meeting`

---

## Nginx Configuration

### Config File Locations (sites-available & sites-enabled)

| Application | sites-available | sites-enabled |
|-------------|----------------|---------------|
| PCR 3.0 | `/etc/nginx/sites-available/pcr` | `/etc/nginx/sites-enabled/pcr` |
| PCR 3.0 Test | `/etc/nginx/sites-available/pcr-test` | `/etc/nginx/sites-enabled/pcr-test` |
| Janya Meeting | `/etc/nginx/sites-available/janya-meeting` | `/etc/nginx/sites-enabled/janya-meeting` |
| Janya Meeting Test | `/etc/nginx/sites-available/janya-meeting-test` | `/etc/nginx/sites-enabled/janya-meeting-test` |

> `sites-enabled` entries are symlinks to their `sites-available` counterparts. To enable a new config: `sudo ln -s /etc/nginx/sites-available/<name> /etc/nginx/sites-enabled/<name>`

---

### PCR 3.0 - Nginx Config (`/etc/nginx/sites-available/pcr`)

```nginx
server {
    listen 9004;

    root /var/www/pcr-3.0;
    index index.html;

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /assets {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### PCR 3.0 Test - Nginx Config (`/etc/nginx/sites-available/pcr-test`)

```nginx
server {
    listen 9702;

    root /var/www/pcr-3.0-test;
    index index.html;

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /assets {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Janya Meeting - Nginx Config (`/etc/nginx/sites-available/janya-meeting`)

```nginx
server {
    listen 9011;

    root /var/www/janya-meeting;
    index index.html;

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Janya Meeting Test - Nginx Config (`/etc/nginx/sites-available/janya-meeting-test`)

```nginx
server {
    listen 9701;

    root /var/www/janya-meeting-test;
    index index.html;

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Caching Strategy:**
- `index.html` - no cache (`no-cache, no-store, must-revalidate`) so users always get the latest app version.
- `/assets` - long-term cache (`max-age=31536000, immutable` = 1 year) since Vite fingerprints asset filenames on every build.

---

## Nginx Management Commands

> Run these on the server after SSHing in as `ubuntu`.

| Action | Command | When to Use |
|--------|---------|-------------|
| Test config | `sudo nginx -t` | After editing any nginx config file |
| Reload nginx | `sudo systemctl reload nginx` | Apply config changes without downtime |
| Restart nginx | `sudo systemctl restart nginx` | Full restart (use only if reload fails) |

**Recommended workflow after a config change:**

```bash
sudo nginx -t                    # Validate config - must pass before proceeding
sudo systemctl reload nginx      # Apply changes with zero downtime
```

> Only use `restart` if `reload` does not resolve the issue, as restart briefly interrupts active connections.

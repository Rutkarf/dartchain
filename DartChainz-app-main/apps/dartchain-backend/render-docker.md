# Déploiement backend sur Render (image Docker Hub)

## Image Docker (publique)

Page Hub : https://hub.docker.com/r/rutkarf/dartchain-backend

**URL exacte à coller dans Render :**

```text
docker.io/rutkarf/dartchain-backend:latest
```

Variante acceptée :

```text
rutkarf/dartchain-backend:latest
```

> Ne pas utiliser l’URL du site web (`https://hub.docker.com/...`) — uniquement l’URL registry ci-dessus.

## Build et push (local)

```bash
cd apps/dartchain-backend
docker build -t rutkarf/dartchain-backend:latest .
docker login
docker push rutkarf/dartchain-backend:latest
```

Version taguée (recommandé) :

```bash
docker tag rutkarf/dartchain-backend:latest rutkarf/dartchain-backend:0.1
docker push rutkarf/dartchain-backend:0.1
```

## Render — Web Service (Docker)

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Choisir **Deploy an existing image from a registry**
3. **Image URL** : `docker.io/rutkarf/dartchain-backend:latest`
4. **Credentials** : laisser **vide** (image publique — ne pas ajouter de Registry Secret sauf si le repo est passé en privé)
5. **Port** : `8080`
6. **Health check path** : `/api/health`

### Si Render affiche « No public image found »

1. Vérifier l’orthographe : `rutkarf` en minuscules, tiret `dartchain-backend`, tag `:latest`
2. Supprimer toute **Registry Credential** incorrecte dans le service Render
3. Tester dans un terminal : `docker pull rutkarf/dartchain-backend:latest` (doit fonctionner sans login)
4. Attendre 1–2 min après un `docker push` puis réessayer sur Render
5. Utiliser le format complet : `docker.io/rutkarf/dartchain-backend:latest`

### Variables d'environnement utiles

| Variable | Exemple |
|----------|---------|
| `PORT` | `8080` (souvent défini automatiquement par Render) |
| `JAVA_TOOL_OPTIONS` | `-Xmx512m` (selon le plan Render) |

## CORS

Le front Cloudflare (`*.pages.dev`) est déjà autorisé dans `CorsConfig.java`.

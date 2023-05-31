# ArgoCD API Server

Middleware server to communicate to argocd server

```sh
# Base64 encode ARGOCD_PASSWORD
$ echo -n <ARGOCD_PASSWORD> | base64

# Fill in ARGOCD_PASSWORD
$ vim k8s/secret.yaml

# Deploy on K8S Cluster
$ kubectl apply -f k8s/
```

```sh
# Get returns an application by name
$ curl <argocd-api-server url>/app/<appName>

# Get returns an applications by names
$ curl -X GET \
-H "Content-Type: application/json" \
-d '{"argocd-apps":[{"name":"<app1Name>"},{"name":"<app2Name>"}]}' \
<argocd-api-server url>/apps

# Sync an application to its target state
$ curl -X POST <argocd-api-server url>/app/<appName>/sync
```
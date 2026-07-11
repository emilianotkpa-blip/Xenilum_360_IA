# syntax=docker/dockerfile:1
# Dockerfile RAÍZ — para EasyPanel (contexto = raíz del repo). Compila app/ y sirve con nginx.
# (También existe app/Dockerfile para builds locales con contexto = app/.)

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app

# Deps con cache (solo desde la subcarpeta app/)
COPY app/package.json app/package-lock.json ./
RUN npm ci

# Resto del código del frontend
COPY app/ ./

# Variables build-time (EasyPanel las inyecta como Build Args). Quedan en el bundle público.
ARG VITE_API_BASE
ARG VITE_XEN_KEY
ARG VITE_USER_EMAIL
ARG VITE_VAPID_PUBLIC_KEY
ENV VITE_API_BASE=$VITE_API_BASE \
    VITE_XEN_KEY=$VITE_XEN_KEY \
    VITE_USER_EMAIL=$VITE_USER_EMAIL \
    VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY

RUN npm run build

# ---------- serve ----------
FROM nginx:alpine AS serve
RUN rm -f /etc/nginx/conf.d/default.conf
COPY app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

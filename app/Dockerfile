# syntax=docker/dockerfile:1
# Xenilum App — build estático (Vite) servido por nginx. Deploy en EasyPanel (tipo Dockerfile).

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app

# Instala deps con cache (solo se reinstala si cambian los lockfiles)
COPY package.json package-lock.json ./
RUN npm ci

# Copia el resto del código
COPY . .

# Variables build-time del frontend. EasyPanel las inyecta como "Build args".
# OJO: las VITE_* quedan horneadas en el bundle JS público. No pongas aquí llaves privadas.
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
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

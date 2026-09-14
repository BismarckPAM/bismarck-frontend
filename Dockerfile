# Stage 1: Build the React + Vite App
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Injects the Gateway URL into the Vite production build
ARG VITE_API_URL=https://ubiquitous-trout-9xv7wpgv7q92x99g-8080.app.github.dev
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_AUTHORIZATION_API_URL=https://ubiquitous-trout-9xv7wpgv7q92x99g-8080.app.github.dev
ENV VITE_AUTHORIZATION_API_URL=$VITE_AUTHORIZATION_API_URL

RUN npm run build

# Stage 2: Serve with lightweight Nginx (~20MB)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
# frontend/Dockerfile
FROM node:22-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.lock to the container
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build && ls -la /app/dist

# Use Nginx to serve the static files
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
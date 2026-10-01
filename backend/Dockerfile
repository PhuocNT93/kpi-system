FROM node:22-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci

FROM dependencies AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM dependencies AS migrate
COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
CMD ["sh", "-c", "npm run migrate:up && npm run seed"]

FROM node:22-alpine AS production-dependencies
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libstdc++
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["node", "--no-node-snapshot", "dist/server.js"]

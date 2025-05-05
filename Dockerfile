FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

# Install node type definitions
RUN npm install --save-dev @types/node

RUN npm run build

CMD ["node", "dist/index.js"]

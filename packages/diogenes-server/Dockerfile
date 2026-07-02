FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN npm install -g tsx

EXPOSE 3000

CMD ["tsx", "src/index.ts"]
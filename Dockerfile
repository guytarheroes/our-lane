FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321 DATA_DIR=/data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/package.json ./package.json
COPY --from=build /app/apps/web/dist ./dist
# ทางกู้สุดท้ายตอนลืมทั้งรหัสผ่านและรหัสกู้คืน — ต้องอยู่ใน image ถึงจะ docker exec เรียกได้
COPY --from=build /app/apps/web/reset-password.mjs ./
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]

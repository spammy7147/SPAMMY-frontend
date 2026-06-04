# Stage 1: Build static assets
FROM node:20-alpine AS build

WORKDIR /app

# 의존성 정의 파일 복사 및 설치
COPY package.json package-lock.json ./
RUN npm ci

# 소스 코드 복사 및 Vite 빌드 실행
COPY . .
RUN npm run build

# Stage 2: Nginx를 이용한 정적 파일 서빙
FROM nginx:alpine

# 기존 기본 nginx 웹 콘텐츠 제거
RUN rm -rf /usr/share/nginx/html/*

# Stage 1에서 빌드된 React/Vite 정적 리소스 복사
COPY --from=build /app/dist /usr/share/nginx/html

# 커스텀 nginx 설정 파일 적용
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

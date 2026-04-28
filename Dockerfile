# ---- Build frontend ----
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---- Build Go binary ----
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod ./
COPY . .
RUN go mod tidy
RUN go mod download
COPY --from=frontend /app/frontend/dist ./frontend/dist
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# ---- Final image ----
FROM alpine:3.19
WORKDIR /app
RUN apk add --no-cache tzdata ca-certificates
COPY --from=builder /app/server .
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY migrations/ ./migrations/
EXPOSE 8080
CMD ["./server"]

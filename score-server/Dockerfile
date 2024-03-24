# Используем официальный базовый образ Golang для сборки нашего приложения
FROM golang:1.18 as builder

# Установка рабочей директории в контейнере
WORKDIR /app

# Копирование файлов Go модуля и его зависимостей
COPY go.mod ./
COPY go.sum ./

# Загрузка зависимостей. Используем go mod download, чтобы воспользоваться кэшированием Docker
RUN go mod download

# Копирование исходного кода проекта в контейнер
COPY *.go ./

# Компиляция приложения.
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o server .

# Использование базового образа debian для создания контейнера
FROM debian:buster

# Установка необходимых системных библиотек
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Установка рабочей директории в контейнере
WORKDIR /app

# Копирование скомпилированного бинарного файла из предыдущего шага
COPY --from=builder /app/server /app/server

# Определение порта, который будет прослушивать сервер
EXPOSE 8080

# Запуск сервера
CMD ["/app/server"]
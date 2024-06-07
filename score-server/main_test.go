package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

// setup и teardown использованы для инициализации и очистки тестовой базы данных
func setup() {
	// Инициализация тестовой базы данных
	initDB()
}

func teardown() {
	// Закрытие соединения с базой данных
	if db != nil {
		dbErr := db.Close()
		if dbErr != nil {
			log.Printf("Failed to close the database: %v", dbErr)
		}
	}

	// Удаление файла базы данных
	dbErr := os.Remove("./gamedb.sqlite")
	if dbErr != nil {
		log.Printf("Failed to remove the database file: %v", dbErr)
	}
}

// createTestRecord вспомогательная функция для добавления тестовой записи в базу данных
func createTestRecord(t *testing.T, record Record) HashResponse {
	jsonRecord, err := json.Marshal(record)
	if err != nil {
		t.Fatal(err)
	}

	req, err := http.NewRequest("POST", "/record", bytes.NewBuffer(jsonRecord))
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(recordHandler)

	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Проверяем, что в ответе есть хеш
	var respHash HashResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &respHash); err != nil {
		t.Fatal("Expected HashResponse, got error:", err)
	}
	if len(respHash.Hash) != 64 {
		t.Errorf("handler returned unexpected hash length: got %v want %v", len(respHash.Hash), 64)
	}

	return respHash
}

// TestGenerateRandomHash проверяет функцию генерации хеша
func TestGenerateRandomHash(t *testing.T) {
	hash, err := generateRandomHash()
	if err != nil {
		t.Fatalf("generateRandomHash() returned an error: %v", err)
	}
	if len(hash) != 64 {
		t.Errorf("generateRandomHash() returned a string of incorrect length: got %v want %v", len(hash), 64)
	}
}

// TestRecordHandler проверяет обработчик создания/обновления записи
func TestRecordHandler(t *testing.T) {
	setup()
	defer teardown()

	// Сценарий: Успешное создание новой записи
	t.Run("create new record", func(t *testing.T) {
		record := Record{Name: "Test Player", Game: "Test Game", Score: 100}
		respHash := createTestRecord(t, record)

		// Проверяем, что хеш действительно был создан
		if len(respHash.Hash) == 0 {
			t.Errorf("Expected non-empty hash, got empty hash")
		}
	})

	// Сценарий: Обработка неверного метода запроса
	t.Run("method not allowed", func(t *testing.T) {
		req, err := http.NewRequest("GET", "/record", nil)
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		handler := http.HandlerFunc(recordHandler)

		handler.ServeHTTP(rr, req)

		if status := rr.Code; status != http.StatusMethodNotAllowed {
			t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusMethodNotAllowed)
		}
	})

	// Дополнительные сценарии могут включать тестирование обновления существующей записи,
	// обработку неверных входных данных, и так далее.
}

// TestGetGameRecordsHandler проверяет обработчик получения рекордов игры
func TestGetGameRecordsHandler(t *testing.T) {
	setup()
	defer teardown()

	// Добавляем запись, которую хотим получить
	record := Record{Name: "Test Player", Game: "Test Game", Score: 100}
	createTestRecord(t, record)

	// Выполняем запрос на получение рекордов
	req, err := http.NewRequest("GET", "/records?game=Test Game", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(getGameRecordsHandler)

	handler.ServeHTTP(rr, req)

	// Проверяем статус-код ответа
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Проверяем содержимое ответа
	var records []GameRecord
	if err := json.Unmarshal(rr.Body.Bytes(), &records); err != nil {
		t.Fatal("Expected GameRecord slice, got error:", err)
	}

	// Проверяем, что список рекордов содержит нашу тестовую запись
	if len(records) == 0 || records[0].Name != "Test Player" || records[0].Score != 100 {
		t.Errorf("handler returned unexpected records: got %+v", records)
	}
	// Сценарий: Обработка запроса с несуществующей игрой
	t.Run("no records for non-existing game", func(t *testing.T) {
		req, err := http.NewRequest("GET", "/records?game=NonExistingGame", nil)
		if err != nil {
			t.Fatal(err)
		}

		rr := httptest.NewRecorder()
		handler := http.HandlerFunc(getGameRecordsHandler)

		handler.ServeHTTP(rr, req)

		if status := rr.Code; status != http.StatusOK {
			t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}

		// Проверка содержимого ответа
		// Ожидается пустой список рекордов, так как игра не существует
		expected := `[]` // Ожидаемый JSON-ответ в виде строки
		var buf bytes.Buffer
		if err := json.Compact(&buf, rr.Body.Bytes()); err != nil {
			t.Fatal("Failed to compact JSON:", err)
		}
		if buf.String() != expected {
			t.Errorf("handler returned unexpected body: got %v want %v", buf.String(), expected)
		}
	})
}

// Тестовая функция для recordHandler с примером вставки записи
func TestRecordHandlerCreateRecord(t *testing.T) {
	setup()
	defer teardown()

	// Создаем тестовый запрос
	record := Record{Name: "Test Player", Game: "Test Game", Score: 100}
	jsonRecord, _ := json.Marshal(record)
	req, err := http.NewRequest("POST", "/record", bytes.NewBuffer(jsonRecord))
	if err != nil {
		t.Fatal(err)
	}

	// Используем httptest.ResponseRecorder для записи ответа
	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(recordHandler)

	handler.ServeHTTP(rr, req)

	// Проверяем статус код ответа
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	// Проверяем тело ответа
	var respHash HashResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &respHash); err != nil {
		t.Fatal("Expected HashResponse, got error:", err)
	}
	if len(respHash.Hash) != 64 {
		t.Errorf("handler returned unexpected hash length: got %v want %v", len(respHash.Hash), 64)
	}
}

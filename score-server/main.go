package main

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"

	_ "github.com/mattn/go-sqlite3"
)

type Record struct {
	Name  string `json:"name"`
	Game  string `json:"game"`
	Score int    `json:"score"`
	Hash  string `json:"hash,omitempty"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

type HashResponse struct {
	Hash string `json:"hash"`
}

var db *sql.DB

func initDB() {
	var err error
	db, err = sql.Open("sqlite3", "./gamedb.sqlite")
	if err != nil {
		log.Fatal(err)
	}

	createTableSQL := `CREATE TABLE IF NOT EXISTS records (
		"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		"name" TEXT NOT NULL,
		"game" TEXT NOT NULL,
		"score" INTEGER NOT NULL,
		"hash" TEXT
	);`

	_, err = db.Exec(createTableSQL)
	if err != nil {
		log.Fatal(err)
	}

	// Создаем составной уникальный индекс для name, game и hash
	createIndexSQL := `CREATE UNIQUE INDEX IF NOT EXISTS idx_name_game_hash ON records (name, game, hash);`
	_, err = db.Exec(createIndexSQL)
	if err != nil {
		log.Fatal(err)
	}
}

func generateRandomHash() (string, error) {
	randomBytes := make([]byte, 16) // Генерация 16 байтов (128 бит) случайных данных
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err // В случае ошибки возвращаем пустую строку и ошибку
	}

	// Хеширование случайных байтов с помощью SHA-256
	hasher := sha256.New()
	hasher.Write(randomBytes)
	hash := hasher.Sum(nil)

	// Возвращаем хеш в шестнадцатеричном формате
	return hex.EncodeToString(hash), nil
}

func checkNameAndHash(name, hash string) error {
	var existingHash string
	err := db.QueryRow("SELECT hash FROM records WHERE name = ?", name).Scan(&existingHash)

	if err != nil && err != sql.ErrNoRows {
		return errors.New("error checking name")
	}

	if existingHash != "" && hash != existingHash {
		return errors.New("name already registered with a different hash")
	}

	return nil
}

func updateOrCreateRecord(record Record) error {
	var id int
	err := db.QueryRow("SELECT id FROM records WHERE name = ? AND game = ?", record.Name, record.Game).Scan(&id)

	if err != nil && err != sql.ErrNoRows {
		return errors.New("error checking for existing record")
	}

	if id > 0 {
		_, err = db.Exec("UPDATE records SET score = ? WHERE id = ?", record.Score, id)
	} else {
		_, err = db.Exec("INSERT INTO records (name, game, score, hash) VALUES (?, ?, ?, ?)", record.Name, record.Game, record.Score, record.Hash)
	}

	return err
}

func recordHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var record Record
	err := json.NewDecoder(r.Body).Decode(&record)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if record.Hash == "" {
		err = checkNameAndHash(record.Name, record.Hash)
		if err != nil {
			json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
			return
		}

		var hash string
		hash, err = generateRandomHash() // Генерация случайного хеша
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		record.Hash = hash
		json.NewEncoder(w).Encode(HashResponse{Hash: record.Hash})
	} else {
		err = checkNameAndHash(record.Name, record.Hash)
		if err != nil {
			json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
			return
		}
	}

	err = updateOrCreateRecord(record)
	if err != nil {
		json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
}

type GameRecord struct {
	Name  string `json:"name"`
	Score int    `json:"score"`
}

// getGameRecordsHandler возвращает список рекордов для указанной игры.
func getGameRecordsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем имя игры из параметров запроса
	game := r.URL.Query().Get("game")
	if game == "" {
		http.Error(w, "Game parameter is required", http.StatusBadRequest)
		return
	}

	// Подготавливаем запрос к базе данных
	query := `SELECT name, score FROM records WHERE game = ? ORDER BY score DESC`
	rows, err := db.Query(query, game)
	if err != nil {
		http.Error(w, "Database query error", http.StatusInternalServerError)
		log.Println(err)
		return
	}
	defer rows.Close()

	// Собираем рекорды в список
	records := make([]GameRecord, 0)
	for rows.Next() {
		var rec GameRecord
		if err := rows.Scan(&rec.Name, &rec.Score); err != nil {
			http.Error(w, "Database scan error", http.StatusInternalServerError)
			log.Println(err)
			return
		}
		records = append(records, rec)
	}

	// Проверяем на ошибки при извлечении данных
	if err = rows.Err(); err != nil {
		http.Error(w, "Database rows error", http.StatusInternalServerError)
		log.Println(err)
		return
	}

	// Возвращаем список рекордов в формате JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(records)
}

func main() {
	initDB()
	defer db.Close()

	http.HandleFunc("/record", recordHandler)
	http.HandleFunc("/records", getGameRecordsHandler)

	fmt.Println("Server is running on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
